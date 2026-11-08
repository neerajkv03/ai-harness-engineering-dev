import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { z } from "zod";
import { Extracted, Reply, StepCache, StepError, route, stepKey, triageTicket, typedStep, type StepModel } from "./workflow.ts";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));

const extractedOk: Extracted = { product: "billing", severity: "high", summary: "Customer was charged twice for one order.", customerEmail: "ada@example.com" };
const replyOk: Reply = { subject: "About your double charge", body: "Sorry about the double charge. We are looking into it now.", needsHuman: true };

/** A fake model that answers by recognizing which step is asking, and counts calls per step. */
function fakeModel(overrides: { extract?: () => unknown; review?: () => unknown } = {}) {
  const calls = { extract: 0, review: 0 };
  const model: StepModel = async ({ prompt }) => {
    if (prompt.startsWith("Extract the fields")) { calls.extract++; return (overrides.extract ?? (() => extractedOk))(); }
    if (prompt.startsWith("Draft a short")) { calls.review++; return (overrides.review ?? (() => replyOk))(); }
    throw new Error(`unexpected prompt: ${prompt.slice(0, 40)}`);
  };
  return { model, calls };
}

// ── Typed handoffs ──
const Shape = z.object({ n: z.number().int(), tag: z.enum(["a", "b"]) });

test("a valid answer passes straight through", async () => {
  const model: StepModel = async () => ({ n: 3, tag: "a" });
  assert.deepEqual(await typedStep({ name: "s", schema: Shape, prompt: "p", model }), { n: 3, tag: "a" });
});

test("an invalid answer is sent back with the exact problem, and a fixed answer is accepted", async () => {
  const prompts: string[] = [];
  const model: StepModel = async ({ prompt, attempt }) => { prompts.push(prompt); return attempt === 1 ? { n: 3.5, tag: "c" } : { n: 3, tag: "b" }; };
  assert.deepEqual(await typedStep({ name: "s", schema: Shape, prompt: "p", model }), { n: 3, tag: "b" });
  assert.equal(prompts.length, 2);
  assert.match(prompts[1]!, /previous answer was rejected/);
  assert.match(prompts[1]!, /tag/);
});

test("a step that keeps producing garbage fails loudly instead of passing bad data downstream", async () => {
  let calls = 0;
  const model: StepModel = async () => { calls++; return { n: "x" }; };
  await assert.rejects(typedStep({ name: "extract", schema: Shape, prompt: "p", model, maxAttempts: 2 }), (e) => e instanceof StepError && /step "extract" did not produce valid output after 2 attempts/.test(e.message));
  assert.equal(calls, 2, "bounded retries");
});

// ── Cache keys ──
test("the cache key depends on the step, its version and its input, but not on key order", () => {
  assert.equal(stepKey("a", "v1", { x: 1, y: 2 }), stepKey("a", "v1", { y: 2, x: 1 }));
  assert.notEqual(stepKey("a", "v1", { x: 1 }), stepKey("a", "v1", { x: 2 }));
  assert.notEqual(stepKey("a", "v1", { x: 1 }), stepKey("a", "v2", { x: 1 }));
  assert.notEqual(stepKey("a", "v1", { x: 1 }), stepKey("b", "v1", { x: 1 }));
});

test("StepCache computes once, then serves from disk, and leaves no temp files", async () => {
  const dir = tmp();
  const cache = new StepCache(dir);
  let computed = 0;
  const compute = async () => { computed++; return { answer: 42 }; };
  assert.deepEqual(await cache.run("s", "v1", "in", compute), { answer: 42 });
  assert.deepEqual(await cache.run("s", "v1", "in", compute), { answer: 42 });
  assert.equal(computed, 1);
  assert.deepEqual({ hits: cache.hits, misses: cache.misses }, { hits: 1, misses: 1 });
  assert.ok(fs.readdirSync(dir).every((f) => f.endsWith(".json")));
  assert.deepEqual(await new StepCache(dir).run("s", "v1", "in", compute), { answer: 42 }, "a NEW cache object on the same folder sees it too: that is what resuming is");
  assert.equal(computed, 1);
});

// ── The workflow ──
test("the routing step is plain code and needs no model", () => {
  assert.deepEqual(route(extractedOk), { team: "payments", priority: 1, summary: extractedOk.summary });
  assert.equal(route({ ...extractedOk, product: "login", severity: "low" }).team, "identity");
  assert.equal(route({ ...extractedOk, severity: "medium" }).priority, 2);
});

test("a ticket flows through extract, route, review with typed objects at every handoff", async () => {
  const { model, calls } = fakeModel();
  const out = await triageTicket("I was charged twice! — ada@example.com", { model, cache: new StepCache(tmp()) });
  assert.equal(out.routed.team, "payments");
  assert.equal(out.reply.needsHuman, true);
  assert.deepEqual(calls, { extract: 1, review: 1 });
});

test("rerunning the same ticket makes zero model calls", async () => {
  const dir = tmp();
  const first = fakeModel();
  await triageTicket("same ticket", { model: first.model, cache: new StepCache(dir) });
  const second = fakeModel();
  const cache2 = new StepCache(dir);
  const out = await triageTicket("same ticket", { model: second.model, cache: cache2 });
  assert.deepEqual(second.calls, { extract: 0, review: 0 });
  assert.equal(cache2.hits, 2);
  assert.equal(out.reply.subject, replyOk.subject);
});

test("a run that crashes mid-way resumes: finished steps are not paid for twice", async () => {
  const dir = tmp();
  const crashing = fakeModel({ review: () => { throw new Error("process killed during the review step"); } });
  await assert.rejects(triageTicket("t", { model: crashing.model, cache: new StepCache(dir) }), /process killed/);
  assert.deepEqual(crashing.calls, { extract: 1, review: 1 });

  const resumed = fakeModel();
  await triageTicket("t", { model: resumed.model, cache: new StepCache(dir) });
  assert.deepEqual(resumed.calls, { extract: 0, review: 1 }, "extract came from disk; only the unfinished step ran");
});

test("a different model never reuses another model's cached answers (a real run after --fake recomputes)", async () => {
  const dir = tmp();
  const fake = fakeModel();
  await triageTicket("t", { model: Object.assign(fake.model, { id: "fake" }), cache: new StepCache(dir) });
  const real = fakeModel();
  await triageTicket("t", { model: Object.assign(real.model, { id: "claude-opus-5-5" }), cache: new StepCache(dir) });
  assert.deepEqual(real.calls, { extract: 1, review: 1 });
});

test("bumping a step's version invalidates exactly that step", async () => {
  const dir = tmp();
  await triageTicket("t", { model: fakeModel().model, cache: new StepCache(dir), versions: { extract: "v1", review: "v1" } });
  const after = fakeModel();
  await triageTicket("t", { model: after.model, cache: new StepCache(dir), versions: { extract: "v1", review: "v2" } }); // the review prompt changed
  assert.deepEqual(after.calls, { extract: 0, review: 1 });
});

test("two different tickets that route to the same summary share the review step's cached result", async () => {
  const dir = tmp();
  const a = fakeModel();
  await triageTicket("ticket wording A", { model: a.model, cache: new StepCache(dir) });
  const b = fakeModel(); // different text in, but the extracted object (and so the routed object) is identical
  await triageTicket("ticket wording B", { model: b.model, cache: new StepCache(dir) });
  assert.deepEqual(b.calls, { extract: 1, review: 0 });
});

test("bad model output at the extract boundary stops the workflow before it reaches routing", async () => {
  const bad = fakeModel({ extract: () => ({ ...extractedOk, severity: "catastrophic" }) });
  await assert.rejects(triageTicket("t", { model: bad.model, cache: new StepCache(tmp()) }), /step "extract" did not produce valid output/);
  assert.equal(bad.calls.review, 0);
});
