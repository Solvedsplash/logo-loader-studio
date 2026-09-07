"use client";

import { useEffect } from "react";

/**
 * Global keyboard shortcuts.
 *
 * HIG (desktop): frequent actions should have keyboard equivalents. Bindings
 * follow the conventions people already know from media and design tools —
 * Space toggles playback, arrows scrub, ⌘/Ctrl+E exports.
 *
 * Shortcuts are suppressed while a text field or contenteditable has focus, so
 * typing in the search box never triggers playback.
 */
export function useShortcuts(handlers) {
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const tag = el?.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable;

      const mod = e.metaKey || e.ctrlKey;

      // ⌘E / Ctrl+E — export. Allowed even while typing, because it is an
      // explicit modifier chord and cannot be produced by ordinary typing.
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handlers.onExport?.();
        return;
      }

      if (typing || e.altKey) return;

      // Arrow keys already scrub a focused slider; only take over when focus is
      // not on one, so the native control keeps its own behaviour.
      const onSlider = el?.getAttribute?.("data-slot") === "slider-thumb";

      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          handlers.onTogglePlay?.();
          break;
        case "ArrowLeft":
          if (onSlider) return;
          e.preventDefault();
          handlers.onStep?.(e.shiftKey ? -0.05 : -0.01);
          break;
        case "ArrowRight":
          if (onSlider) return;
          e.preventDefault();
          handlers.onStep?.(e.shiftKey ? 0.05 : 0.01);
          break;
        case "Home":
          e.preventDefault();
          handlers.onRestart?.();
          break;
        case "[":
          e.preventDefault();
          handlers.onToggleLeft?.();
          break;
        case "]":
          e.preventDefault();
          handlers.onToggleRight?.();
          break;
        case "/":
          e.preventDefault();
          handlers.onFocusSearch?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
