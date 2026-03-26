"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ANIMATIONS, TOTAL_ANIMATIONS } from './animations';
import { renderFrame } from '../lib/animation-engine';

const DEFAULT_ANIMATION_ID = 1;

function getDefaultLogoText() {
  return "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0%' stop-color='#6f89ff'/><stop offset='100%' stop-color='#91f6ff'/>" +
    "</linearGradient></defs>" +
    "<circle cx='110' cy='110' r='90' fill='url(#g)'/>" +
    "<path d='M78 114l22 22 42-50' stroke='#0f1220' stroke-width='16' fill='none' stroke-linecap='round' stroke-linejoin='round'/>" +
    "</svg>";
}

function processSvgString(svgText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const root = doc.querySelector("svg");
    if (!root) return null;

    if (!root.getAttribute('viewBox')) {
      const w = root.getAttribute('width') || '220';
      const h = root.getAttribute('height') || '220';
      root.setAttribute('viewBox', `0 0 ${w.replace(/[^0-9.]/g, '')} ${h.replace(/[^0-9.]/g, '')}`);
    }
    root.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const getEffectiveColor = (el) => {
      let current = el;
      while (current && current.tagName !== 'svg') {
        const candidate = current.style?.fill || current.getAttribute("fill") || current.style?.stroke || current.getAttribute("stroke");
        if (candidate && candidate !== "none" && candidate !== "transparent" && candidate !== "currentColor") return candidate;
        current = current.parentElement;
      }
      return "rgba(145, 246, 255, 0.9)";
    };

    const getEffectiveStrokeWidth = (el) => {
      let current = el;
      while (current && current.tagName !== 'svg') {
        const sw = current.style?.strokeWidth || current.getAttribute("stroke-width");
        if (sw) return sw;
        current = current.parentElement;
      }
      return "var(--draw-width, 1.5px)";
    };

    const shapes = root.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
    shapes.forEach(node => {
      node.style.setProperty('--computed-color', getEffectiveColor(node));
      node.style.setProperty('--computed-stroke-width', getEffectiveStrokeWidth(node));
    });

    return root.outerHTML;
  } catch {
    return null;
  }
}

export default function Home() {
  const [selectedAnimationId, setSelectedAnimationId] = useState(DEFAULT_ANIMATION_ID);
  const [statusText, setStatusText] = useState("Ready.");

  const initialSvgText = getDefaultLogoText();
  const [logoSrc, setLogoSrc] = useState(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(initialSvgText)}`);
  const [logoSvgText, setLogoSvgText] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportFps, setExportFps] = useState(30);
  
  const logoRef = useRef(null);
  const previewRootRef = useRef(null);
  const drawnLayerRef = useRef(null);

  useEffect(() => {
    setLogoSvgText(processSvgString(initialSvgText) || "");
  }, [initialSvgText]);

  const selectedAnimation = useMemo(() => {
    return ANIMATIONS.find((a) => a.id === selectedAnimationId) ?? ANIMATIONS[0];
  }, [selectedAnimationId]);

  const isPathDraw = selectedAnimation.family === "path-draw";
  const isParticleBurst = selectedAnimation.family === "particle-burst";

  // Pre-calculate path lengths for the engine
  useEffect(() => {
    if (!drawnLayerRef.current) return;
    const shapes = drawnLayerRef.current.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
    shapes.forEach(shape => {
      try {
        shape._pathLen = shape.getTotalLength ? shape.getTotalLength() : 1000;
        shape.style.setProperty('--path-len', `${shape._pathLen}px`);
      } catch (e) { }
    });
  }, [logoSvgText]);

  // Main UI Animation Loop
  useEffect(() => {
    if (!logoRef.current) return;

    let start = performance.now();
    let raf;

    const loop = (now) => {
      const elapsed = now - start;
      const paths = drawnLayerRef.current 
        ? drawnLayerRef.current.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon") 
        : null;
      const particles = previewRootRef.current 
        ? previewRootRef.current.querySelectorAll(".particle") 
        : null;

      renderFrame(elapsed, {
        logo: logoRef.current,
        paths,
        particles
      }, selectedAnimation);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    setStatusText(`Applied ${selectedAnimation.name}.`);

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [selectedAnimation]);

  useEffect(() => {
    return () => {
      if (logoSrc.startsWith("blob:")) URL.revokeObjectURL(logoSrc);
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
        setLogoSvgText(processSvgString(text) || "");
        setStatusText(`Logo imported: ${file.name} (perfect path tracking active)`);
      };
      reader.readAsText(file);
    } else {
      setLogoSvgText("");
      setStatusText(`Logo imported: ${file.name} (SVG required for path drawing)`);
    }
  };

  const onSurprise = () => {
    const id = 1 + Math.floor(Math.random() * TOTAL_ANIMATIONS);
    setSelectedAnimationId(id);
  };

  const exportGif = async () => {
    try {
      setIsExporting(true);
      setStatusText("Rendering pixel-perfect GIF on server... (Processing 60+ HD frames)");

      // Robustly get the logo data (blob leads to 404 on server)
      let finalLogoData = logoSrc;
      if (logoSrc.startsWith('blob:')) {
        const response = await fetch(logoSrc);
        const blob = await response.blob();
        finalLogoData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animId: selectedAnimation.id,
          logoData: finalLogoData,
          logoSvgText: logoSvgText, // Still needed for path drawing
          duration: selectedAnimation.duration,
          fps: exportFps
        })
      });

      if (!response.ok) throw new Error("Server rendering failed.");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logo-loader-${selectedAnimation.id}.gif`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatusText("Pixel-perfect GIF exported successfully!");
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
          <span>Animation ({TOTAL_ANIMATIONS} curated presets)</span>
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

        <label className="control">
          <span>Export Framerate</span>
          <select value={exportFps} onChange={(e) => setExportFps(Number(e.target.value))}>
            <option value={30}>30 FPS (Standard)</option>
            <option value={40}>40 FPS (Smooth)</option>
            <option value={50}>50 FPS (Pro Studio - Perfect Motion)</option>
          </select>
        </label>

        <div className="row">
          <button type="button" onClick={onSurprise}>Surprise Me</button>
          <button className="export-btn" type="button" onClick={exportGif} disabled={isExporting}>
            {isExporting ? "Exporting HD GIF..." : "Export Pro GIF"}
          </button>
        </div>
        <p className="status">{statusText}</p>
      </section>

      <section className="panel preview-panel">
        <div ref={previewRootRef} className="preview-root">
          <div className="logo-stage">
            <img
              ref={logoRef}
              src={logoSrc}
              className="logo"
              alt="Your logo preview"
            />
            {isPathDraw && logoSvgText && (
              <div
                className="drawn-layer"
                aria-hidden="true"
                ref={drawnLayerRef}
                dangerouslySetInnerHTML={{ __html: logoSvgText }}
              />
            )}
          </div>

          {isParticleBurst && (
            <div className="particles" aria-hidden="true">
              <span className="particle p1" />
              <span className="particle p2" />
              <span className="particle p3" />
              <span className="particle p4" />
              <span className="particle p5" />
              <span className="particle p6" />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
