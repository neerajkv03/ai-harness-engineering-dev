import type { Block } from "@/data/learning/types";

export type Heading = { id: string; title: string; level: 2 | 3 };
export type LessonItem = { block: Block; heading?: Heading };

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

/**
 * Pairs each block with the heading it renders (if any) and returns the heading list for "On this page".
 * Sections are h2. A titled table/steps block is h3 under an earlier h2, or h2 itself if it comes first,
 * so heading levels never skip. Ids are slugified titles, de-duplicated within the lesson.
 */
export function withHeadings(blocks: Block[]): { items: LessonItem[]; headings: Heading[] } {
  const seen = new Map<string, number>();
  const headings: Heading[] = [];
  let sawH2 = false;

  const items = blocks.map((block): LessonItem => {
    const title = block.type === "section" || block.type === "table" || block.type === "steps" ? block.title : undefined;
    if (!title) return { block };

    const level: 2 | 3 = block.type === "section" || !sawH2 ? 2 : 3;
    if (level === 2) sawH2 = true;

    const base = slugify(title);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const heading: Heading = { id: n ? `${base}-${n + 1}` : base, title, level };
    headings.push(heading);
    return { block, heading };
  });

  return { items, headings };
}
