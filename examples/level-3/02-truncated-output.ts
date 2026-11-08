// Lesson 3.1: what a tool returns matters as much as what it accepts. Cap the size, say what was cut, and make errors fixable.
// Run: bun run examples/level-3/02-truncated-output.ts   (no API key needed)
import { z } from "zod";

type Order = { id: string; status: "pending" | "shipped" | "delivered" | "cancelled"; total: number; created: string };

// Fake data: 340 orders.
const STATUSES = ["pending", "shipped", "delivered", "cancelled"] as const;
const ORDERS: Order[] = Array.from({ length: 340 }, (_, i) => ({
  id: `ord_${1000 + i}`,
  status: STATUSES[i % 4]!,
  total: 10 + (i % 90),
  created: new Date(Date.UTC(2026, 9, 1 + (i % 30))).toISOString().slice(0, 10),
}));

const PAGE_SIZE = 20;
const Input = z.object({
  status: z.enum(STATUSES).optional(),
  created_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.number().int().min(1).default(1),
});

export function searchOrders(raw: unknown): string {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) {
    // Error messages are prompts: say which field, what was wrong, and what a valid value looks like.
    const issues = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    return `Invalid input:\n${issues}\nExample: {"status":"shipped","created_after":"2026-10-01","page":1}`;
  }
  const { status, created_after, page } = parsed.data;

  const matches = ORDERS.filter((o) => (!status || o.status === status) && (!created_after || o.created >= created_after));
  const start = (page - 1) * PAGE_SIZE;
  const rows = matches.slice(start, start + PAGE_SIZE);
  if (rows.length === 0) return `No orders on page ${page}. There are ${matches.length} matching orders in total.`;

  const lines = rows.map((o) => `${o.id} ${o.status} $${o.total} ${o.created}`);
  const shownTo = start + rows.length;
  // Tell the model what it is NOT seeing and how to get it. Silent truncation makes agents wrong with confidence.
  const footer =
    shownTo < matches.length
      ? `Showing ${start + 1}-${shownTo} of ${matches.length}. Pass page: ${page + 1} for more, or add a status/created_after filter.`
      : `Showing ${start + 1}-${shownTo} of ${matches.length}. End of results.`;
  return [...lines, footer].join("\n");
}

// Demo
console.log(searchOrders({}).split("\n").slice(-2).join("\n")); // last row and footer, not 21 lines
console.log("---");
console.log(searchOrders({ status: "shipped", page: 2 }).split("\n").pop());
console.log("---");
console.log(searchOrders({ status: "sent", created_after: "05/11" })); // a fixable error
