// The decision logic for a guard hook: pure functions, no Pi imports, easy to test.
// IMPORTANT: this is a speed bump and a safety net, NOT a security boundary. String matching on shell commands
// can always be bypassed by a determined attacker. Pair it with a sandbox (lesson 4.3).
import path from "node:path";

export type Verdict = { action: "allow" } | { action: "ask"; reason: string } | { action: "deny"; reason: string };

const allow: Verdict = { action: "allow" };
const ask = (reason: string): Verdict => ({ action: "ask", reason });
const deny = (reason: string): Verdict => ({ action: "deny", reason });
const rank = { allow: 0, ask: 1, deny: 2 } as const;
const worst = (a: Verdict, b: Verdict): Verdict => (rank[b.action] > rank[a.action] ? b : a);

// Secrets and keys: never read, never write, however the request is phrased.
// ":" and "=" count as separators so "HEAD:.env" (git show) and "--file=.env" are caught too.
const SENSITIVE = [/(^|[\\/:=])\.env($|\.)/, /(^|[\\/:=])\.ssh([\\/]|$)/, /(^|[\\/:=])\.aws([\\/]|$)/, /id_(rsa|ed25519|ecdsa)/, /\.pem$/];
const isSensitive = (s: string) => SENSITIVE.some((re) => re.test(s)) && !/\.env\.example$/.test(s);

const SAFE_SCRIPTS = new Set(["test", "lint", "build", "typecheck"]);
const READ_ONLY_GIT = new Set(["status", "diff", "log", "show"]);

function decideSegment(tokens: string[]): Verdict {
  if (tokens.length === 0) return allow;
  if (tokens.some(isSensitive)) return deny("touches a secret or key file");

  const [cmd = "", sub = "", script = ""] = tokens;
  if (cmd.includes("=")) return ask("sets environment variables for the command");

  switch (cmd) {
    case "sudo":
      return deny("sudo is not allowed");
    case "rm":
      return tokens.some((t) => /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(t) || t === "--recursive")
        ? deny("recursive delete")
        : ask("deletes files");
    case "git":
      if (tokens.includes("push")) {
        // Force can hide in a flag or in a "+branch" refspec.
        return tokens.some((t) => t === "-f" || t.startsWith("--force") || t.startsWith("+"))
          ? deny("force push")
          : ask("pushes to a remote");
      }
      if (READ_ONLY_GIT.has(sub) && !tokens.some((t) => t.startsWith("--output"))) return allow;
      return ask(`"git ${sub}" is not on the read-only allow-list`);
    case "ls":
    case "pwd":
      return allow;
    case "bun":
    case "npm":
      if (sub === "test") return allow;
      if (sub === "run" && SAFE_SCRIPTS.has(script)) return allow;
      return ask(`"${cmd} ${sub}" is not on the allow-list`);
    default:
      // The allow-list is the point: anything we have not named needs a human.
      return ask(`"${cmd}" is not on the allow-list`);
  }
}

export function decideBash(command: string): Verdict {
  const cmd = command.replace(/\d?>&\d/g, ""); // ignore harmless "2>&1"

  // Whole-command checks first: these span pipes and substitutions, so splitting would hide them.
  if (/\|\s*(sudo\s+)?(ba|z|da|k)?sh\b/.test(cmd) || /\|\s*(python3?|node|perl|ruby)\b/.test(cmd)) {
    return deny("pipes downloaded or generated text into an interpreter");
  }
  if (/\b(ba|z)?sh\s+-c\b.*\$\(\s*(curl|wget)/.test(cmd)) return deny("runs downloaded code through sh -c");
  if (/\$\(|`|<\(|>/.test(cmd)) return ask("uses command substitution or output redirection");

  // Judge every piece of a compound command. `git status && rm -rf x` must not pass because the first half is safe.
  let verdict: Verdict = allow;
  for (const segment of cmd.split(/&&|\|\||;|\||\n/)) {
    const tokens = segment
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
    verdict = worst(verdict, decideSegment(tokens));
  }
  return verdict;
}

export function decidePath(raw: string, cwd: string, mode: "read" | "write"): Verdict {
  const full = path.resolve(cwd, raw.replace(/^@/, "")); // some models prefix paths with "@"
  if (isSensitive(full)) return deny("secret or key file");

  const rel = path.relative(cwd, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return ask("outside the project folder");
  if (mode === "write" && /(^|[\\/])(generated|\.git)([\\/]|$)/.test(rel)) {
    return deny("generated or git-internal files are rebuilt by tools, not edited by hand");
  }
  return allow;
}
