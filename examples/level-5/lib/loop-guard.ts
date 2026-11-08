// Stop an agent that is stuck: the same tool with the same arguments, again and again, or too many calls overall.
import { createHash } from "node:crypto";

export class LoopDetected extends Error {}
export class BudgetExceeded extends Error {}

/** JSON with sorted keys, so {a:1,b:2} and {b:2,a:1} count as the same call. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export class LoopGuard {
  private recent: string[] = [];
  private total = 0;
  private readonly opts: { windowSize?: number; maxRepeats?: number; maxCalls?: number };

  // Explicit field, not a constructor parameter property: `node file.ts` strips types and cannot run those.
  constructor(opts: { windowSize?: number; maxRepeats?: number; maxCalls?: number } = {}) {
    this.opts = opts;
  }

  /** Call before every tool call. Throws LoopDetected or BudgetExceeded when the agent should stop. */
  record(toolName: string, input: unknown): void {
    const { windowSize = 8, maxRepeats = 3, maxCalls = 40 } = this.opts;

    this.total++;
    if (this.total > maxCalls) throw new BudgetExceeded(`more than ${maxCalls} tool calls in one run`);

    const hash = createHash("sha256").update(`${toolName}:${canonical(input)}`).digest("hex").slice(0, 12);
    this.recent.push(hash);
    if (this.recent.length > windowSize) this.recent.shift();

    const repeats = this.recent.filter((h) => h === hash).length;
    if (repeats >= maxRepeats) {
      throw new LoopDetected(`"${toolName}" was called with identical arguments ${repeats} times in the last ${this.recent.length} calls`);
    }
  }
}
