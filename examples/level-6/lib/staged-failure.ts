// A staged failure to practice trace analysis on. The TOOLS here are real and the damage to the file is real;
// the "model" is a script that behaves the way a typical model does when a tool hides something from it.
import fs from "node:fs";
import path from "node:path";
import { runAgent, type Tool } from "../../level-5/lib/agent.ts";
import { scripted, textReply, toolReply } from "../../level-5/lib/fake-model.ts";
import { createTracer, type Emit } from "./trace.ts";

export const READ_CAP = 6000;
const TAIL = ['export const TIMEOUT_MS = 30000;', 'export const MAX_CONNECTIONS = 50;', 'export const REGION = "eu-west-1";'];

/** A config file longer than the read cap: the setting we need to change sits in the part the cap cuts off. */
export function configSource(): string {
  const head = ['// Application configuration', 'export const APP_NAME = "widgets";', "export const RETRIES = 3;"];
  const filler = Array.from({ length: 95 }, (_, i) => `// option ${i}: see the deployment guide for the details of this setting`);
  return [...head, ...filler, ...TAIL].join("\n") + "\n";
}

const exportsOf = (text: string) => [...text.matchAll(/export const (\w+)/g)].map((m) => m[1]!);

/** Pass only if TIMEOUT_MS is 60000 AND nothing else in the file was lost. */
export function gradeConfig(dir: string): { pass: boolean; detail: string } {
  const now = fs.readFileSync(path.join(dir, "config.ts"), "utf8");
  const lost = exportsOf(configSource()).filter((name) => !exportsOf(now).includes(name));
  if (lost.length) return { pass: false, detail: `lost exports: ${lost.join(", ")}` };
  return /TIMEOUT_MS = 60000;/.test(now) ? { pass: true, detail: "ok" } : { pass: false, detail: "TIMEOUT_MS is not 60000" };
}

export function stagedTools(dir: string, mode: "silent" | "pointer"): Tool[] {
  const file = (name: string) => path.join(dir, name);
  return [
    {
      name: "read_file",
      description: "Read a file. Optional offset to continue reading.",
      input_schema: { type: "object", properties: { file: { type: "string" }, offset: { type: "number" } }, required: ["file"] },
      run: (input) => {
        const { file: f, offset = 0 } = input as { file: string; offset?: number };
        const text = fs.readFileSync(file(f), "utf8");
        const end = Math.min(text.length, offset + READ_CAP);
        const piece = text.slice(offset, end);
        if (end >= text.length) return piece;
        // "silent": cut the output and say nothing. "pointer": say what was cut and how to get the rest.
        return mode === "silent" ? piece : `${piece}\n[truncated: showing ${offset}-${end} of ${text.length} chars. Call read_file with offset ${end} to continue.]`;
      },
    },
    {
      name: "write_file",
      description: "Overwrite a whole file.",
      input_schema: { type: "object", properties: { file: { type: "string" }, content: { type: "string" } }, required: ["file", "content"] },
      run: (input) => {
        const { file: f, content } = input as { file: string; content: string };
        fs.writeFileSync(file(f), content);
        return `wrote ${f}`;
      },
    },
    {
      name: "replace_in_file",
      description: "Replace one exact piece of text in a file. Fails if the text is not found.",
      input_schema: { type: "object", properties: { file: { type: "string" }, old: { type: "string" }, new: { type: "string" } }, required: ["file", "old", "new"] },
      run: (input) => {
        const { file: f, old, new: replacement } = input as { file: string; old: string; new: string };
        const text = fs.readFileSync(file(f), "utf8");
        if (!text.includes(old)) throw new Error(`text not found in ${f}`);
        fs.writeFileSync(file(f), text.replace(old, replacement));
        return `replaced in ${f}`;
      },
    },
    {
      name: "run_checks",
      description: "Run the project checks.",
      input_schema: { type: "object", properties: {} },
      run: () => {
        const g = gradeConfig(dir);
        return g.pass ? "all checks passed" : `FAILED: ${g.detail}`;
      },
    },
  ];
}

/** Run the staged scenario and record a trace. Returns the final text the "model" gave. */
export async function runStaged(mode: "silent" | "pointer", dir: string, emit: Emit): Promise<string> {
  fs.writeFileSync(path.join(dir, "config.ts"), configSource());
  const tracer = createTracer(emit);

  const script =
    mode === "silent"
      ? [
          toolReply([{ name: "read_file", input: { file: "config.ts" } }]),
          // The model believes it saw the whole file, so it "adds" the setting and writes everything back.
          () => toolReply([{ name: "write_file", input: { file: "config.ts", content: configSource().slice(0, READ_CAP) + "export const TIMEOUT_MS = 60000;\n" } }]),
          textReply("Done. I set TIMEOUT_MS to 60000."),
        ]
      : [
          toolReply([{ name: "read_file", input: { file: "config.ts" } }]),
          // The pointer tells the model more exists, so it keeps reading, then makes a surgical edit.
          toolReply([{ name: "read_file", input: { file: "config.ts", offset: READ_CAP } }]),
          toolReply([{ name: "replace_in_file", input: { file: "config.ts", old: "TIMEOUT_MS = 30000", new: "TIMEOUT_MS = 60000" } }]),
          toolReply([{ name: "run_checks", input: {} }]),
          textReply("Done. TIMEOUT_MS is now 60000 and the checks pass."),
        ];

  const result = await runAgent({
    system: "You change configuration files.",
    task: "Set TIMEOUT_MS in config.ts to 60000.",
    tools: tracer.tools(stagedTools(dir, mode)),
    call: tracer.call(scripted(script)),
    maxTurns: 8,
  });
  emit({ type: "run_end", finished: result.finished, turns: result.turns });
  return result.text;
}
