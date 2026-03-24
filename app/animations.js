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
  { family: "fade-in-out", label: "Fade In/Out", easing: "ease-in-out" }
];

export const ANIMATIONS = FAMILY_CONFIG.flatMap((cfg, familyIndex) => {
  return Array.from({ length: 3 }, (_, variantIndex) => {
    const id = familyIndex * 3 + variantIndex + 1;
    const duration = (cfg.family === "path-draw" ? 3200 : 1200) + variantIndex * 300;
    const intensity = 1 + variantIndex;
    return {
      id,
      name: `${cfg.label} ${String(variantIndex + 1).padStart(2, "0")}`,
      family: cfg.family,
      easing: cfg.easing,
      duration,
      vars: {
        "--amp-y": `${6 + intensity * 3}px`,
        "--amp-x": `${5 + intensity * 3}px`,
        "--fade-min": `${(0.24 + variantIndex * 0.08).toFixed(2)}`,
        "--scale-min": `${(0.93 - variantIndex * 0.02).toFixed(2)}`,
        "--scale-max": `${(1.04 + variantIndex * 0.03).toFixed(2)}`,
        "--rotate-deg": `${3 + intensity * 1.5}deg`,
        "--blur-max": `${(0.8 + variantIndex * 0.7).toFixed(2)}px`,
        "--particle-offset": `${28 + intensity * 8}px`,
        "--particle-size": `${3 + intensity}px`,
        "--particle-opacity": `${(0.55 + variantIndex * 0.12).toFixed(2)}`,
        "--draw-width": `${1.2 + variantIndex * 0.4}px`
      }
    };
  });
});

export const TOTAL_ANIMATIONS = ANIMATIONS.length;
