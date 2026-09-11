"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-8 items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#1c1c1e]/60 text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-white dark:hover:bg-[#2c2c2e] active:scale-95 shadow-sm"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </button>
  );
}
