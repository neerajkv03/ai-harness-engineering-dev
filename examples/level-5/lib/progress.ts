// State that lives OUTSIDE the model, so a long task survives context resets, crashes and restarts.
// Pattern from Anthropic's "Effective harnesses for long-running agents": a structured feature list with a
// `passes` flag, a progress log, and a re-entry prompt that tells a fresh session where things stand.
import fs from "node:fs";
import path from "node:path";

export type Feature = { id: string; description: string; test: string; passes: boolean };

const featuresPath = (dir: string) => path.join(dir, "feature_list.json"); // JSON, not Markdown: models edit it less carelessly
const progressPath = (dir: string) => path.join(dir, "PROGRESS.md");

export const loadFeatures = (dir: string): Feature[] => JSON.parse(fs.readFileSync(featuresPath(dir), "utf8")) as Feature[];
const saveFeatures = (dir: string, features: Feature[]) => fs.writeFileSync(featuresPath(dir), JSON.stringify(features, null, 2) + "\n");

export const nextFeature = (features: Feature[]): Feature | undefined => features.find((f) => !f.passes);

export function appendProgress(dir: string, line: string): void {
  fs.appendFileSync(progressPath(dir), `- ${new Date().toISOString()} ${line}\n`);
}

/** Only the harness flips `passes`, and only after the objective check passed. The agent never edits this file. */
export function markPassed(dir: string, id: string): void {
  saveFeatures(dir, loadFeatures(dir).map((f) => (f.id === id ? { ...f, passes: true } : f)));
}

/** The prompt that starts every session: it must be enough for an agent with NO memory of earlier sessions. */
export function reentryPrompt(dir: string, feature: Feature): string {
  const log = fs.existsSync(progressPath(dir)) ? fs.readFileSync(progressPath(dir), "utf8").trim().split("\n").slice(-15).join("\n") : "(no progress yet)";
  return [
    "You are continuing a project. You have no memory of earlier sessions; this message is all you know.",
    `Working folder contents are available through your tools. Recent progress log:\n${log}`,
    `Your task now, and ONLY this: implement feature "${feature.id}": ${feature.description}`,
    `It is done when \`${feature.test}\` passes. Read the test file first. Do not edit test files. Do not start another feature.`,
    "When you finish, reply with one or two sentences saying what you did.",
  ].join("\n\n");
}

/**
 * Work through the feature list one feature at a time. Safe to kill and restart at any point:
 * it reads the state from disk, so it resumes at the first feature that has not passed.
 */
export async function runFeatures(opts: {
  dir: string;
  implement: (feature: Feature, prompt: string) => Promise<string>;
  gate: (feature: Feature) => Promise<{ ok: boolean; output: string }>;
  maxAttemptsPerFeature?: number;
}): Promise<{ completed: string[]; stoppedOn?: string }> {
  const completed: string[] = [];
  for (let feature = nextFeature(loadFeatures(opts.dir)); feature; feature = nextFeature(loadFeatures(opts.dir))) {
    let passed = false;
    for (let attempt = 1; attempt <= (opts.maxAttemptsPerFeature ?? 2) && !passed; attempt++) {
      const summary = await opts.implement(feature, reentryPrompt(opts.dir, feature));
      const gate = await opts.gate(feature);
      if (gate.ok) {
        markPassed(opts.dir, feature.id);
        appendProgress(opts.dir, `DONE ${feature.id}: ${summary.replace(/\s+/g, " ").slice(0, 160)}`);
        completed.push(feature.id);
        passed = true;
      } else {
        appendProgress(opts.dir, `FAILED ${feature.id} (attempt ${attempt}): ${gate.output.replace(/\s+/g, " ").slice(-160)}`);
      }
    }
    if (!passed) return { completed, stoppedOn: feature.id }; // escalate to a human instead of looping forever
  }
  return { completed };
}
