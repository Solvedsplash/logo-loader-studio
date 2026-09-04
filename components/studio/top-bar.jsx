"use client";

import { Moon, Sun, Sparkles, PanelLeft, PanelRight } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TopBar({ onToggleLeft, onToggleRight, leftOpen, rightOpen, children }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="relative z-20 flex h-13 shrink-0 items-center justify-between gap-3 bg-card px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground shadow-e1"
          aria-hidden
        >
          <Sparkles className="size-4" />
        </span>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-tight">Logo Loader Studio</h1>
          <p className="hidden text-2xs text-muted-foreground sm:block">
            Animated loaders from your own logo
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 lg:inline-flex"
              onClick={onToggleLeft}
              aria-pressed={leftOpen}
              aria-label="Toggle the presets panel"
            >
              <PanelLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Presets panel</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 lg:inline-flex"
              onClick={onToggleRight}
              aria-pressed={rightOpen}
              aria-label="Toggle the settings panel"
            >
              <PanelRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings panel</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} appearance`}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {theme === "dark" ? "Light appearance" : "Dark appearance"}
          </TooltipContent>
        </Tooltip>

        {children && <div className="ml-1 hidden lg:block">{children}</div>}
      </div>

      {/* Hairline that fades at the edges, in place of a hard border. */}
      <div className="rule-fade pointer-events-none absolute inset-x-0 bottom-0 h-px" aria-hidden />
    </header>
  );
}
