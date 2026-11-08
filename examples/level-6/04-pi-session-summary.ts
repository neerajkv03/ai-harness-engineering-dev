// Lesson 6.2: Pi already writes a trace of every session. Summarize one.
// Run: bun run examples/level-6/04-pi-session-summary.ts [path/to/session.jsonl]
//   With no argument it reads a small sample session. Your own sessions live in ~/.pi/agent/sessions/.
import fs from "node:fs";
import path from "node:path";
import { summarizePiSession } from "./lib/pi-session.ts";

const file = process.argv[2] ?? path.join(import.meta.dirname, "fixtures/sample-pi-session.jsonl");
const s = summarizePiSession(fs.readFileSync(file, "utf8"));

console.log(`session: ${file}`);
console.log(`models: ${s.models.join(", ")}`);
console.log(`messages: ${s.userMessages} from you, ${s.assistantMessages} from the model   compactions: ${s.compactions}`);
console.log(`stop reasons: ${JSON.stringify(s.stopReasons)}`);
console.log(`tool calls: ${JSON.stringify(s.toolCalls)}`);
console.log(`tool errors: ${s.toolErrors.length ? s.toolErrors.map((e) => `${e.tool} (${e.callId})`).join(", ") : "none"}`);

const u = s.usage;
console.log(`\ntokens: ${u.input} input, ${u.output} output, ${u.cacheRead} cache reads, ${u.cacheWrite} cache writes`);
const inputSide = u.input + u.cacheRead + u.cacheWrite;
console.log(`cache reads were ${((u.cacheRead / inputSide) * 100).toFixed(0)}% of all input tokens`);
console.log(`cost: $${s.costUsd.toFixed(4)}`);
