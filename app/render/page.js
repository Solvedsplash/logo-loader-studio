"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ANIMATIONS } from "../animations";
import { renderFrame } from "../../lib/animation-engine";

function RenderPageContent() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("anim")) || 1;
  const [logoSvgText, setLogoSvgText] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [animationStarted, setAnimationStarted] = useState(false);
  
  const logoRef = useRef(null);
  const previewRootRef = useRef(null);
  const drawnLayerRef = useRef(null);
  
  const selectedAnimation = ANIMATIONS.find((a) => a.id === id) ?? ANIMATIONS[0];
  const isPathDraw = selectedAnimation.family === "path-draw";
  const isParticleBurst = selectedAnimation.family === "particle-burst";

  // Pre-calculate path lengths for the engine
  useEffect(() => {
    if (!drawnLayerRef.current) return;
    const shapes = drawnLayerRef.current.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
    shapes.forEach(shape => {
      try {
        shape._pathLen = shape.getTotalLength ? shape.getTotalLength() : 1000;
        // Also set as CSS variable for convenience if needed by other components
        shape.style.setProperty('--path-len', `${shape._pathLen}px`);
      } catch (e) {}
    });
  }, [logoSvgText]);

  useEffect(() => {
    // Puppeteer calls this function to inject the logo
    window.loadLogoHtml = (svgText) => {
      setLogoSvgText(svgText);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
      setLogoDataUrl(dataUrl);
      setAnimationStarted(true);
    };
  }, []);

  // Centralized Animation Loop
  useEffect(() => {
    if (!animationStarted || !logoRef.current) return;

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

    // Expose to window for Puppeteer frame-by-frame capture
    window.renderFrame = (t) => {
      const paths = drawnLayerRef.current 
        ? drawnLayerRef.current.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon") 
        : null;
      const particles = previewRootRef.current 
        ? previewRootRef.current.querySelectorAll(".particle") 
        : null;
      renderFrame(t, { logo: logoRef.current, paths, particles }, selectedAnimation);
    };

    raf = requestAnimationFrame(loop);

    // Tell Puppeteer we are ready
    window.animationReady = true;
    window.animationDurationMs = selectedAnimation.duration;

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [animationStarted, selectedAnimation]);

  if (!animationStarted) {
    return (
      <div style={{ width: "420px", height: "420px", background: "transparent" }}>
      </div>
    );
  }

  return (
    <div style={{ padding: 0, margin: 0, width: "420px", height: "420px", display: "grid", placeItems: "center", background: "transparent" }}>
      <div 
        ref={previewRootRef} 
        className="preview-root"
        style={{ width: "420px", height: "420px", margin: 0, border: "none", borderRadius: 0, background: "transparent" }}
      >
        <div className="logo-stage">
          {logoDataUrl && (
            <img 
              ref={logoRef} 
              src={logoDataUrl} 
              className="logo" 
              alt="Logo" 
              style={{ background: "transparent" }}
            />
          )}
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
    </div>
  );
}

export default function RenderPage() {
  return (
    <Suspense>
      <RenderPageContent />
    </Suspense>
  );
}
