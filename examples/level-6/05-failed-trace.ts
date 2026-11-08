// Lesson 6.3: root-cause a failure from its trace. Same task, two versions of one tool.
// Run: bun run examples/level-6/05-failed-trace.ts      (no API key needed)
// The tools and the damage to the file are real. The "model" is a script that behaves like a typical model would
// when a tool hides something from it, so you can see the full cycle: symptom, trace, cause, fix.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyze } from "./lib/analyze.ts";
import { READ_CAP, gradeConfig, runStaged } from "./lib/staged-failure.ts";
import { jsonlSink, readTrace } from "./lib/trace.ts";

for (const mode of ["silent", "pointer"] as const) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `failed-trace-${mode}-`));
  const traceFile = path.join(dir, "trace.jsonl");

  const answer = await runStaged(mode, dir, jsonlSink(traceFile));
  const graded = gradeConfig(dir);
  const findings = analyze(readTrace(traceFile), { readCap: READ_CAP });

  console.log(`\n=== read_file that truncates ${mode === "silent" ? "SILENTLY" : "WITH A POINTER"} ===`);
  console.log(`agent said:   "${answer}"`);
  console.log(`file graded:  ${graded.pass ? "PASS" : "FAIL"} (${graded.detail})`);
  if (findings.length === 0) console.log("trace analysis: no findings");
  for (const f of findings) {
    console.log(`trace analysis: [${f.kind}] turn ${f.turn}`);
    console.log(`  evidence: ${f.evidence}`);
    console.log(`  look at:  ${f.fix}`);
  }
}
console.log("\nThe agent's answer was equally confident both times. Only the outcome check and the trace told the truth.");
