// Lesson 7.4: a three-step workflow. Code decides the structure; the model fills in two of the steps; every handoff is typed.
// Run: bun run examples/level-7/04-typed-workflow.ts [--fake]
//   --fake uses canned answers instead of Claude, so you can see the flow without an API key.
import os from "node:os";
import path from "node:path";
import { StepCache, claudeStepModel, triageTicket, type StepModel } from "./lib/workflow.ts";

const TICKET = `Subject: charged twice!!
Hi, I bought the Pro plan yesterday and my card shows two charges of $5. Please fix this today.
Thanks, Ada (ada@example.com)`;

const fake: StepModel = Object.assign(
  async ({ prompt }: { prompt: string }) =>
    prompt.startsWith("Extract")
      ? { product: "billing", severity: "high", summary: "Customer was charged twice for the Pro plan.", customerEmail: "ada@example.com" }
      : { subject: "About your double charge", body: "Sorry about the double charge. We are looking into it now and will refund the extra one.", needsHuman: true },
  { id: "fake" }, // its own cache entries: a later real run must not be served these canned answers
);

const model = process.argv.includes("--fake") ? fake : claudeStepModel();
const cache = new StepCache(path.join(os.tmpdir(), "level7-workflow-cache"));

const { extracted, routed, reply } = await triageTicket(TICKET, { model, cache });

console.log("1. extracted (model, validated by a schema):\n", extracted);
console.log("\n2. routed (plain code, no model):\n", routed);
console.log("\n3. reply (model, validated by a schema):\n", reply);
console.log(`\ncache: ${cache.hits} step(s) served from disk, ${cache.misses} computed. Run it again: nothing is recomputed.`);
