import {
  BookOpen,
  ChartLine,
  FlaskConical,
  GraduationCap,
  Layers,
  Network,
  ShieldCheck,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Topic } from "@/data/learning/types";
import { cn } from "@/lib/utils";

// Topic.icon is a lucide icon name in data. Only the icons the curriculum uses are bundled.
const icons: Record<string, LucideIcon> = {
  GraduationCap,
  Terminal,
  Layers,
  Wrench,
  ShieldCheck,
  Network,
  ChartLine,
  FlaskConical,
};

type Props = { topics: Topic[]; activeSlug: string; onSelect: (topic: Topic) => void };

/** The list of main topics (left sidebar and the mobile drawer share it). */
export function TopicNav({ topics, activeSlug, onSelect }: Props) {
  return (
    <nav aria-label="Topics" className="flex flex-col gap-1 p-2">
      {topics.map((topic) => {
        const active = topic.slug === activeSlug;
        const Icon = icons[topic.icon] ?? BookOpen;
        return (
          <Button
            key={topic.slug}
            variant={active ? "secondary" : "ghost"}
            size="sm"
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(topic)}
            className={cn(
              "h-auto min-h-7 w-full justify-start py-1.5 text-left whitespace-normal hover:bg-sidebar-accent",
              active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{topic.title}</span>
            <Badge variant={active ? "outline" : "secondary"}>{topic.subTopics.length}</Badge>
          </Button>
        );
      })}
    </nav>
  );
}
