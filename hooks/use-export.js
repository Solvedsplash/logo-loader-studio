"use client";

import { useCallback, useRef, useState } from "react";
import CoreEngine from "@/lib/core-engine";
import SvgPaths from "@/lib/svg-paths";
import { generateLottieJson } from "@/lib/lottie-exporter";
import { exportToWebM } from "@/lib/webm-exporter";
import { exportToFfmpegWebM } from "@/lib/ffmpeg-webm-exporter";
import { exportToGif } from "@/lib/gif-exporter";

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick — revoking synchronously can cancel the download
  // in some browsers before it has started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** base64 for arbitrary UTF-8, replacing the deprecated unescape/escape trick. */
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Drives every export path.
 *
 * The resolved `animation` object — background included — is the single input
 * shared by the preview, the client exporters and the server routes, so none of
 * them can disagree about what should be rendered.
 */
export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);
  const busy = useRef(false);

  const run = useCallback(async ({ animation, svgText, logoImg, paths, settings }) => {
    if (busy.current) return;
    busy.current = true;
    setIsExporting(true);
    setProgress(0);
    setStatus({ type: "info", message: "Preparing…" });

    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${animation.presetId || "loader"}-${stamp}`;

    try {
      // ── Lottie ───────────────────────────────────────────────────
      if (settings.format === "json") {
        setStatus({ type: "info", message: "Generating Lottie JSON…" });
        const dataUri = `data:image/svg+xml;base64,${utf8ToBase64(SvgPaths.normalizeSvg(svgText))}`;
        const json = generateLottieJson(animation, dataUri, paths, settings.fps);
        download(new Blob([json], { type: "application/json" }), `${base}.json`);
        setStatus({ type: "info", message: "Lottie JSON downloaded." });
        return;
      }

      // ── GIF ──────────────────────────────────────────────────────
      if (settings.format === "gif") {
        setStatus({ type: "info", message: "Rendering on the server…" });
        try {
          const res = await fetch("/api/export-gif", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              animation,
              logoSvgText: svgText,
              fps: settings.fps,
              size: settings.size,
            }),
          });
          if (res.ok) {
            download(await res.blob(), `${base}.gif`);
            setStatus({ type: "info", message: "GIF downloaded." });
            return;
          }
          // Log rather than silently degrading — a server bug should be visible.
          const detail = await res.json().catch(() => ({}));
          console.warn("[export] Server GIF failed, falling back to browser:", detail.error ?? res.status);
        } catch (e) {
          console.warn("[export] Server GIF unreachable, falling back to browser:", e);
        }

        setStatus({ type: "info", message: "Rendering in your browser…" });
        const blob = await exportToGif({
          CoreEngine,
          animation,
          logoImg,
          svgPathsData: paths,
          fps: settings.fps,
          backgroundColor: animation.backgroundColor,
          size: settings.size,
          onProgress: setProgress,
        });
        download(blob, `${base}.gif`);
        setStatus({ type: "info", message: "GIF downloaded." });
        return;
      }

      // ── WebM ─────────────────────────────────────────────────────
      setStatus({ type: "info", message: "Rendering on the server…" });
      try {
        const res = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            animation,
            logoSvgText: svgText,
            fps: settings.fps,
            quality: settings.quality,
            size: settings.size,
          }),
        });
        if (res.ok) {
          download(await res.blob(), `${base}.webm`);
          setStatus({ type: "info", message: "WebM downloaded." });
          return;
        }
        const detail = await res.json().catch(() => ({}));
        console.warn("[export] Server WebM failed, falling back to browser:", detail.error ?? res.status);
      } catch (e) {
        console.warn("[export] Server WebM unreachable, falling back to browser:", e);
      }

      // Transparency decides the fallback: WebCodecs cannot encode VP9 alpha in
      // any shipping browser, so alpha has to go through ffmpeg.wasm.
      if (!animation.backgroundColor) {
        setStatus({ type: "info", message: "Encoding transparent video in your browser…" });
        const blob = await exportToFfmpegWebM({
          CoreEngine,
          animation,
          logoImg,
          svgPathsData: paths,
          fps: settings.fps,
          quality: settings.quality,
          size: settings.size,
          onProgress: setProgress,
        });
        download(blob, `${base}.webm`);
      } else {
        setStatus({ type: "info", message: "Encoding in your browser…" });
        const blob = await exportToWebM({
          CoreEngine,
          animation,
          logoImg,
          svgPathsData: paths,
          fps: settings.fps,
          quality: settings.quality,
          backgroundColor: animation.backgroundColor,
          size: settings.size,
          onProgress: setProgress,
        });
        download(blob, `${base}.webm`);
      }
      setStatus({ type: "info", message: "WebM downloaded." });

    } catch (error) {
      console.error("[export] Failed:", error);
      setStatus({ type: "error", message: error.message || "Export failed." });
    } finally {
      busy.current = false;
      setIsExporting(false);
      setProgress(0);
    }
  }, []);

  return { run, isExporting, progress, status };
}
