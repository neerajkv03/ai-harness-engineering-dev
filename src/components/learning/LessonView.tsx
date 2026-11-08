import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SubTopic, Topic } from "@/data/learning/types";
import type { Heading, LessonItem } from "@/lib/lesson";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { ExampleCard } from "./ExampleCard";
import { Inline } from "./Inline";
import { NoteAlert } from "./NoteAlert";

export type LessonTarget = { topic: Topic; sub: SubTopic };

type Props = {
  topic: Topic;
  sub: SubTopic;
  items: LessonItem[];
  prev?: LessonTarget;
  next?: LessonTarget;
  onGo: (target: LessonTarget) => void;
};

function HeadingLink({ heading }: { heading: Heading }) {
  const Tag = heading.level === 2 ? "h2" : "h3";
  return (
    <Tag
      id={heading.id}
      className={cn(
        "scroll-mt-20",
        heading.level === 2 ? "mt-12 text-xl font-semibold tracking-tight" : "mt-8 text-base font-semibold",
      )}
    >
      <a href={`#${heading.id}`} className="group rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {heading.title}
        <span
          aria-hidden
          className="ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          #
        </span>
      </a>
    </Tag>
  );
}

function BlockView({ item }: { item: LessonItem }) {
  const { block, heading } = item;
  const head = heading && <HeadingLink heading={heading} />;

  switch (block.type) {
    case "section":
      return (
        <section>
          {head}
          {block.body.map((p, i) => (
            <p key={i} className="mt-4 max-w-prose text-base leading-7">
              <Inline text={p} />
            </p>
          ))}
          {block.links && block.links.length > 0 && (
            <ul className="mt-4 max-w-prose list-disc space-y-2 pl-6 leading-7">
              {block.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-muted-foreground"
                  >
                    {link.title}
                    <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      );

    case "code":
      return <CodeBlock language={block.language} filename={block.filename} code={block.code} highlight={block.highlight} />;

    case "note":
      return <NoteAlert variant={block.variant} title={block.title} text={block.text} />;

    case "example":
      return <ExampleCard title={block.title} context={block.context} text={block.text} />;

    case "table":
      return (
        <div>
          {head}
          <div className="my-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {block.headers.map((h, i) => (
                    <TableHead key={i} className="text-muted-foreground">
                      <Inline text={h} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {block.rows.map((row, i) => (
                  <TableRow key={i} className="border-b">
                    {row.map((cell, j) => (
                      <TableCell key={j} className="align-top whitespace-normal">
                        <Inline text={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );

    case "steps":
      return (
        <div>
          {head}
          <ol className="my-6 space-y-4">
            {block.items.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 leading-7">
                  <Inline text={step} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      );
  }
}

function PagerButton({ target, direction, onGo }: { target: LessonTarget; direction: "prev" | "next"; onGo: Props["onGo"] }) {
  const next = direction === "next";
  return (
    <Button
      variant="outline"
      onClick={() => onGo(target)}
      className={cn(
        "h-auto w-full py-3 whitespace-normal",
        next ? "justify-end text-right sm:col-start-2" : "justify-start text-left",
      )}
    >
      {!next && <ChevronLeft aria-hidden className="size-4 shrink-0" />}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-normal text-muted-foreground">{next ? "Next" : "Previous"}</span>
        <span>{target.sub.title}</span>
      </span>
      {next && <ChevronRight aria-hidden className="size-4 shrink-0" />}
    </Button>
  );
}

export function LessonView({ topic, sub, items, prev, next, onGo }: Props) {
  return (
    <article>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        {topic.title} / {sub.title}
      </nav>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{sub.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        <Inline text={sub.description} />
      </p>

      {items.map((item, i) => (
        <BlockView key={i} item={item} />
      ))}

      <Separator className="mt-16" />
      <nav aria-label="Lesson navigation" className="mt-6 grid gap-3 sm:grid-cols-2">
        {prev && <PagerButton target={prev} direction="prev" onGo={onGo} />}
        {next && <PagerButton target={next} direction="next" onGo={onGo} />}
      </nav>
    </article>
  );
}
