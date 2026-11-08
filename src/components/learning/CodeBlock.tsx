import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  language: string;
  filename?: string;
  code: string;
  /** 1-based line numbers to highlight. */
  highlight?: number[];
};

const HASH_COMMENT_LANGUAGES = new Set(["yaml", "yml", "bash", "sh", "dockerfile"]);

// Whole-line comments only. `#` is a comment in shell-like languages but a heading in Markdown, so it is opt-in.
const isComment = (line: string, language: string) => {
  const t = line.trimStart();
  return t.startsWith("//") || (HASH_COMMENT_LANGUAGES.has(language) && t.startsWith("#") && !t.startsWith("#!"));
};

export function CodeBlock({ language, filename, code, highlight }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return; // clipboard blocked (insecure context or denied); leave the button unchanged
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <figure className="my-6 overflow-hidden rounded-lg border bg-muted">
      <figcaption className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
          {filename ? `${language} · ${filename}` : language}
        </span>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Copy code" onClick={copy} />}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
        </Tooltip>
        <span className="sr-only" aria-live="polite">
          {copied ? "Copied" : ""}
        </span>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-6 whitespace-pre">
        <code>
          {lines.map((line, i) => (
            <span
              key={i}
              className={cn(
                "block",
                isComment(line, language) && "text-muted-foreground italic",
                highlight?.includes(i + 1) && "-mx-4 border-l-2 border-primary bg-primary/10 px-4",
              )}
            >
              {line || " "}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
