"use client";

import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Formats a raw parameter value for the readout beside its label. */
function formatValue(control, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (control.format === "percent") return `${Math.round(Number(value) * 100)}%`;
  if (control.type === "range") {
    const n = Number(value);
    const decimals = control.step < 1 ? String(control.step).split(".")[1]?.length ?? 2 : 0;
    return `${n.toFixed(decimals)}${control.unit ?? ""}`;
  }
  return String(value);
}

function ControlHeader({ control, value, isModified, onReset }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Label
          htmlFor={`param-${control.key}`}
          className="text-xs font-medium text-foreground truncate"
        >
          {control.label}
        </Label>
        {isModified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onReset}
                aria-label={`Reset ${control.label} to the preset value`}
                className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <RotateCcw className="size-3" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>Reset to preset value</TooltipContent>
          </Tooltip>
        )}
      </div>
      {control.type === "range" && (
        <span className="tabular text-2xs text-muted-foreground shrink-0">
          {formatValue(control, value)}
        </span>
      )}
    </div>
  );
}

/**
 * Renders one control from a schema entry. Every parameter in lib/presets.js
 * gets its editor from here, so adding a parameter to a family needs no UI work.
 */
export function ParamControl({ control, value, defaultValue, onChange }) {
  const isModified =
    defaultValue !== undefined && String(value) !== String(defaultValue);
  const reset = () => onChange(control.key, defaultValue);

  const header = (
    <ControlHeader
      control={control}
      value={value}
      isModified={isModified}
      onReset={reset}
    />
  );

  if (control.type === "range") {
    return (
      <div className="space-y-2">
        {header}
        <Slider
          id={`param-${control.key}`}
          min={control.min}
          max={control.max}
          step={control.step}
          value={[Number(value ?? control.min)]}
          onValueChange={([v]) => onChange(control.key, v)}
          aria-label={control.label}
        />
        {control.hint && (
          <p className="text-2xs leading-snug text-muted-foreground">{control.hint}</p>
        )}
      </div>
    );
  }

  if (control.type === "select") {
    return (
      <div className="space-y-1.5">
        {header}
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(control.key, v)}>
          <SelectTrigger id={`param-${control.key}`} size="sm" className="w-full">
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {control.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {control.hint && (
          <p className="text-2xs leading-snug text-muted-foreground">{control.hint}</p>
        )}
      </div>
    );
  }

  if (control.type === "segmented") {
    return (
      <div className="space-y-1.5">
        {header}
        {/* A radiogroup rather than a set of buttons, so arrow keys move between
            options and screen readers announce the selected one. */}
        <div
          role="radiogroup"
          aria-label={control.label}
          className="grid gap-1 rounded-lg bg-muted p-1"
          style={{ gridTemplateColumns: `repeat(${control.options.length}, minmax(0, 1fr))` }}
        >
          {control.options.map((opt) => {
            const active = String(value) === String(opt.value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(control.key, opt.value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-card text-foreground shadow-e1"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {control.hint && (
          <p className="text-2xs leading-snug text-muted-foreground">{control.hint}</p>
        )}
      </div>
    );
  }

  if (control.type === "color") {
    const color = value || "#8b5cf6";
    return (
      <div className="space-y-1.5">
        {header}
        <div className="flex items-center gap-2">
          <label
            className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border shadow-e1 focus-within:ring-2 focus-within:ring-ring"
            style={{ background: color }}
          >
            <span className="sr-only">{control.label}</span>
            <input
              id={`param-${control.key}`}
              type="color"
              value={color}
              onChange={(e) => onChange(control.key, e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <input
            type="text"
            value={color}
            onChange={(e) => onChange(control.key, e.target.value)}
            spellCheck={false}
            aria-label={`${control.label} hex value`}
            className="tabular h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs uppercase focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
      </div>
    );
  }

  if (control.type === "switch") {
    return (
      <div className="flex items-start justify-between gap-3 py-0.5">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor={`param-${control.key}`} className="text-xs font-medium">
              {control.label}
            </Label>
            {isModified && (
              <button
                type="button"
                onClick={reset}
                aria-label={`Reset ${control.label} to the preset value`}
                className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <RotateCcw className="size-3" aria-hidden />
              </button>
            )}
          </div>
          {control.hint && (
            <p className="text-2xs leading-snug text-muted-foreground">{control.hint}</p>
          )}
        </div>
        <Switch
          id={`param-${control.key}`}
          checked={!!value}
          onCheckedChange={(v) => onChange(control.key, v)}
        />
      </div>
    );
  }

  return null;
}
