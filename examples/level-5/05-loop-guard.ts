// Lesson 5.3: catch an agent that is stuck. A scripted fake model plays a confused agent, so this runs offline.
// Run: bun run examples/level-5/05-loop-guard.ts      (no API key needed)
import { runAgent, type Tool } from "./lib/agent.ts";
import { scripted, textReply, toolReply } from "./lib/fake-model.ts";
import { BudgetExceeded, LoopDetected, LoopGuard } from "./lib/loop-guard.ts";

const searchFiles: Tool = {
  name: "search_files",
  description: "Search the project for text",
  input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  run: () => "no matches", // always finds nothing, so a naive agent just tries again
};

// The "agent" repeats the exact same failing search forever.
const stuckAgent = scripted(Array.from({ length: 20 }, () => toolReply([{ name: "search_files", input: { query: "deprecatedHelper" } }])));

const guard = new LoopGuard({ maxRepeats: 3, maxCalls: 40 });
try {
  await runAgent({
    system: "You fix bugs.",
    task: "Find where deprecatedHelper is defined.",
    tools: [searchFiles],
    call: stuckAgent,
    maxTurns: 20,
    beforeTool: (name, input) => guard.record(name, input), // runs before every tool call and can throw
  });
} catch (err) {
  if (err instanceof LoopDetected || err instanceof BudgetExceeded) {
    // Stop and escalate: tell a human, with enough context to act. Do not let it continue.
    console.log(`Agent stopped: ${err.message}`);
    console.log(`Model calls made: ${stuckAgent.calls.length} of 20 possible`);
  } else {
    throw err;
  }
}

// A healthy run passes through untouched.
const healthy = scripted([toolReply([{ name: "search_files", input: { query: "a" } }]), toolReply([{ name: "search_files", input: { query: "b" } }]), textReply("Found it.")]);
const healthyGuard = new LoopGuard();
const ok = await runAgent({ system: "s", task: "t", tools: [searchFiles], call: healthy, beforeTool: (n, i) => healthyGuard.record(n, i) });
console.log(`Healthy run finished: "${ok.text}"`);
