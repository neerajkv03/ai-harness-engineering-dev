import { Menu, PanelRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Topic } from "@/data/learning/types";
import { useActiveHeading } from "@/hooks/use-active-heading";
import { useLearningRoute } from "@/hooks/use-learning-route";
import { withHeadings } from "@/lib/lesson";
import { LessonView, type LessonTarget } from "./LessonView";
import { SubTopicHeader, SubTopicNav } from "./SubTopicSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { TopicNav } from "./TopicSidebar";

const APP_NAME = "AI Harness Engineering";

export function LearningLayout({ topics }: { topics: Topic[] }) {
  const { topic, sub, go, goTopic } = useLearningRoute(topics);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);

  const { items, headings } = useMemo(() => withHeadings(sub.blocks), [sub]);
  const activeHeading = useActiveHeading(headings);

  // Prev/next walk every lesson in order, so the last lesson of a level leads into the next level.
  const flat = useMemo(() => topics.flatMap((t) => t.subTopics.map((s) => ({ topic: t, sub: s }))), [topics]);
  const index = flat.findIndex((x) => x.topic === topic && x.sub === sub);
  const prev = index > 0 ? flat[index - 1] : undefined;
  const next = index >= 0 ? flat[index + 1] : undefined;

  useEffect(() => {
    document.title = `${sub.title} · ${APP_NAME}`;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const target = hash ? document.getElementById(hash) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [topic.slug, sub.slug, sub.title]);

  const selectTopic = (t: Topic) => {
    goTopic(t);
    setTopicsOpen(false);
  };
  const selectSub = (slug: string) => {
    go(topic.slug, slug);
    setSubsOpen(false);
  };
  const goTo = (t: LessonTarget) => go(t.topic.slug, t.sub.slug);

  const subNav = (
    <SubTopicNav
      topic={topic}
      activeSub={sub.slug}
      headings={headings}
      activeHeading={activeHeading}
      onSelectSub={selectSub}
      onFollowHeading={() => setSubsOpen(false)}
    />
  );

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      {/* Left: main topics (lg and up) */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <span className="text-sm font-semibold">{APP_NAME}</span>
          <ThemeToggle />
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <TopicNav topics={topics} activeSlug={topic.slug} onSelect={selectTopic} />
        </ScrollArea>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar: drawer buttons while a sidebar is hidden */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur xl:hidden">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open topics" onClick={() => setTopicsOpen(true)}>
            <Menu aria-hidden />
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium lg:hidden">{topic.title}</span>
          <ThemeToggle className="ml-auto lg:hidden" />
          <Button variant="ghost" size="icon" aria-label="Open lessons" onClick={() => setSubsOpen(true)}>
            <PanelRight aria-hidden />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
          <LessonView topic={topic} sub={sub} items={items} prev={prev} next={next} onGo={goTo} />
        </main>
      </div>

      {/* Right: lessons of the active topic + on this page (xl and up) */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-l bg-sidebar text-sidebar-foreground xl:flex">
        <div className="flex min-h-14 shrink-0 items-center border-b px-4 py-2">
          <SubTopicHeader topic={topic} />
        </div>
        <ScrollArea className="min-h-0 flex-1">{subNav}</ScrollArea>
      </aside>

      {/* Drawers */}
      <Sheet open={topicsOpen} onOpenChange={setTopicsOpen}>
        <SheetContent side="left" className="gap-0 p-0">
          <SheetHeader className="h-14 justify-center border-b px-4 py-0">
            <SheetTitle>{APP_NAME}</SheetTitle>
            <SheetDescription className="sr-only">Choose a topic</SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <TopicNav topics={topics} activeSlug={topic.slug} onSelect={selectTopic} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={subsOpen} onOpenChange={setSubsOpen}>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader className="h-14 justify-center border-b px-4 py-0">
            <SheetTitle className="truncate">{topic.title}</SheetTitle>
            <SheetDescription>{topic.subTopics.length} lessons</SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">{subNav}</ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
