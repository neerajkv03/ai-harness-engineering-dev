// Lesson 7.1: find the loop, the tools, the context manager, the safety layer and the rest in ANY harness codebase.
// Run: bun run examples/level-7/01-map-a-harness.ts [path-to-a-harness-checkout]      (default: this folder)
// Try it on Pi's source (git clone https://github.com/earendil-works/pi) or on an installed package's dist/ folder.
import path from "node:path";
import { mapHarness } from "./lib/harness-map.ts";

const root = path.resolve(process.argv[2] ?? ".");
console.log(`mapping ${root}\n`);

for (const [subsystem, files] of Object.entries(mapHarness(root))) {
  console.log(subsystem.toUpperCase());
  if (files.length === 0) console.log("  (nothing found)");
  for (const f of files) console.log(`  ${f.file}  (${f.hits} hits, ${(f.bytes / 1024).toFixed(0)} KB)`);
  console.log();
}
console.log("Open the 'agent loop' file first. Everything else hangs off it.");
