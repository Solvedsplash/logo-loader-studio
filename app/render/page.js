"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

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

const ANIMATIONS = FAMILY_CONFIG.flatMap((cfg, familyIndex) => {
  return Array.from({ length: 3 }, (_, variantIndex) => {
    const id = familyIndex * 3 + variantIndex + 1;
    const duration = (cfg.family === "path-draw" ? 2200 : 1200) + variantIndex * 300;
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

export default function RenderPage() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("anim")) || 1;
  const logoViewBox = searchParams.get("viewBox") || "0 0 220 220";
  
  const [logoHtml, setLogoHtml] = useState("");
  const [logoSrc, setLogoSrc] = useState("");
  const [animationStarted, setAnimationStarted] = useState(false);
  
  const logoRef = useRef(null);
  const previewRootRef = useRef(null);
  const selectedAnimation = ANIMATIONS.find((a) => a.id === id) ?? ANIMATIONS[0];
  const isPathDraw = selectedAnimation.family === "path-draw";

  useEffect(() => {
    // Puppeteer will call this when it's ready
    window.loadLogoHtml = (html, src) => {
      setLogoHtml(html);
      setLogoSrc(src);
      setAnimationStarted(true);
      
      requestAnimationFrame(() => {
        const logo = logoRef.current;
        const previewRoot = previewRootRef.current;
        if (!logo || !previewRoot) return;

        Object.entries(selectedAnimation.vars).forEach(([key, value]) => {
          logo.style.setProperty(key, value);
          previewRoot.style.setProperty(key, value);
        });
        
        logo.style.setProperty("--duration", `${selectedAnimation.duration}ms`);
        previewRoot.style.setProperty("--duration", `${selectedAnimation.duration}ms`);
        
        logo.style.animationDuration = `${selectedAnimation.duration}ms`;
        logo.style.animationTimingFunction = selectedAnimation.easing;
        previewRoot.style.animationDuration = `${selectedAnimation.duration}ms`;
        previewRoot.style.animationTimingFunction = selectedAnimation.easing;

        // Tell Puppeteer we are ready to record
        window.animationReady = true;
        window.animationDurationMs = selectedAnimation.duration;
      });
    };
  }, [selectedAnimation]);

  if (!animationStarted) {
    return (
      <div style={{ width: "420px", height: "420px", background: "#1a2244" }}>
        {/* Waiting for Puppeteer... */}
      </div>
    );
  }

  return (
    <div style={{ padding: 0, margin: 0, width: "420px", height: "420px", display: "grid", placeItems: "center" }}>
      <div 
        ref={previewRootRef} 
        className={`preview-root ${isPathDraw ? "is-path-draw" : ""}`}
        style={{ width: "420px", height: "420px", margin: 0, border: "none", borderRadius: 0 }}
      >
        <div className="logo-stage">
          {/* We inject the original logo image and the SVG shapes */}
          {logoSrc && (
            <img 
              ref={logoRef} 
              src={logoSrc} 
              className={`logo motion-${selectedAnimation.family}`} 
              alt="Logo" 
            />
          )}
          <svg 
            className="draw-path" 
            viewBox={logoViewBox} 
            preserveAspectRatio="xMidYMid meet" 
            aria-hidden="true" 
            dangerouslySetInnerHTML={{ __html: logoHtml }}
          />
        </div>
        <div className="particles" aria-hidden="true">
          <span className="particle p1" />
          <span className="particle p2" />
          <span className="particle p3" />
          <span className="particle p4" />
          <span className="particle p5" />
          <span className="particle p6" />
        </div>
      </div>
    </div>
  );
}
