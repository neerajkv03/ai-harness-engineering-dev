import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setTheme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        setTheme(!dark);
        setDark(!dark);
      }}
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
