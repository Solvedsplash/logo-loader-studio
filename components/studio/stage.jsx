"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Grid2x2 } from "lucide-react";
import CoreEngine from "@/lib/core-engine";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const CANVAS_PX = 880; // backing store; displayed responsively

/**
 * The live preview.
 *
 * Two things matter here for correctness:
 *  1. The animation object is passed to the engine untouched, background and
 *     all, so what you see is literally what the exporters render.
 *  2. The playhead is kept in a ref and advanced by elapsed time, so changing a
 *     parameter re-renders the current frame instead of snapping back to zero.
 */
export function Stage({ animation, logoImg, paths, showChecker, onToggleChecker }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const progressRef = useRef(0);
  const lastTimeRef = useRef(0);

  const [playing, setPlaying] = useState(true);
  const [scrub, setScrub] = useState(0);

  // Keep the latest inputs in a ref so the render loop never needs to be torn
  // down and restarted — that restart is what used to reset the animation to 0
  // every time a setting changed.
  const inputs = useRef({ animation, logoImg, paths });
  inputs.current = { animation, logoImg, paths };

  const paint = useCallback((progress) => {
    const canvas = canvasRef.current;
    const { animation: anim, logoImg: img, paths: p } = inputs.current;
    if (!canvas || !img || !anim) return;
    const ctx = canvas.getContext("2d");
    const state = CoreEngine.getFrameState(progress, anim, p);
    CoreEngine.renderStateToCanvas(ctx, state, img);
  }, []);

  // Main loop.
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const loop = (now) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (playing) {
        const duration = inputs.current.animation?.duration || 3000;
        progressRef.current = (progressRef.current + dt / duration) % 1;
        setScrub(progressRef.current);
      }
      paint(progressRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, paint]);

  // Repaint immediately when a setting changes while paused, so edits are visible.
  useEffect(() => {
    if (!playing) paint(progressRef.current);
  }, [animation, logoImg, paths, playing, paint]);

  const restart = () => {
    progressRef.current = 0;
    setScrub(0);
    paint(0);
  };

  const onScrub = ([v]) => {
    progressRef.current = v;
    setScrub(v);
    paint(v);
  };

  const transparent = !animation?.backgroundColor;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Stage — neutral Apple grey, no ambient glow */}
      <div className="stage-ambient relative flex min-h-0 flex-1 items-center justify-center p-6">
        <div
          className={cn(
            "relative aspect-square w-full max-w-[min(58vh,560px)] overflow-hidden rounded-2xl shadow-e3",
            "border border-black/[0.08] dark:border-white/[0.08]",
            showChecker && transparent ? "checkerboard" : "bg-transparent"
          )}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_PX}
            height={CANVAS_PX}
            className="size-full"
            role="img"
            aria-label={`Preview of the ${animation?.name ?? "selected"} animation`}
          />
        </div>
      </div>

      {/* Transport bar — frosted glass like macOS media controls */}
      <div className="vibrancy flex items-center gap-3 border-t border-border/60 px-4 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/6 dark:hover:bg-white/10"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause preview" : "Play preview"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{playing ? "Pause" : "Play"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/6 dark:hover:bg-white/10"
              onClick={restart}
              aria-label="Restart from the beginning"
            >
              <RotateCcw className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Restart</TooltipContent>
        </Tooltip>

        <Slider
          min={0}
          max={0.999}
          step={0.001}
          value={[scrub]}
          onValueChange={onScrub}
          aria-label="Scrub the animation timeline"
          className="min-w-0 flex-1"
        />

        <span className="tabular w-20 shrink-0 text-right text-2xs text-muted-foreground">
          {(scrub * (animation?.duration ?? 0) / 1000).toFixed(2)}s /{" "}
          {((animation?.duration ?? 0) / 1000).toFixed(2)}s
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showChecker ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "size-8 shrink-0 rounded-lg",
                showChecker
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/6 dark:hover:bg-white/10"
              )}
              onClick={onToggleChecker}
              disabled={!transparent}
              aria-label="Toggle the transparency checkerboard"
              aria-pressed={showChecker}
            >
              <Grid2x2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {transparent
              ? "Toggle transparency grid"
              : "Only available with a transparent background"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
