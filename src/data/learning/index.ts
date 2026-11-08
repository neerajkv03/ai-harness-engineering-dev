import type { Topic } from "./types.ts";

// Each `level-N.ts` exports one Topic. New level files are picked up automatically, in filename order.
const modules = import.meta.glob<Record<string, unknown>>("./level-*.ts", { eager: true });

const isTopic = (v: unknown): v is Topic =>
  typeof v === "object" && v !== null && "subTopics" in v && Array.isArray(v.subTopics);

export const topics: Topic[] = Object.keys(modules)
  .sort()
  .flatMap((path) => Object.values(modules[path]!).filter(isTopic));
