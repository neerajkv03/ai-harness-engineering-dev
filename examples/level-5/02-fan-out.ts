// Lesson 5.2: fan-out / fan-in. Investigate three areas in parallel, then merge the reports with one final call.
// Run: bun run examples/level-5/02-fan-out.ts [project-root]     (run from this repo's root)
import path from "node:path";
import { anthropicCaller } from "./lib/agent.ts";
import { fanOutFanIn } from "./lib/patterns.ts";
import { fileTools } from "./lib/tools.ts";

const root = path.resolve(process.argv[2] ?? ".");

// Give every worker a FULL brief. Vague tasks make workers duplicate each other's work or leave gaps.
const brief = (folder: string, question: string) =>
  `Goal: ${question}\nScope: only files under ${folder}. Do not look elsewhere.\n` +
  `Output: at most 5 bullet points. Each names a file and says what it does in one line.`;

const { reports, final } = await fanOutFanIn({
  tasks: [
    brief("src/data/learning", "What content does this folder hold and how is it structured?"),
    brief("src/components/learning", "Which components render a lesson, and what does each do?"),
    brief("src/hooks", "What state do these hooks manage, and where is it stored?"),
  ],
  workerSystem: "You are a read-only code investigator. Use your tools to answer the task precisely. Never guess.",
  workerTools: fileTools(root),
  synthesizeSystem: "You merge reports from several investigators into one clear answer. Do not invent details that are not in the reports.",
  call: anthropicCaller(),
});

reports.forEach((r, i) => console.log(`--- worker ${i + 1} ---\n${r}\n`));
console.log("=== combined answer ===");
console.log(final);
