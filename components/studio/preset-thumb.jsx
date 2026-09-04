"use client";

import { useEffect, useRef } from "react";
import CoreEngine from "@/lib/core-engine";

/**
 * A miniature live render of a preset, used inside the preset cards.
 *
 * Thumbnails only animate while `active` is true — the library shows dozens of
 * cards at once, and running a requestAnimationFrame loop for every one of them
 * would starve the main preview. The parent turns a card on when it is hovered,
 * focused or selected, and otherwise a single static frame is painted.
 */
export function PresetThumb({ preset, logoImg, paths, active, size = 96 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !logoImg) return;
    const ctx = canvas.getContext("2d");

    const animation = {
      family: preset.family,
      easing: preset.easing,
      direction: "normal",
      duration: preset.duration,
      params: preset.params,
      backgroundColor: null,
    };

    const paint = (progress) => {
      const state = CoreEngine.getFrameState(progress, animation, paths);
      CoreEngine.renderStateToCanvas(ctx, state, logoImg);
    };

    if (!active) {
      // A representative still: far enough in that the logo has arrived.
      paint(0.55);
      return;
    }

    const start = performance.now();
    const loop = (now) => {
      paint(((now - start) % animation.duration) / animation.duration);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [preset, logoImg, paths, active]);

  const px = size * 2; // render at 2× for crisp edges on HiDPI displays

  return (
    <canvas
      ref={canvasRef}
      width={px}
      height={px}
      aria-hidden="true"
      className="size-full"
      style={{ imageRendering: "auto" }}
    />
  );
}
