"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ANIMATIONS } from "../page";

export default function RenderPage() {
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

  useEffect(() => {
    if (!drawnLayerRef.current) return;
    const shapes = drawnLayerRef.current.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
    shapes.forEach(shape => {
      try {
        const len = shape.getTotalLength ? shape.getTotalLength() : 1000;
        shape.style.setProperty('--path-len', `${len}px`);
      } catch (e) {}
    });
  }, [logoSvgText]);

  useEffect(() => {
    // Puppeteer calls this function to inject the logo
    window.loadLogoHtml = (svgText) => {
      setLogoSvgText(svgText);
      // Build a proper data URL from the SVG text — blob URLs don't work across browser sessions
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
      setLogoDataUrl(dataUrl);
      setAnimationStarted(true);
    };
  }, []);

  useEffect(() => {
    if (animationStarted && previewRootRef.current) {
      const logo = logoRef.current;
      const previewRoot = previewRootRef.current;

      if (logo) {
        Object.entries(selectedAnimation.vars).forEach(([key, value]) => {
          logo.style.setProperty(key, value);
        });
        logo.style.setProperty("--duration", `${selectedAnimation.duration}ms`);
        logo.style.animationDuration = `${selectedAnimation.duration}ms`;
        logo.style.animationTimingFunction = selectedAnimation.easing;
      }

      if (previewRoot) {
        Object.entries(selectedAnimation.vars).forEach(([key, value]) => {
          previewRoot.style.setProperty(key, value);
        });
        previewRoot.style.setProperty("--duration", `${selectedAnimation.duration}ms`);
        previewRoot.style.animationDuration = `${selectedAnimation.duration}ms`;
        previewRoot.style.animationTimingFunction = selectedAnimation.easing;
      }

      // Tell Puppeteer we are ready to record after CSS parses
      setTimeout(() => {
        window.animationReady = true;
        window.animationDurationMs = selectedAnimation.duration;
      }, 100);
    }
  }, [animationStarted, selectedAnimation]);

  if (!animationStarted) {
    return (
      <div style={{ width: "420px", height: "420px", background: "transparent" }}>
        {/* Waiting for Puppeteer... */}
      </div>
    );
  }

  return (
    <div style={{ padding: 0, margin: 0, width: "420px", height: "420px", display: "grid", placeItems: "center", background: "transparent" }}>
      <div 
        ref={previewRootRef} 
        className={`preview-root ${isPathDraw ? "is-path-draw" : ""}`}
        style={{ width: "420px", height: "420px", margin: 0, border: "none", borderRadius: 0, background: "transparent" }}
      >
        <div className="logo-stage">
          {logoDataUrl && (
            <img 
              ref={logoRef} 
              src={logoDataUrl} 
              className={`logo motion-${selectedAnimation.family}`} 
              alt="Logo" 
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
          <div className="particles" aria-hidden="true" style={{ opacity: 1 }}>
            <span className="particle p1" style={{ animation: "kf-particle-burst var(--duration, 1500ms) ease-out infinite" }} />
            <span className="particle p2" style={{ animation: "kf-particle-burst var(--duration, 1500ms) ease-out infinite", animationDelay: "120ms" }} />
            <span className="particle p3" style={{ animation: "kf-particle-burst var(--duration, 1500ms) ease-out infinite", animationDelay: "220ms" }} />
            <span className="particle p4" style={{ animation: "kf-particle-burst var(--duration, 1500ms) ease-out infinite", animationDelay: "320ms" }} />
            <span className="particle p5" style={{ animation: "kf-particle-burst var(--duration, 1500ms) ease-out infinite", animationDelay: "420ms" }} />
            <span className="particle p6" style={{ animation: "kf-particle-burst var(--duration, 1500ms) ease-out infinite", animationDelay: "520ms" }} />
          </div>
        )}
      </div>
    </div>
  );
}
