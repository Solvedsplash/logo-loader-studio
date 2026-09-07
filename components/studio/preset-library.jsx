"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Search, X, Check } from "lucide-react";
import { PRESETS, PRESETS_BY_GROUP, GROUPS, needsVector } from "@/lib/presets";
import { PresetThumb } from "./preset-thumb";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const TAG_STYLES = {
  Signature: "bg-primary/15 text-primary border-primary/25",
  Popular: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  New: "bg-chart-3/15 text-chart-3 border-chart-3/25",
};

function PresetCard({ preset, selected, logoImg, paths, onSelect, unavailable }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(preset.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-pressed={selected}
      // Kept selectable rather than disabled: HIG asks that people be told *why*
      // something can't work, and a disabled control can't carry that message.
      title={unavailable ? "Needs vector artwork — upload an SVG to trace paths" : undefined}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected
          ? "border-primary bg-primary/5 shadow-e2"
          : "border-border bg-card hover:border-foreground/20 hover:shadow-e2",
        unavailable && !selected && "opacity-45"
      )}
    >
      <div className="checkerboard relative aspect-square w-full overflow-hidden">
        <PresetThumb
          preset={preset}
          logoImg={logoImg}
          paths={paths}
          active={hovered || selected}
        />
        {selected && (
          <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-e1">
            <Check className="size-3" strokeWidth={3} aria-hidden />
          </span>
        )}
        {preset.tag && !selected && (
          <span
            className={cn(
              "absolute left-1.5 top-1.5 rounded-full border px-1.5 py-px text-2xs font-medium backdrop-blur-sm",
              TAG_STYLES[preset.tag]
            )}
          >
            {preset.tag}
          </span>
        )}
      </div>
      <span className="flex items-center gap-1 px-2.5 py-2">
        <span className="truncate text-sm font-medium">{preset.name}</span>
        {unavailable && (
          <Icons.Lock className="ml-auto size-3 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </span>
    </button>
  );
}

/**
 * Browsable preset library: a group rail on the left, cards on the right.
 * Search cuts across every group at once.
 */
export function PresetLibrary({ selectedId, onSelect, logoImg, paths, isRaster, columns = 2 }) {
  const [groupId, setGroupId] = useState("ink");
  const [query, setQuery] = useState("");

  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    if (searching) {
      const q = query.trim().toLowerCase();
      return PRESETS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.family.toLowerCase().includes(q) ||
          (p.tag ?? "").toLowerCase().includes(q)
      );
    }
    return PRESETS_BY_GROUP.find((g) => g.id === groupId)?.presets ?? [];
  }, [groupId, query, searching]);

  const activeGroup = GROUPS.find((g) => g.id === groupId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${PRESETS.length} presets…`}
            aria-label="Search presets"
            className="h-8 w-full rounded-sm border border-input bg-background pl-8 pr-7 text-xs placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Group rail */}
      {!searching && (
        <div className="border-b border-border p-2">
          {/* Wrapped rather than horizontally scrolled: seven categories in a
              300px panel would otherwise hide half of them off-screen with no
              affordance that more exist. */}
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Preset categories">
            {PRESETS_BY_GROUP.map((g) => {
              const Icon = Icons[g.icon] ?? Icons.Circle;
              const active = g.id === groupId;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroupId(g.id)}
                  className={cn(
                    // Fully rounded: these are filter chips, and the pill shape
                    // keeps them from reading as a segmented control.
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  {g.name}
                  <span className={cn("tabular text-2xs", active ? "opacity-70" : "opacity-60")}>
                    {g.presets.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cards */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {!searching && activeGroup && (
            <p className="mb-2.5 text-2xs leading-snug text-muted-foreground">
              {activeGroup.blurb}
            </p>
          )}
          {searching && (
            <p className="mb-2.5 text-2xs text-muted-foreground">
              {visible.length} {visible.length === 1 ? "match" : "matches"}
            </p>
          )}

          {visible.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-muted-foreground">No presets match “{query}”.</p>
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {visible.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={preset.id === selectedId}
                  logoImg={logoImg}
                  paths={paths}
                  onSelect={onSelect}
                  unavailable={isRaster && needsVector(preset)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
