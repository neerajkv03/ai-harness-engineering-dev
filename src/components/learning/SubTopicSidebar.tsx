import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Topic } from "@/data/learning/types";
import type { Heading } from "@/lib/lesson";
import { cn } from "@/lib/utils";

/** Active topic name and lesson count (header of the right sidebar and the mobile drawer). */
export function SubTopicHeader({ topic }: { topic: Topic }) {
  return (
    <div className="min-w-0">
      <p className="text-sm leading-tight font-semibold">{topic.title}</p>
      <p className="text-xs text-muted-foreground">{topic.subTopics.length} lessons</p>
    </div>
  );
}

type Props = {
  topic: Topic;
  activeSub: string;
  headings: Heading[];
  activeHeading?: string;
  onSelectSub: (subSlug: string) => void;
  /** Called after a heading link is followed, so a drawer can close. */
  onFollowHeading?: () => void;
};

/** Lessons of the active topic, plus an "On this page" list for the open lesson. */
export function SubTopicNav({ topic, activeSub, headings, activeHeading, onSelectSub, onFollowHeading }: Props) {
  return (
    <div className="pb-4">
      <nav aria-label="Sub-topics" className="flex flex-col gap-1 p-2">
        {topic.subTopics.map((sub) => {
          const active = sub.slug === activeSub;
          return (
            <Button
              key={sub.slug}
              variant={active ? "secondary" : "ghost"}
              size="sm"
              aria-current={active ? "page" : undefined}
              onClick={() => onSelectSub(sub.slug)}
              className={cn(
                "h-auto min-h-7 w-full justify-start py-1.5 text-left whitespace-normal hover:bg-sidebar-accent",
                active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              {sub.title}
            </Button>
          );
        })}
      </nav>

      {headings.length > 0 && (
        <>
          <Separator className="my-2" />
          <nav aria-label="On this page" className="px-2 pt-2">
            <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">On this page</p>
            <ul className="flex flex-col gap-0.5">
              {headings.map((h) => {
                const active = h.id === activeHeading;
                return (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      onClick={onFollowHeading}
                      aria-current={active ? "location" : undefined}
                      className={cn(
                        "block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                        h.level === 3 && "pl-5",
                        active && "bg-sidebar-accent font-medium text-foreground",
                      )}
                    >
                      {h.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
