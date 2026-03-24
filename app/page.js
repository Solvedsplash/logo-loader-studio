"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import GIF from "gif.js";

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

const TOTAL_ANIMATIONS = ANIMATIONS.length;
const DEFAULT_ANIMATION_ID = 1;

function processSvgInnerHtml(svgText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    if (doc.querySelector("parsererror")) return null;
    
    const root = doc.querySelector("svg");
    if (!root) return null;

    const getEffectiveColor = (el) => {
      let current = el;
      while (current && current.tagName !== 'svg') {
        const fill = current.getAttribute("fill");
        const stroke = current.getAttribute("stroke");
        const candidate = current.style?.fill || fill || current.style?.stroke || stroke;
        if (candidate && candidate !== "none" && candidate !== "transparent" && candidate !== "currentColor") {
          return candidate;
        }
        current = current.parentElement;
      }
      return "rgba(145, 246, 255, 0.9)";
    };

    const shapes = root.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
    shapes.forEach(node => {
      const color = getEffectiveColor(node);
      node.setAttribute("stroke", color);
      node.setAttribute("fill", "none");
      node.setAttribute("pathLength", "1");
      if (node.style) {
        node.style.fill = 'none';
        node.style.stroke = color;
        node.style.strokeWidth = '';
      }
      node.setAttribute("class", "drawing-shape");
      node.removeAttribute("stroke-width");
    });

    const groups = root.querySelectorAll("g");
    groups.forEach(g => {
      g.removeAttribute("fill");
      g.removeAttribute("stroke");
      if (g.style) {
        g.style.fill = 'none';
        g.style.stroke = 'none';
      }
    });

    return root.innerHTML;
  } catch {
    return null;
  }
}

function extractSvgViewBox(svgText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    if (doc.querySelector("parsererror")) return "0 0 220 220";
    const root = doc.querySelector("svg");
    return root?.getAttribute("viewBox") || "0 0 220 220";
  } catch {
    return "0 0 220 220";
  }
}

function getDefaultLogo() {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0%' stop-color='#6f89ff'/><stop offset='100%' stop-color='#91f6ff'/>" +
    "</linearGradient></defs>" +
    "<circle cx='110' cy='110' r='90' fill='url(#g)'/>" +
    "<path d='M78 114l22 22 42-50' stroke='#0f1220' stroke-width='16' fill='none' stroke-linecap='round' stroke-linejoin='round'/>" +
    "</svg>";
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function Home() {
  const [selectedAnimationId, setSelectedAnimationId] = useState(DEFAULT_ANIMATION_ID);
  const [statusText, setStatusText] = useState("Ready.");
  const [logoSrc, setLogoSrc] = useState(getDefaultLogo());
  const [logoHtml, setLogoHtml] = useState("<path d='M40 120 Q85 45 130 120 T185 120' pathLength='1' class='drawing-shape' stroke='rgba(145, 246, 255, 0.9)' fill='none' stroke-linecap='round' stroke-linejoin='round' />");
  const [logoViewBox, setLogoViewBox] = useState("0 0 220 220");
  const [isExporting, setIsExporting] = useState(false);
  const logoRef = useRef(null);
  const previewRootRef = useRef(null);

  const selectedAnimation = useMemo(() => {
    return ANIMATIONS.find((a) => a.id === selectedAnimationId) ?? ANIMATIONS[0];
  }, [selectedAnimationId]);
  const isPathDraw = selectedAnimation.family === "path-draw";

  useEffect(() => {
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
    setStatusText(`Applied ${selectedAnimation.name}.`);
  }, [selectedAnimation]);

  useEffect(() => {
    return () => {
      if (logoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(logoSrc);
      }
    };
  }, [logoSrc]);

  const onLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setLogoSrc((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const html = processSvgInnerHtml(text);
        if (html && html.includes("class=\"drawing-shape\"")) {
          setLogoHtml(html);
          setLogoViewBox(extractSvgViewBox(text));
          setStatusText(`Logo imported: ${file.name} (path drawing enabled)`);
        } else {
          setLogoHtml("<path d='M40 120 Q85 45 130 120 T185 120' pathLength='1' class='drawing-shape' stroke='rgba(145, 246, 255, 0.9)' fill='none' stroke-linecap='round' stroke-linejoin='round' />");
          setLogoViewBox("0 0 220 220");
          setStatusText(`Logo imported: ${file.name} (no robust SVG shapes found)`);
        }
      };
      reader.onerror = () => {
        setLogoHtml("<path d='M40 120 Q85 45 130 120 T185 120' pathLength='1' class='drawing-shape' stroke='rgba(145, 246, 255, 0.9)' fill='none' stroke-linecap='round' stroke-linejoin='round' />");
        setLogoViewBox("0 0 220 220");
        setStatusText(`Logo imported: ${file.name}`);
      };
      reader.readAsText(file);
      return;
    }

    setLogoHtml("<path d='M40 120 Q85 45 130 120 T185 120' pathLength='1' class='drawing-shape' stroke='rgba(145, 246, 255, 0.9)' fill='none' stroke-linecap='round' stroke-linejoin='round' />");
    setLogoViewBox("0 0 220 220");
    setStatusText(`Logo imported: ${file.name} (path drawing works best with SVG logos)`);
  };

  const onSurprise = () => {
    const id = 1 + Math.floor(Math.random() * TOTAL_ANIMATIONS);
    setSelectedAnimationId(id);
  };

  const exportGif = async () => {
    try {
      setIsExporting(true);
      setStatusText("Rendering high-quality GIF on server... This may take up to 10 seconds.");

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animId: selectedAnimation.id,
          viewBox: logoViewBox,
          logoHtml: logoHtml,
          logoSrc: logoSrc,
          duration: selectedAnimation.duration
        })
      });

      if (!response.ok) {
        throw new Error("Server rendering failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logo-loader-${selectedAnimation.id}.gif`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatusText("GIF exported successfully!");
    } catch (err) {
      console.error(err);
      setStatusText("Failed to export GIF from server.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="app">
      <header className="header">
        <h1>Logo Loader Studio</h1>
        <p>Minimal logo loading motions inspired by modern app loaders.</p>
      </header>

      <section className="panel controls">
        <label className="control">
          <span>Import logo</span>
          <input type="file" accept="image/*" onChange={onLogoChange} />
        </label>

        <label className="control">
          <span>Animation ({TOTAL_ANIMATIONS} curated presets, 3 variants each)</span>
          <select
            value={selectedAnimationId}
            onChange={(e) => setSelectedAnimationId(Number(e.target.value || "1"))}
          >
            {ANIMATIONS.map((animation) => (
              <option key={animation.id} value={animation.id}>
                {`${String(animation.id).padStart(3, "0")} - ${animation.name}`}
              </option>
            ))}
          </select>
        </label>

        <div className="row">
          <button type="button" onClick={onSurprise}>
            Surprise Me
          </button>
          <button type="button" onClick={exportGif} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export GIF"}
          </button>
        </div>
        <p className="status">{statusText}</p>
      </section>

      <section className="panel preview-panel">
        <div ref={previewRootRef} className={`preview-root ${isPathDraw ? "is-path-draw" : ""}`}>
          <div className="logo-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={logoRef}
              src={logoSrc}
              className={`logo motion-${selectedAnimation.family}`}
              alt="Your logo preview"
            />
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
      </section>
    </main>
  );
}
