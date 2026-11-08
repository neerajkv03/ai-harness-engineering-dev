// Lesson 5.4: embed Pi in your own program with the SDK. No terminal UI: you prompt it and subscribe to events.
// Needs @earendil-works/pi-coding-agent installed and a provider key (for example ANTHROPIC_API_KEY).
// Run: bun run examples/level-5/06-pi-sdk.ts
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
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
