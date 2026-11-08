import { Info, Lightbulb, OctagonAlert, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Inline } from "./Inline";
import { cn } from "@/lib/utils";

const variants = {
  info: { Icon: Info, label: "Note", className: "border-sky-500/40 bg-sky-500/5" },
  tip: { Icon: Lightbulb, label: "Tip", className: "border-emerald-500/40 bg-emerald-500/5" },
  warning: { Icon: TriangleAlert, label: "Warning", className: "border-amber-500/40 bg-amber-500/5" },
  danger: { Icon: OctagonAlert, label: "Danger", className: "border-destructive/40" },
} as const;

type Props = { variant: keyof typeof variants; title?: string; text: string };

export function NoteAlert({ variant, title, text }: Props) {
  const { Icon, label, className } = variants[variant];
  return (
    // role="note": the Alert default role="alert" would announce every note on page load.
    <Alert role="note" variant={variant === "danger" ? "destructive" : "default"} className={cn("my-6", className)}>
      <Icon aria-hidden />
      <AlertTitle>{title ?? label}</AlertTitle>
      <AlertDescription>
        <Inline text={text} />
      </AlertDescription>
    </Alert>
  );
}
