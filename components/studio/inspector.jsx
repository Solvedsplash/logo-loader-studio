"use client";

import { RotateCcw, Sliders, Timer, Image as ImageIcon, Info } from "lucide-react";
import { TIMING_SCHEMA, getParamSchema, isParamVisible } from "@/lib/presets";
import { ParamControl } from "./param-control";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3];

function SectionHeading({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
      <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {children}
      </h3>
      {action}
    </div>
  );
}

/**
 * The configuration panel for the selected preset.
 *
 * Controls are generated from the schema in lib/presets.js rather than written
 * per preset, so every family exposes exactly the parameters it actually reads.
 */
export function Inspector({
  preset,
  overrides,
  onParamChange,
  onTimingChange,
  onResetAll,
  background,
  onBackgroundChange,
}) {
  const schema = getParamSchema(preset);
  const params = { ...preset.params, ...(overrides.params ?? {}) };

  const timingValues = {
    duration: overrides.duration ?? preset.duration,
    easing: overrides.easing ?? preset.easing,
    direction: overrides.direction ?? "normal",
  };

  const hasEdits =
    Object.keys(overrides.params ?? {}).length > 0 ||
    overrides.duration !== undefined ||
    overrides.easing !== undefined ||
    (overrides.direction && overrides.direction !== "normal");

  const speed = overrides.speed ?? 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          {/* 15px: one step above body, so the panel has an obvious subject. */}
          <h2 className="truncate text-base font-semibold tracking-[-0.2px]">{preset.name}</h2>
          <p className="truncate text-2xs text-muted-foreground">
            {preset.family} · {schema.length} parameters
          </p>
        </div>
        {hasEdits && (
          <Button variant="ghost" size="sm" onClick={onResetAll} className="h-7 shrink-0 gap-1 px-2 text-xs">
            <RotateCcw className="size-3" aria-hidden />
            Reset
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="pb-6">
          {/* ── Timing ─────────────────────────────────────────────── */}
          <SectionHeading icon={Timer}>Timing</SectionHeading>
          <div className="space-y-3.5 px-3">
            {TIMING_SCHEMA.map((control) => (
              <ParamControl
                key={control.key}
                control={control}
                value={timingValues[control.key]}
                defaultValue={
                  control.key === "direction" ? "normal" : preset[control.key]
                }
                onChange={onTimingChange}
              />
            ))}

            {/* Speed is a multiplier over duration rather than a stored value,
                so it stays meaningful when you switch preset. */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label className="text-xs font-medium">Playback Speed</Label>
                <span className="tabular text-2xs text-muted-foreground">{speed}×</span>
              </div>
              <div className="grid grid-cols-6 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Playback speed">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={speed === s}
                    onClick={() => onTimingChange("speed", s)}
                    className={cn(
                      // 8px = 12px outer radius − 4px track padding.
                      "tabular rounded-sm py-1.5 text-2xs font-medium transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      speed === s
                        ? "bg-card text-foreground shadow-e1"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <p className="tabular text-2xs text-muted-foreground">
                Loop length {(timingValues.duration / speed / 1000).toFixed(2)}s
              </p>
            </div>
          </div>

          <Separator className="my-3" />

          {/* ── Background ─────────────────────────────────────────── */}
          <SectionHeading icon={ImageIcon}>Background</SectionHeading>
          <div className="space-y-3 px-3">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Background mode">
              {[
                { value: "transparent", label: "Transparent" },
                { value: "color", label: "Solid colour" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={background.mode === opt.value}
                  onClick={() => onBackgroundChange({ ...background, mode: opt.value })}
                  className={cn(
                    // 8px = 12px outer radius − 4px track padding.
                    "rounded-sm px-2 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    background.mode === opt.value
                      ? "bg-card text-foreground shadow-e1"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {background.mode === "color" ? (
              <div className="flex items-center gap-2">
                <label
                  className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-border shadow-e1 focus-within:ring-2 focus-within:ring-ring"
                  style={{ background: background.color }}
                >
                  <span className="sr-only">Background colour</span>
                  <input
                    type="color"
                    value={background.color}
                    onChange={(e) => onBackgroundChange({ ...background, color: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <input
                  type="text"
                  value={background.color}
                  onChange={(e) => onBackgroundChange({ ...background, color: e.target.value })}
                  spellCheck={false}
                  aria-label="Background colour hex value"
                  className="tabular h-8 w-full rounded-sm border border-input bg-transparent px-2 text-xs uppercase focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
              </div>
            ) : (
              <p className="flex gap-1.5 text-2xs leading-relaxed text-muted-foreground">
                <Info className="mt-px size-3 shrink-0" aria-hidden />
                <span>
                  Exports keep a real alpha channel. WebM and Lottie support full
                  transparency; GIF only supports hard-edged (1-bit) transparency.
                </span>
              </p>
            )}
          </div>

          <Separator className="my-3" />

          {/* ── Family parameters ──────────────────────────────────── */}
          <SectionHeading icon={Sliders}>{preset.name} Settings</SectionHeading>
          <div className="space-y-3.5 px-3">
            {schema.length === 0 && (
              <p className="text-2xs text-muted-foreground">
                This preset has no adjustable parameters.
              </p>
            )}
            {schema
              .filter((control) => isParamVisible(control, params))
              .map((control) => (
                <ParamControl
                  key={control.key}
                  control={control}
                  value={params[control.key]}
                  defaultValue={preset.params[control.key]}
                  onChange={onParamChange}
                />
              ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
