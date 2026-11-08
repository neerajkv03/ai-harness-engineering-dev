// Content data shape from DESIGN.md §10. Layout components consume these; lesson text lives in data files only.
// Additive extensions beyond §10 (used by level data): optional `title` on table/steps, optional `links` on section.
export type Link = { title: string; url: string };

export type Block =
  | { type: "section"; title: string; body: string[]; links?: Link[] } // body paragraphs; inline `code` allowed
  | { type: "code"; language: string; filename?: string; code: string; highlight?: number[] }
  | { type: "note"; variant: "info" | "tip" | "warning" | "danger"; title?: string; text: string }
  | { type: "example"; title: string; context?: string; text: string }
  | { type: "table"; title?: string; headers: string[]; rows: string[][] }
  | { type: "steps"; title?: string; items: string[] };

export type SubTopic = { slug: string; title: string; description: string; blocks: Block[] };
export type Topic = { slug: string; title: string; icon: string /* lucide name */; subTopics: SubTopic[] };
