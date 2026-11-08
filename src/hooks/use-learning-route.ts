import { useCallback, useEffect, useRef, useState } from "react";
import type { Topic } from "@/data/learning/types";

type Params = { topic: string | null; sub: string | null };

const read = (): Params => {
  const p = new URLSearchParams(window.location.search);
  return { topic: p.get("topic"), sub: p.get("sub") };
};

/** Lesson selection lives in the URL (?topic=&sub=) so it is shareable and the back button works. */
export function useLearningRoute(topics: Topic[]) {
  const [params, setParams] = useState(read);
  const lastSub = useRef<Record<string, string>>({});

  useEffect(() => {
    const onPop = () => setParams(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const topic = topics.find((t) => t.slug === params.topic) ?? topics[0]!;
  const sub = topic.subTopics.find((s) => s.slug === params.sub) ?? topic.subTopics[0]!;

  useEffect(() => {
    lastSub.current[topic.slug] = sub.slug;
  }, [topic.slug, sub.slug]);

  const go = useCallback((topicSlug: string, subSlug: string) => {
    const q = `?topic=${encodeURIComponent(topicSlug)}&sub=${encodeURIComponent(subSlug)}`;
    window.history.pushState(null, "", q);
    setParams({ topic: topicSlug, sub: subSlug });
  }, []);

  /** Switching topic reopens the lesson you last viewed there, else its first lesson. */
  const goTopic = useCallback(
    (t: Topic) => go(t.slug, lastSub.current[t.slug] ?? t.subTopics[0]!.slug),
    [go],
  );

  return { topic, sub, go, goTopic };
}
