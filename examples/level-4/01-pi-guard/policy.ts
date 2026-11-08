// The decision logic for a guard hook: pure functions, no Pi imports, easy to test.
// IMPORTANT: this is a speed bump and a safety net, NOT a security boundary. String matching on shell commands
// can always be bypassed by a determined attacker. Pair it with a sandbox (lesson 4.3).
import os from "node:os";
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
// A glob such as '.e*' or '*.env' names a secret without spelling it, so each glob segment is tested against sample names.
// ponytail: sample names, not a full glob engine. A segment of only wildcards ('*') is skipped, or every `ls *` would be denied.
const SECRET_NAMES = [".env", ".env.local", ".ssh", ".aws", "id_rsa", "id_ed25519", "id_ecdsa", "key.pem"];
const globToRegExp = (g: string) => new RegExp(`^${g.replace(/[.+^${}()|\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
const globHitsSecret = (s: string) =>
  s.split(/[\\/:=]/).some((seg) => /[*?[]/.test(seg) && /[a-z]/i.test(seg) && SECRET_NAMES.some((n) => globToRegExp(seg).test(n)));
const isSensitive = (s: string) => (SENSITIVE.some((re) => re.test(s)) && !/\.env\.example$/.test(s)) || globHitsSecret(s);

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
        return tokens.some((t) => /^-[a-zA-Z]*f[a-zA-Z]*$/.test(t) || t.startsWith("--force") || t.startsWith("+")) // -f, -uf, --force*
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
  // "| sh", "| /bin/sh", "| /usr/bin/env bash", "|& python3" ...
  if (/\|&?\s*(sudo\s+)?(\S*\/)?(env\s+)?((ba|z|da|k)?sh|python3?|node|perl|ruby)\b/.test(cmd)) {
    return deny("pipes downloaded or generated text into an interpreter");
  }
  if (/\b(ba|z)?sh\s+-c\b.*\$\(\s*(curl|wget)/.test(cmd)) return deny("runs downloaded code through sh -c");
  if (/\$\(|`|<\(|>/.test(cmd)) return ask("uses command substitution or output redirection");

  // Judge every piece of a compound command. `git status && rm -rf x` must not pass because the first half is safe.
  let verdict: Verdict = allow;
  // A lone "&" runs the left side in the background and carries on, so it separates commands too.
  for (const segment of cmd.split(/&&|\|\||\|&|;|\||&|\n/)) {
    const tokens = segment
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/['"\\]/g, "")) // the shell drops quotes and backslashes anywhere: HEAD:".env" is HEAD:.env
      .filter(Boolean);
    verdict = worst(verdict, decideSegment(tokens));
  }
  return verdict;
}

export function decidePath(raw: string, cwd: string, mode: "read" | "write"): Verdict {
  // Some models prefix paths with "@". Pi's tools expand "~" to the home folder, so the guard must too.
  const full = path.resolve(cwd, raw.replace(/^@/, "").replace(/^~(?=$|[\\/])/, os.homedir()));
  if (isSensitive(full)) return deny("secret or key file");

  const rel = path.relative(cwd, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return ask("outside the project folder");
  if (mode === "write" && /(^|[\\/])(generated|\.git)([\\/]|$)/.test(rel)) {
    return deny("generated or git-internal files are rebuilt by tools, not edited by hand");
  }
  // An agent that can rewrite its own extensions, instructions or CI can switch this guard off on the next run.
  const agentConfig = /(^|[\\/])(\.pi|\.github)([\\/]|$)/.test(rel) || /^(AGENTS(\.override)?|CLAUDE)\.md$/i.test(path.basename(rel));
  if (mode === "write" && agentConfig) return ask("changes the agent's own config, instructions or CI");
  return allow;
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

// One entry point for every tool call. A tool with no rule asks, so a new MCP or custom tool cannot slip through.
export function decideTool(name: string, input: Record<string, unknown>, cwd: string): Verdict {
  const where = str(input.path) ?? ".";
  switch (name) {
    case "bash":
      return decideBash(str(input.command) ?? "");
    case "read":
      return decidePath(where, cwd, "read");
    case "write":
    case "edit":
      return decidePath(where, cwd, "write");
    case "grep":
    case "find":
    case "ls": {
      // grep reads file contents; find and ls reveal names. Judge where they look and what they match.
      const filter = str(input.glob) ?? (name === "find" ? str(input.pattern) : undefined);
      const target = filter && isSensitive(filter) ? deny("search targets a secret or key file") : allow;
      return worst(decidePath(where, cwd, "read"), target);
    }
    default:
      return ask(`"${name}" has no rule in this guard`);
  }
}
