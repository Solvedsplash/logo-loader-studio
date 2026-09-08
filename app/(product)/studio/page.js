"use client";

import { useCallback, useMemo, useState } from "react";
import { Layers, Settings2, Download, Loader2 } from "lucide-react";

import { TopBar } from "@/components/studio/top-bar";
import { Stage } from "@/components/studio/stage";
import { PresetLibrary } from "@/components/studio/preset-library";
import { Inspector } from "@/components/studio/inspector";
import { ExportPanel } from "@/components/studio/export-panel";
import { ExportButton } from "@/components/studio/export-button";
import { LogoImport } from "@/components/studio/logo-import";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { useLogo } from "@/hooks/use-logo";
import { useExport } from "@/hooks/use-export";
import { getPreset, resolveAnimation, DEFAULT_PRESET_ID } from "@/lib/presets";
import { cn } from "@/lib/utils";

// Families whose visual identity lives in strokes or decorations rather than in
// the logo's own transform — these lose their effect when exported to Lottie.
const DECORATED_FAMILIES = new Set([
  "path-draw", "rings", "orbit", "shimmer", "wipe",
]);

const DEFAULT_EXPORT = {
  format: "webm",
  size: 420,
  fps: 30,
  quality: "high",
};

function Studio() {
  const logo = useLogo();
  const exporter = useExport();

  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [overrides, setOverrides] = useState({});
  const [background, setBackground] = useState({ mode: "transparent", color: "#0b0b12" });
  const [exportSettings, setExportSettings] = useState(DEFAULT_EXPORT);
  const [showChecker, setShowChecker] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const preset = useMemo(() => getPreset(presetId), [presetId]);

  // The one place the background is decided. Everything downstream — preview,
  // thumbnails, all five export paths — reads it from the resolved animation, so
  // what you see on the stage is exactly what gets encoded.
  const backgroundColor = background.mode === "transparent" ? null : background.color;

  const animation = useMemo(
    () => resolveAnimation(preset, overrides, backgroundColor),
    [preset, overrides, backgroundColor]
  );

  // Switching preset drops the old preset's parameter edits (they would be
  // meaningless against a different family) but keeps playback speed.
  const selectPreset = useCallback((id) => {
    setPresetId(id);
    setOverrides((prev) => (prev.speed ? { speed: prev.speed } : {}));
  }, []);

  const handleParamChange = useCallback((key, value) => {
    setOverrides((prev) => ({ ...prev, params: { ...(prev.params ?? {}), [key]: value } }));
  }, []);

  const handleTimingChange = useCallback((key, value) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetOverrides = useCallback(() => {
    setOverrides((prev) => (prev.speed ? { speed: prev.speed } : {}));
  }, []);

  const handleExport = useCallback(() => {
    exporter.run({
      animation,
      svgText: logo.svgText,
      logoImg: logo.image,
      paths: logo.paths,
      settings: exportSettings,
    });
  }, [exporter, animation, logo.svgText, logo.image, logo.paths, exportSettings]);

  const exportPanelSettings = {
    ...exportSettings,
    familyIsDecorated: DECORATED_FAMILIES.has(preset.family),
  };

  const leftPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <LogoImport
        fileName={logo.fileName}
        isRaster={logo.isRaster}
        pathCount={logo.paths.length}
        error={logo.error}
        onFile={logo.loadFile}
        onReset={logo.reset}
      />
      <Separator />
      <div className="min-h-0 flex-1">
        <PresetLibrary
          selectedId={presetId}
          onSelect={selectPreset}
          logoImg={logo.image}
          paths={logo.paths}
        />
      </div>
    </div>
  );

  // The inspector owns the full panel height; export lives in the toolbar.
  const rightPanel = (
    <Inspector
      preset={preset}
      overrides={overrides}
      onParamChange={handleParamChange}
      onTimingChange={handleTimingChange}
      onResetAll={resetOverrides}
      background={background}
      onBackgroundChange={setBackground}
    />
  );

  const exportControl = (
    <ExportButton
      settings={exportPanelSettings}
      onChange={setExportSettings}
      onExport={handleExport}
      isExporting={exporter.isExporting}
      progress={exporter.progress}
      status={exporter.status}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar
        onToggleLeft={() => setLeftOpen((v) => !v)}
        onToggleRight={() => setRightOpen((v) => !v)}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
      >
        {exportControl}
      </TopBar>

      <div className="flex min-h-0 flex-1">
        {/* Presets — a sidebar on desktop, a sheet on small screens. */}
        <aside
          className={cn(
            "panel hidden shrink-0 border-r lg:flex lg:flex-col",
            leftOpen ? "w-[300px] xl:w-[336px]" : "w-0 overflow-hidden border-r-0"
          )}
        >
          {leftOpen && leftPanel}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <Stage
            animation={animation}
            logoImg={logo.image}
            paths={logo.paths}
            showChecker={showChecker}
            onToggleChecker={() => setShowChecker((v) => !v)}
          />
        </main>

        <aside
          className={cn(
            "panel hidden shrink-0 border-l lg:flex lg:flex-col",
            rightOpen ? "w-[300px] xl:w-[336px]" : "w-0 overflow-hidden border-l-0"
          )}
        >
          {rightOpen && rightPanel}
        </aside>
      </div>

      {/* Compact layout: the same two panels, reachable from a bottom bar.
          Bottom placement keeps them in thumb reach on a phone. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card p-2 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 gap-2" size="sm">
              <Layers className="size-4" aria-hidden />
              Presets
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[82dvh] p-0">
            <SheetTitle className="sr-only">Preset library</SheetTitle>
            <ScrollArea className="h-full">{leftPanel}</ScrollArea>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 gap-2" size="sm">
              <Settings2 className="size-4" aria-hidden />
              Settings
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[82dvh] p-0">
            <SheetTitle className="sr-only">Animation settings</SheetTitle>
            <div className="h-full">{rightPanel}</div>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button className="flex-1 gap-2" size="sm" disabled={exporter.isExporting}>
              {exporter.isExporting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              Export
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0">
            <SheetTitle className="sr-only">Export options</SheetTitle>
            <ExportPanel
              settings={exportPanelSettings}
              onChange={setExportSettings}
              onExport={handleExport}
              isExporting={exporter.isExporting}
              progress={exporter.progress}
              status={exporter.status}
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default function StudioPage() {
  return <Studio />;
}
