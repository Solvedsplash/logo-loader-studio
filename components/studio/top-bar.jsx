"use client";

import { Moon, Sun, PanelLeft, PanelRight } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function TopBar({ onToggleLeft, onToggleRight, leftOpen, rightOpen, children }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center justify-between gap-3 vibrancy border-b border-border/60 px-3">
      {/* App identity */}
      <div className="flex items-center gap-2.5">
        <img
          src="/MotionPod.svg"
          alt="Motion Pod logo"
          className="size-7 rounded-lg shadow-e1 object-contain"
        />
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Motion Pod
          </h1>
          <p className="hidden text-2xs text-muted-foreground sm:block">
            Animated loaders from your own logo
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hidden size-8 rounded-lg lg:inline-flex",
                "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8",
                leftOpen && "text-foreground bg-black/6 dark:bg-white/10"
              )}
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
              className={cn(
                "hidden size-8 rounded-lg lg:inline-flex",
                "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8",
                rightOpen && "text-foreground bg-black/6 dark:bg-white/10"
              )}
              onClick={onToggleRight}
              aria-pressed={rightOpen}
              aria-label="Toggle the settings panel"
            >
              <PanelRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings panel</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8"
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
    </header>
  );
}
