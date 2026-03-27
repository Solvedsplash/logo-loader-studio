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

function getPathData(svgText) {
  try {
    // To get accurate path lengths, the SVG must be part of the rendered DOM.
    const measureContainer = document.createElement('div');
    measureContainer.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden;top:-9999px;';
    measureContainer.innerHTML = svgText;
    document.body.appendChild(measureContainer);

    const svgEl = measureContainer.querySelector('svg');
    if (!svgEl) {
      document.body.removeChild(measureContainer);
      return [];
    }

    const paths = svgEl.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
    const data = Array.from(paths).map(node => {
      let d = "";
      if (node.tagName === "path") d = node.getAttribute("d");
      else if (node.tagName === "rect") {
        const x = parseFloat(node.getAttribute("x") || 0), 
              y = parseFloat(node.getAttribute("y") || 0), 
              w = parseFloat(node.getAttribute("width")), 
              h = parseFloat(node.getAttribute("height"));
        d = `M${x} ${y}h${w}v${h}h-${w}z`;
      } else if (node.tagName === "circle") {
        const cx = parseFloat(node.getAttribute("cx")), 
              cy = parseFloat(node.getAttribute("cy")), 
              r = parseFloat(node.getAttribute("r"));
        d = `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 -${r * 2} 0`;
      }
      
      const length = node.getTotalLength ? node.getTotalLength() : 1000;
      const getAttr = (name) => node.style[name] || node.getAttribute(name);
      
      return {
        d: d || node.getAttribute("d"),
        length,
        color: getAttr("stroke") || getAttr("fill") || "#91f6ff",
        strokeWidth: getAttr("stroke-width") || "2"
      };
    }).filter(p => p.d);

    document.body.removeChild(measureContainer);
    return data;
  } catch (err) {
    console.warn("Path data extraction failed:", err);
    return [];
  }
}

export default function Home() {
  const [selectedAnimationId, setSelectedAnimationId] = useState(DEFAULT_ANIMATION_ID);
  const [statusText, setStatusText] = useState("Ready.");

  const initialSvgText = getDefaultLogoText();
  const [logoImg, setLogoImg] = useState(null);
  const [logoSvgText, setLogoSvgText] = useState("");
  const [svgPathData, setSvgPathData] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFps, setExportFps] = useState(30);
  
  const canvasRef = useRef(null);

  // Load Logo Image
  useEffect(() => {
    const img = new Image();
    const svgText = logoSvgText || initialSvgText;
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      setLogoImg(img);
      setSvgPathData(getPathData(svgText));
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [logoSvgText, initialSvgText]);

  const selectedAnimation = useMemo(() => {
    return ANIMATIONS.find((a) => a.id === selectedAnimationId) ?? ANIMATIONS[0];
  }, [selectedAnimationId]);

  // Main UI Animation Loop (Canvas Version)
  useEffect(() => {
    if (!canvasRef.current || !logoImg) return;

    const ctx = canvasRef.current.getContext("2d");
    let start = performance.now();
    let raf;

    const loop = (now) => {
      const elapsed = now - start;
      const duration = selectedAnimation.duration;
      const progress = (elapsed % duration) / duration;

      renderFrame(ctx, progress, logoImg, selectedAnimation, svgPathData);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    setStatusText(`Applied ${selectedAnimation.name}.`);

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [selectedAnimation, logoImg, svgPathData]);

  const onLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        setLogoSvgText(text);
        setStatusText(`Logo imported: ${file.name} (Canvas-synthesized HD active)`);
      };
      reader.readAsText(file);
    } else {
      setStatusText(`Error: Please import an SVG logo for the canvas engine.`);
    }
  };

  const onSurprise = () => {
    const id = 1 + Math.floor(Math.random() * TOTAL_ANIMATIONS);
    setSelectedAnimationId(id);
  };

  const exportGif = async () => {
    try {
      setIsExporting(true);
      setStatusText("Synthesizing pixel-perfect frames on server...");

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animId: selectedAnimation.id,
          logoSvgText: logoSvgText || initialSvgText,
          duration: selectedAnimation.duration,
          fps: exportFps
        })
      });

      if (!response.ok) throw new Error("Server synthesis failed.");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logo-loader-${selectedAnimation.id}.gif`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatusText("Studio-grade GIF exported successfully!");
    } catch (err) {
      console.error(err);
      setStatusText("Failed to synthesize GIF from server.");
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
        <div className="preview-root">
          <canvas
            ref={canvasRef}
            width={440}
            height={440}
            className="logo-canvas"
            style={{ width: '220px', height: '220px' }}
          />
        </div>
      </section>
    </main>
  );
}
