"use client";

import { useRef, useState } from "react";
import { Upload, X, FileImage, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = ".svg,.png,.jpg,.jpeg,.webp";

/**
 * Logo drop zone. SVG is strongly preferred because path-drawing presets need
 * real vector geometry to trace — a raster logo has no paths to draw, which the
 * component says plainly rather than silently degrading.
 */
export function LogoImport({ fileName, isRaster, pathCount, error, onFile, onReset }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="p-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative rounded-xl border border-dashed p-4 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-muted/40"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          className="sr-only"
          id="logo-file-input"
        />

        {fileName ? (
          <div className="flex items-center gap-2 text-left">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileImage className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{fileName}</p>
              <p className="text-2xs text-muted-foreground">
                {isRaster
                  ? "Raster image — no paths to trace"
                  : `${pathCount} ${pathCount === 1 ? "path" : "paths"} detected`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={onReset}
              aria-label="Remove logo and restore the default"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-1.5 size-5 text-muted-foreground" aria-hidden />
            <label
              htmlFor="logo-file-input"
              className="cursor-pointer text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Choose a logo
            </label>
            <span className="text-xs text-muted-foreground"> or drag it here</span>
            <p className="mt-0.5 text-2xs text-muted-foreground">
              SVG recommended · PNG, JPG, WebP supported
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 flex gap-1.5 text-2xs leading-snug text-destructive" role="alert">
          <AlertCircle className="mt-px size-3 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {fileName && isRaster && (
        <p className="mt-2 flex gap-1.5 text-2xs leading-snug text-muted-foreground">
          <AlertCircle className="mt-px size-3 shrink-0 text-warning" aria-hidden />
          Path-drawing presets need vector artwork. Upload an SVG to use them.
        </p>
      )}
    </div>
  );
}
