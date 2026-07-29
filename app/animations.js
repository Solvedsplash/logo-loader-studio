// Shared animation config — importable by both client components and server API routes

const FAMILY_CONFIG = [
  { family: "soft-breathe", label: "Soft Breathe", easing: "ease-in-out" },
  { family: "gentle-pulse", label: "Gentle Pulse", easing: "ease-in-out" },
  { family: "bob-float", label: "Bob Float", easing: "cubic-bezier(0.4,0,0.2,1)" },
  { family: "vertical-slide", label: "Vertical Slide", easing: "cubic-bezier(0.4,0,0.2,1)" },
  { family: "zoom-fade", label: "Zoom Fade", easing: "ease-in-out" },
  { family: "blur-dissolve", label: "Blur Dissolve", easing: "ease-in-out" },
  { family: "tilt-sway", label: "Tilt Sway", easing: "ease-in-out" },
  { family: "soft-spin", label: "Soft Spin", easing: "linear" },
  { family: "horizontal-drift", label: "Horizontal Drift", easing: "ease-in-out" },
  { family: "elastic-pop", label: "Elastic Pop", easing: "cubic-bezier(0.2,0.7,0.2,1)" },
  { family: "rise-reveal", label: "Rise Reveal", easing: "cubic-bezier(0.4,0,0.2,1)" },
  { family: "lateral-sweep", label: "Lateral Sweep", easing: "ease-in-out" },
  { family: "spring-bounce", label: "Spring Bounce", easing: "cubic-bezier(0.2,0.8,0.2,1)" },
  { family: "strobe-blink", label: "Strobe Blink", easing: "ease-in-out" },
  { family: "drop-settle", label: "Drop Settle", easing: "cubic-bezier(0.22,1,0.36,1)" },
  { family: "diagonal-glide", label: "Diagonal Glide", easing: "ease-in-out" },
  { family: "path-draw", label: "Path Drawing", easing: "ease-in-out" },
  { family: "scale-pulse", label: "Scale Pulse", easing: "cubic-bezier(0.2,0.7,0.2,1)" },
  { family: "fade-in-out", label: "Fade In/Out", easing: "ease-in-out" }
];

export const ANIMATIONS = FAMILY_CONFIG.map((cfg, index) => {
  const id = index + 1;
  const duration = (cfg.family === "path-draw" ? 3200 : 3000);
  return {
    id,
    name: cfg.label,
    family: cfg.family,
    easing: cfg.easing,
    duration,
    vars: {
      "--amp-y": "12px",
      "--amp-x": "10px",
      "--fade-min": "0.32",
      "--scale-min": "0.91",
      "--scale-max": "1.08",
      "--rotate-deg": "6deg",
      "--blur-max": "1.2px",
      "--particle-offset": "36px",
      "--particle-size": "4px",
      "--particle-opacity": "0.65",
      "--draw-width": "1.5px"
    }
  };
});

export const TOTAL_ANIMATIONS = ANIMATIONS.length;
