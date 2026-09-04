"use client";

import { useState } from "react";
import { Download, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExportPanel } from "./export-panel";
import { cn } from "@/lib/utils";

/**
 * Export lives in the toolbar rather than the inspector: it is the app's primary
 * action, and keeping it out of the side panel gives the whole panel height to
 * the parameters, which is what the user is actually adjusting most of the time.
 */
export function ExportButton({ settings, onChange, onExport, isExporting, progress, status, compact }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-stretch rounded-xl overflow-hidden shadow-e1">
      {/* Primary action — Apple-style blue button */}
      <Button
        onClick={onExport}
        disabled={isExporting}
        size={compact ? "sm" : "default"}
        className={cn(
          "gap-2 rounded-r-none pr-3 font-semibold",
          "bg-primary hover:bg-primary/90 text-white",
          "transition-opacity duration-100",
          isExporting && "opacity-80"
        )}
      >
        {isExporting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {progress > 0 ? `${Math.round(progress * 100)}%` : "Exporting…"}
          </>
        ) : (
          <>
            <Download className="size-4" aria-hidden />
            Export
          </>
        )}
      </Button>

      {/* Chevron — options popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size={compact ? "sm" : "default"}
            disabled={isExporting}
            aria-label="Export options"
            className={cn(
              "rounded-l-none border-l border-white/20 px-2",
              "bg-primary hover:bg-primary/90 text-white",
            )}
          >
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0 rounded-xl overflow-hidden shadow-e3 border-border/60">
          <ExportPanel
            settings={settings}
            onChange={onChange}
            onExport={() => { setOpen(false); onExport(); }}
            isExporting={isExporting}
            progress={progress}
            status={status}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
