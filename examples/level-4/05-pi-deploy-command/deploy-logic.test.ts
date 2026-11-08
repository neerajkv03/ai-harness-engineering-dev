// Run: node --test examples/level-4/05-pi-deploy-command/deploy-logic.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { completions, parseEnvironment } from "./deploy-logic.ts";

test("accepts dev and staging, ignoring case and spaces", () => {
  assert.deepEqual(parseEnvironment(" Staging "), { ok: true, env: "staging" });
  assert.deepEqual(parseEnvironment("dev"), { ok: true, env: "dev" });
});

test("rejects prod, typos and empty input with a usage message", () => {
  for (const input of ["prod", "production", "stagin", "", "dev; rm -rf /"]) {
    const r = parseEnvironment(input);
    assert.equal(r.ok, false, input);
    if (!r.ok) assert.match(r.message, /Usage: \/deploy-preview <dev\|staging>/);
  }
});

test("completions filter by prefix", () => {
  assert.deepEqual(completions("s"), [{ value: "staging", label: "staging" }]);
  assert.equal(completions("x"), null);
});
