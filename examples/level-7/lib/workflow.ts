// Deterministic workflows around a model: CODE decides the structure, the model fills in steps,
// every handoff is validated by a schema, and finished steps are cached so a crashed run resumes where it stopped.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// ── The model, behind one small interface ────────────────────────────

/** Ask for a value of a given shape. Everything else about the model is hidden, so a fake can stand in. */
export type StepModel = <S extends z.ZodTypeAny>(req: { schema: S; prompt: string; attempt: number }) => Promise<unknown>;

export function claudeStepModel(model = "claude-opus-5-5"): StepModel {
  const client = new Anthropic();
  return async ({ schema, prompt }) => {
    // Structured outputs: the API constrains the reply to the schema. We still validate below, at OUR boundary.
    const res = await client.messages.parse({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(schema as never) },
    });
    return res.parsed_output;
  };
}

// ── A typed step: the model's output must satisfy the schema, or the step fails loudly ──

export class StepError extends Error {}

export async function typedStep<S extends z.ZodTypeAny>(opts: { name: string; schema: S; prompt: string; model: StepModel; maxAttempts?: number }): Promise<z.infer<S>> {
  const max = opts.maxAttempts ?? 2;
  let prompt = opts.prompt;
  let lastProblem = "";
  for (let attempt = 1; attempt <= max; attempt++) {
    const raw = await opts.model({ schema: opts.schema, prompt, attempt });
    const parsed = opts.schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    // Feed the exact problem back, once. A boundary that retries forever hides a bad prompt.
    lastProblem = parsed.error.issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`).join("; ");
    prompt = `${opts.prompt}\n\nYour previous answer was rejected: ${lastProblem}. Fix it.`;
  }
  throw new StepError(`step "${opts.name}" did not produce valid output after ${max} attempts: ${lastProblem}`);
}

// ── Resumable runs: cache each step's result on disk, keyed by what the step depends on ──

const stable = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object"
    ? `{${Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${stable(x)}`).join(",")}}`
    : JSON.stringify(v) ?? "null";

/** The cache key: same step, same version, same input => same key. Change any of them and it misses. */
export const stepKey = (name: string, version: string, input: unknown): string => createHash("sha256").update(`${name}\n${version}\n${stable(input)}`).digest("hex").slice(0, 16);

export class StepCache {
  hits = 0;
  misses = 0;
  readonly dir: string;

  // An explicit field, not `constructor(readonly dir: string)`: plain `node file.ts` cannot run parameter properties.
  constructor(dir: string) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }

  async run<T>(name: string, version: string, input: unknown, compute: () => Promise<T>): Promise<T> {
    const file = path.join(this.dir, `${name}-${stepKey(name, version, input)}.json`);
    if (fs.existsSync(file)) {
      this.hits++;
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    }
    this.misses++;
    const value = await compute();
    fs.writeFileSync(file + ".tmp", JSON.stringify(value));
    fs.renameSync(file + ".tmp", file); // write then rename: a crash never leaves a half-written cache entry
    return value;
  }
}

// ── The workflow: triage a support ticket ─────────────────────────────

export const Extracted = z.object({
  product: z.enum(["billing", "login", "mobile-app", "other"]),
  severity: z.enum(["low", "medium", "high"]),
  summary: z.string().min(10).max(200),
  customerEmail: z.string().email().nullable(),
});
export const Routed = z.object({ team: z.enum(["payments", "identity", "mobile", "support"]), priority: z.number().int().min(1).max(3), summary: z.string() });
export const Reply = z.object({ subject: z.string().min(3), body: z.string().min(20), needsHuman: z.boolean() });
export type Extracted = z.infer<typeof Extracted>;
export type Routed = z.infer<typeof Routed>;
export type Reply = z.infer<typeof Reply>;

/** Step 2 is plain CODE. Rules we know exactly are written as rules, not asked of a model. */
export function route(e: Extracted): Routed {
  const team = { billing: "payments", login: "identity", "mobile-app": "mobile", other: "support" }[e.product] as Routed["team"];
  const priority = e.severity === "high" ? 1 : e.severity === "medium" ? 2 : 3;
  return { team, priority, summary: e.summary };
}

export const STEP_VERSIONS: { extract: string; review: string } = { extract: "v1", review: "v1" }; // bump a version when you change a step's prompt

export async function triageTicket(ticket: string, deps: { model: StepModel; cache: StepCache; versions?: typeof STEP_VERSIONS }) {
  const { model, cache } = deps;
  const v = deps.versions ?? STEP_VERSIONS;

  // Step 1 (model): free text in, a validated object out.
  const extracted = await cache.run("extract", v.extract, ticket, () =>
    typedStep({ name: "extract", schema: Extracted, model, prompt: `Extract the fields from this support ticket.\n\nTicket:\n${ticket}` }),
  );

  // Step 2 (code): deterministic, instant, free, testable. Not cached: it is cheaper than the cache lookup.
  const routed = route(extracted);

  // Step 3 (model): draft a reply. Its input is the typed object from step 2, never raw free text.
  const reply = await cache.run("review", v.review, routed, () =>
    typedStep({
      name: "review",
      schema: Reply,
      model,
      prompt: `Draft a short, polite first reply to the customer for a ticket routed to the ${routed.team} team (priority ${routed.priority}). Summary: ${routed.summary}. Set needsHuman to true if a person must look before sending.`,
    }),
  );

  return { extracted, routed, reply };
}
