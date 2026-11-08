// Lesson 5.4: embed Pi in your own program with the SDK. No terminal UI: you prompt it and subscribe to events.
// Needs @earendil-works/pi-coding-agent installed and a provider key (for example ANTHROPIC_API_KEY).
// Run: bun run examples/level-5/06-pi-sdk.ts
import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

// Pick the model in code. Without `model`, the session uses whatever default the machine's settings name.
const modelRuntime = await ModelRuntime.create();
const model = modelRuntime.getModel("anthropic", "claude-opus-5-5");
if (!model) throw new Error("claude-opus-5-5 not found: check your Pi version and provider setup");

const { session } = await createAgentSession({
  modelRuntime,
  model,
  // Without `tools`, the SDK enables the defaults: read, bash, edit, write. This job only needs to look,
  // so it gets read-only tools. (To keep bash, add the Level 4 guard as an extension factory.)
  tools: ["read", "grep", "find", "ls"],
  sessionManager: SessionManager.inMemory(), // no session file written; this run leaves nothing behind
});

try {
  // Subscribe BEFORE prompting if you want streamed output.
  const unsubscribe = session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  // prompt() resolves when the run finishes, including automatic retries.
  await session.prompt("List the top-level files in this folder and say what the project is, in two sentences.");
  unsubscribe();

  console.log("\n---");
  console.log("final text:", session.getLastAssistantText());
} finally {
  session.dispose(); // aborts active work and releases listeners
}
