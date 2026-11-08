// Test the logic as a plain function, with a fake fetch. No Pi, no network, no model.
// Run: node --test examples/level-3/03-pi-extension-http-status/http-status.test.ts
//  or: bun test examples/level-3/03-pi-extension-http-status/http-status.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkStatus, formatResult, parseUrl, type FetchLike } from "./http-status-core.ts";

const fakeFetch =
  (status: number, headers: Record<string, string> = {}): FetchLike =>
  async () => ({ status, headers: { get: (name) => headers[name.toLowerCase()] ?? null } });

test("reports an ok status", async () => {
  const r = await checkStatus("https://example.com/health", fakeFetch(200));
  assert.equal(r.status, 200);
  assert.equal(r.ok, true);
});

test("reports a redirect target without following it", async () => {
  const r = await checkStatus("http://example.com", fakeFetch(301, { location: "https://example.com/" }));
  assert.equal(r.ok, false);
  assert.match(formatResult(r), /redirects to https:\/\/example\.com\//);
});

test("cancelling (Pi's abort signal) aborts the request instead of waiting for it", async () => {
  const hangs: FetchLike = (_url, init) =>
    new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal!.reason)));
  const controller = new AbortController();
  const pending = checkStatus("https://example.com", hangs, 10_000, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("rejects a bad URL with a message the model can act on", () => {
  assert.throws(() => parseUrl("example.com"), /not a valid URL.*https:\/\/example\.com\/health/);
});

test("rejects non-http protocols", () => {
  assert.throws(() => parseUrl("file:///etc/passwd"), /Only http and https/);
});
