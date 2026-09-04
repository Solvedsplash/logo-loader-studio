"use client";

import { Download, Loader2, FileJson, Video, Film, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const FORMATS = [
  {
    id: "webm",
    label: "WebM",
    icon: Video,
    blurb: "Video with full alpha. Best quality for the web.",
  },
  {
    id: "gif",
    label: "GIF",
    icon: Film,
    blurb: "Universally supported. 256 colours, hard-edged transparency.",
  },
  {
    id: "json",
    label: "Lottie",
    icon: FileJson,
    blurb: "Vector JSON. Tiny files, but no stroke or decoration effects.",
  },
];

const SIZES = [256, 320, 420, 512, 640, 800, 1080];

export function ExportPanel({ settings, onChange, onExport, isExporting, progress, status }) {
  const set = (key, value) => onChange({ ...settings, [key]: value });
  const active = FORMATS.find((f) => f.id === settings.format) ?? FORMATS[0];

  const lottieLossy = settings.format === "json" && settings.familyIsDecorated;

  return (
    <div className="space-y-3 p-3">
      {/* Format picker — Apple card-button grid */}
      <div>
        <Label className="mb-2 block section-label">Format</Label>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Export format">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            const isActive = settings.format === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => set("format", f.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all duration-100",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary shadow-e1"
                    : "border-border/60 text-muted-foreground hover:border-border-strong hover:text-foreground hover:bg-black/3 dark:hover:bg-white/4"
                )}
              >
                <Icon className="size-4" aria-hidden />
                {f.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-2xs leading-snug text-muted-foreground">{active.blurb}</p>
      </div>

      {lottieLossy && (
        <p className="flex gap-1.5 rounded-xl border border-warning/25 bg-warning/8 p-2.5 text-2xs leading-snug text-foreground">
          <AlertCircle className="mt-px size-3 shrink-0 text-warning" aria-hidden />
          <span>
            This preset uses strokes or decorations that Lottie can't represent.
            Only the logo's movement and fade will be exported — pick WebM or GIF
            to keep the full effect.
          </span>
        </p>
      )}

      <Separator className="opacity-60" />

      {/* Settings rows — iOS Settings-row style */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="export-size" className="text-xs font-semibold">Size</Label>
          <Select value={String(settings.size)} onValueChange={(v) => set("size", Number(v))}>
            <SelectTrigger id="export-size" size="sm" className="w-full rounded-lg border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>{s} × {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="export-fps" className="text-xs font-semibold">Frame rate</Label>
          <Select value={String(settings.fps)} onValueChange={(v) => set("fps", Number(v))}>
            <SelectTrigger id="export-fps" size="sm" className="w-full rounded-lg border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(settings.format === "gif" ? [12, 15, 20, 25, 30] : [24, 30, 50, 60]).map((f) => (
                <SelectItem key={f} value={String(f)}>{f} fps</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {settings.format !== "json" && (
        <div className="space-y-1.5">
          <Label htmlFor="export-quality" className="text-xs font-semibold">Quality</Label>
          <Select value={settings.quality} onValueChange={(v) => set("quality", v)}>
            <SelectTrigger id="export-quality" size="sm" className="w-full rounded-lg border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low — smallest file</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High — recommended</SelectItem>
              <SelectItem value="ultra">Ultra — lossless</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Export button — Apple blue */}
      <Button
        onClick={onExport}
        disabled={isExporting}
        className="w-full gap-2 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-white"
        size="default"
      >
        {isExporting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {progress > 0 ? `Exporting ${Math.round(progress * 100)}%` : "Exporting…"}
          </>
        ) : (
          <>
            <Download className="size-4" aria-hidden />
            Export {active.label}
          </>
        )}
      </Button>

      {/* Progress bar */}
      {isExporting && (
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Export progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${Math.max(2, progress * 100)}%` }}
          />
        </div>
      )}

      {status && (
        <p
          role="status"
          className={cn(
            "text-2xs leading-snug",
            status.type === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
