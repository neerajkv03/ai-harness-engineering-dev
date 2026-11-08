// Logic for an auto-format hook. No Pi imports, so it can be tested on its own.
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const FORMATTABLE = /\.(ts|tsx|js|jsx|json|css|md)$/;

/** Which file (if any) should be formatted after this tool finished? Only successful edits and writes. */
export function pathToFormat(toolName: string, input: unknown, isError: boolean): string | undefined {
  if (isError || (toolName !== "edit" && toolName !== "write")) return undefined;
  const p = (input as { path?: unknown } | null)?.path;
  return typeof p === "string" && FORMATTABLE.test(p) ? p.replace(/^@/, "") : undefined;
}

/**
 * Run the project's own Prettier on one file. Uses `node <prettier-bin>` instead of `npx`, which works the same
 * on Windows, macOS and Linux (npx is a .cmd file on Windows and cannot be spawned directly).
 */
export function formatFile(cwd: string, file: string, timeoutMs = 15_000): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    let bin: string;
    try {
      bin = createRequire(path.join(cwd, "package.json")).resolve("prettier/bin/prettier.cjs");
    } catch {
      resolve({ ok: false, message: "prettier is not installed in this project" });
      return;
    }
    execFile(process.execPath, [bin, "--write", path.resolve(cwd, file)], { cwd, timeout: timeoutMs }, (error, _out, stderr) =>
      resolve(error ? { ok: false, message: stderr.trim() || error.message } : { ok: true, message: `formatted ${file}` }),
    );
  });
}
