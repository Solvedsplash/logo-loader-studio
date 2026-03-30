// Shared animation config — importable by both client components and server API routes

const FAMILY_CONFIG = [
  { family: "notion-fade", label: "Notion Fade", easing: "ease-in-out" },
  { family: "linear-breathe", label: "Linear Breathe", easing: "ease-in-out" },
  { family: "vercel-float", label: "Vercel Float", easing: "cubic-bezier(0.4,0,0.2,1)" },
  { family: "stripe-slide", label: "Stripe Slide", easing: "cubic-bezier(0.4,0,0.2,1)" },
  { family: "github-zoom", label: "GitHub Zoom Fade", easing: "ease-in-out" },
  { family: "framer-blur", label: "Framer Blur Fade", easing: "ease-in-out" },
  { family: "figma-tilt", label: "Figma Tilt", easing: "ease-in-out" },
  { family: "slack-spin", label: "Slack Soft Spin", easing: "linear" },
  { family: "airtable-drift", label: "Airtable Drift", easing: "ease-in-out" },
  { family: "intercom-pop", label: "Intercom Pop Pulse", easing: "cubic-bezier(0.2,0.7,0.2,1)" },
  { family: "dropbox-reveal", label: "Dropbox Reveal", easing: "cubic-bezier(0.4,0,0.2,1)" },
  { family: "asana-sweep", label: "Asana Sweep", easing: "ease-in-out" },
  { family: "shopify-soft-bounce", label: "Shopify Soft Bounce", easing: "cubic-bezier(0.2,0.8,0.2,1)" },
  { family: "monday-blink", label: "Monday Blink", easing: "ease-in-out" },
  { family: "loom-settle", label: "Loom Settle", easing: "cubic-bezier(0.22,1,0.36,1)" },
  { family: "canva-glide", label: "Canva Glide", easing: "ease-in-out" },
  { family: "path-draw", label: "Path Drawing", easing: "ease-in-out" },
  { family: "particle-burst", label: "Particle Burst", easing: "ease-in-out" },
  { family: "scale-pulse", label: "Scale Pulse", easing: "cubic-bezier(0.2,0.7,0.2,1)" },
  { family: "fade-in-out", label: "Fade In/Out", easing: "ease-in-out" },
  { family: "pro-morph", label: "Pro Liquid Morph", easing: "cubic-bezier(0.4,0,0.2,1)" }
];

export const ANIMATIONS = FAMILY_CONFIG.map((cfg, index) => {
  const id = index + 1;
  const duration = (cfg.family === "path-draw" ? 3200 : 1200);
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
