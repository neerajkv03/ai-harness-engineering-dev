// Logic for a /deploy-preview command. Pure functions, so they can be tested without Pi.

// Only environments the command is allowed to touch. "prod" is deliberately not here:
// a command the agent or a typo can trigger should not be able to reach production.
export const ENVIRONMENTS = ["dev", "staging"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export function parseEnvironment(args: string): { ok: true; env: Environment } | { ok: false; message: string } {
  const value = args.trim().toLowerCase();
  const env = ENVIRONMENTS.find((e) => e === value);
  if (env) return { ok: true, env };
  return { ok: false, message: `Usage: /deploy-preview <${ENVIRONMENTS.join("|")}>${value ? ` (got "${value}")` : ""}` };
}

/** Tab-completion: environments that start with what has been typed so far. */
export function completions(prefix: string): { value: string; label: string }[] | null {
  const items = ENVIRONMENTS.filter((e) => e.startsWith(prefix)).map((e) => ({ value: e, label: e }));
  return items.length > 0 ? items : null;
}
