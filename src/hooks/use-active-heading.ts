import { useEffect, useState } from "react";
import type { Heading } from "@/lib/lesson";

/** Returns the id of the heading currently near the top of the viewport. */
export function useActiveHeading(headings: Heading[]): string | undefined {
  const key = headings.map((h) => h.id).join("|");
  const [active, setActive] = useState<string | undefined>(headings[0]?.id);

  useEffect(() => {
    const ids = key ? key.split("|") : [];
    setActive(ids[0]);
    const elements = ids.flatMap((id) => document.getElementById(id) ?? []);
    if (!elements.length) return;

    // A heading becomes active when it enters the band between the sticky bar and ~30% down the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return active;
}
