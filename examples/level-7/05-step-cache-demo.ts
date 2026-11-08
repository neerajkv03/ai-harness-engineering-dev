// Lesson 7.4: resumable runs. Kill a workflow in the middle, start it again, and watch it skip the finished steps.
// Run: bun run examples/level-7/05-step-cache-demo.ts      (no API key needed)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StepCache, triageTicket, type StepModel } from "./lib/workflow.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "level7-cache-"));
const calls: string[] = [];

/** A model that can be told to "crash" while it works on the review step. */
const model = (opts: { crashOnReview: boolean }): StepModel => async ({ prompt }) => {
  const step = prompt.startsWith("Extract") ? "extract" : "review";
  calls.push(step);
  if (step === "review" && opts.crashOnReview) throw new Error("process killed");
  return step === "extract"
    ? { product: "login", severity: "medium", summary: "Customer cannot log in on their phone.", customerEmail: null }
    : { subject: "About your login problem", body: "Sorry you cannot log in. Please try resetting your password with this link.", needsHuman: false };
};

console.log("RUN 1: the process dies during the review step");
try { await triageTicket("cannot log in", { model: model({ crashOnReview: true }), cache: new StepCache(dir) }); } catch (e) { console.log(`  crashed: ${(e as Error).message}`); }
console.log(`  model calls: ${calls.join(", ")}`);
console.log(`  on disk now: ${fs.readdirSync(dir).join(", ")}`);

calls.length = 0;
console.log("\nRUN 2: start again, same ticket");
const cache = new StepCache(dir);
await triageTicket("cannot log in", { model: model({ crashOnReview: false }), cache });
console.log(`  model calls: ${calls.join(", ")}   <- extract was NOT repeated`);
console.log(`  cache: ${cache.hits} hit, ${cache.misses} miss`);

calls.length = 0;
console.log("\nRUN 3: the review prompt changed, so we bump its version");
const cache3 = new StepCache(dir);
await triageTicket("cannot log in", { model: model({ crashOnReview: false }), cache: cache3, versions: { extract: "v1", review: "v2" } });
console.log(`  model calls: ${calls.join(", ")}   <- only the changed step reran`);
