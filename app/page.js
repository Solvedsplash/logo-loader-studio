"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ANIMATIONS, TOTAL_ANIMATIONS } from './animations';
import CoreEngine from '../lib/core-engine';
import { generateLottieJson } from '../lib/lottie-exporter';
import { exportToWebM } from '../lib/webm-exporter';
import { exportToGif } from '../lib/gif-exporter';
import SplashCursor from './SplashCursor';

const DEFAULT_ANIMATION_ID = 1;

/* ── Helpers ────────────────────────────────────────────────── */
function getDefaultLogoText() {
  return "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0%' stop-color='#7b68ee'/><stop offset='100%' stop-color='#9b8fff'/>" +
    "</linearGradient></defs>" +
    "<circle cx='110' cy='110' r='90' fill='url(#g)'/>" +
    "<path d='M78 114l22 22 42-50' stroke='#fff' stroke-width='16' fill='none' stroke-linecap='round' stroke-linejoin='round'/>" +
    "</svg>";
}

function shapeToPathD(node) {
  const tag = node.tagName.toLowerCase();
  if (tag === 'path') return node.getAttribute('d') || '';
  if (tag === 'rect') {
    const x = parseFloat(node.getAttribute('x') || '0');
    const y = parseFloat(node.getAttribute('y') || '0');
    const w = parseFloat(node.getAttribute('width') || '0');
    const h = parseFloat(node.getAttribute('height') || '0');
    return `M${x},${y}H${x + w}V${y + h}H${x}Z`;
  }
  if (tag === 'circle') {
    const cx = parseFloat(node.getAttribute('cx') || '0');
    const cy = parseFloat(node.getAttribute('cy') || '0');
    const r = parseFloat(node.getAttribute('r') || '0');
    return `M${cx - r},${cy}A${r},${r},0,1,0,${cx + r},${cy}A${r},${r},0,1,0,${cx - r},${cy}Z`;
  }
  if (tag === 'ellipse') {
    const cx = parseFloat(node.getAttribute('cx') || '0');
    const cy = parseFloat(node.getAttribute('cy') || '0');
    const rx = parseFloat(node.getAttribute('rx') || '0');
    const ry = parseFloat(node.getAttribute('ry') || '0');
    return `M${cx - rx},${cy}A${rx},${ry},0,1,0,${cx + rx},${cy}A${rx},${ry},0,1,0,${cx - rx},${cy}Z`;
  }
  if (tag === 'line') {
    const x1 = parseFloat(node.getAttribute('x1') || '0');
    const y1 = parseFloat(node.getAttribute('y1') || '0');
    const x2 = parseFloat(node.getAttribute('x2') || '0');
    const y2 = parseFloat(node.getAttribute('y2') || '0');
    return `M${x1},${y1}L${x2},${y2}`;
  }
  if (tag === 'polyline' || tag === 'polygon') {
    const raw = (node.getAttribute('points') || '').trim();
    if (!raw) return '';
    const pts = raw.replace(/,/g, ' ').split(/\s+/).map(Number);
    if (pts.length < 4) return '';
    let d = `M${pts[0]},${pts[1]}`;
    for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]},${pts[i + 1]}`;
    if (tag === 'polygon') d += 'Z';
    return d;
  }
  return '';
}

function normalizeSvg(svgText) {
  try {
    let svg = (svgText || '').trim();
    const hasW = /<svg[^>]+\bwidth\s*=\s*["'][\d]/.test(svg);
    const hasH = /<svg[^>]+\bheight\s*=\s*["'][\d]/.test(svg);
    if (hasW && hasH) return svg;
    const vb = svg.match(/viewBox\s*=\s*["']([^"']+)["']/);
    if (vb) {
      const parts = vb[1].trim().split(/[\s,]+/).map(Number);
      const vw = parts[2] || 220, vh = parts[3] || 220;
      svg = svg.replace(/(<svg)(\s|>)/, `$1 width="${vw}" height="${vh}"$2`);
    } else {
      svg = svg.replace(/(<svg)(\s|>)/, '$1 width="220" height="220" viewBox="0 0 220 220"$2');
    }
    return svg;
  } catch { return svgText; }
}

function getPathData(svgText) {
  try {
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden;top:-9999px;';
    div.innerHTML = normalizeSvg(svgText);
    document.body.appendChild(div);
    const svgEl = div.querySelector('svg');
    if (!svgEl) { document.body.removeChild(div); return []; }
    const nodes = svgEl.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon');
    const data = Array.from(nodes).map(node => {
      const d = shapeToPathD(node);
      const length = node.getTotalLength ? node.getTotalLength() : 1000;
      const cs = window.getComputedStyle(node);
      const stroke = (cs.stroke && cs.stroke !== 'none') ? cs.stroke : (node.getAttribute('stroke') || '');
      const fill = (cs.fill && cs.fill !== 'none') ? cs.fill : (node.getAttribute('fill') || '');
      return { d, length, color: stroke || fill || '#9b8fff', strokeWidth: cs.strokeWidth || node.getAttribute('stroke-width') || '2' };
    }).filter(p => Boolean(p.d));
    document.body.removeChild(div);
    return data;
  } catch (err) { console.warn('Path data failed:', err); return []; }
}

/* ── Settings defaults ────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  fps: 30,
  format: 'json',
  quality: 'high',
  bgMode: 'transparent',
  bgColor: '#000000',
  size: 420,
  speed: 1,
};

/* ─────────────────────────────────────────────────────────── */
export default function Home() {
  const [theme, setTheme] = useState('dark');
  const [selectedAnimationId, setSelectedAnimationId] = useState(DEFAULT_ANIMATION_ID);
  const [logoSvgText, setLogoSvgText] = useState('');
  const [logoImg, setLogoImg] = useState(null);
  const [svgPathData, setSvgPathData] = useState([]);
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [showTransparentGrid, setShowTransparentGrid] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [logoFileName, setLogoFileName] = useState('');

  // Mobile UI state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [bottomSheetTab, setBottomSheetTab] = useState('styles'); // 'styles' | 'settings'
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Feedback state
  const [userVote, setUserVote] = useState(null); // 'like' | 'dislike' | null
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);

  const handleVote = (type) => {
    if (userVote === type) return; // already voted
    if (userVote === 'like') setLikeCount(c => c - 1);
    if (userVote === 'dislike') setDislikeCount(c => c - 1);
    if (type === 'like') setLikeCount(c => c + 1);
    if (type === 'dislike') setDislikeCount(c => c + 1);
    setUserVote(type);
  };

  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const initialSvg = useMemo(() => getDefaultLogoText(), []);

  /* Apply theme to html element */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /* Load logo image */
  useEffect(() => {
    const svg = logoSvgText || initialSvg;
    const blob = new Blob([normalizeSvg(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { setLogoImg(img); setSvgPathData(getPathData(svg)); };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [logoSvgText, initialSvg]);

  const selectedAnimation = useMemo(() => {
    const anim = ANIMATIONS.find(a => a.id === selectedAnimationId) ?? ANIMATIONS[0];
    return {
      ...anim,
      duration: anim.duration / settings.speed
    };
  }, [selectedAnimationId, settings.speed]);

  /* Animation loop */
  useEffect(() => {
    if (!canvasRef.current || !logoImg) return;
    const ctx = canvasRef.current.getContext('2d');
    let start = performance.now();
    const loop = (now) => {
      const elapsed = now - start;
      const progress = (elapsed % selectedAnimation.duration) / selectedAnimation.duration;
      const state = CoreEngine.getFrameState(progress, selectedAnimation, svgPathData);
      CoreEngine.renderStateToCanvas(ctx, state, logoImg);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [selectedAnimation, logoImg, svgPathData]);

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoSvgText(String(reader.result || ''));
        setLogoFileName(file.name);
        setStatusText(`Loaded: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };

  const handleLogoRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoSvgText('');
    setLogoFileName('');
    setStatusText('Ready');
  };

  const handleStyleClick = (anim) => {
    setSelectedAnimationId(anim.id);
    setIsGenerating(true);
    setStatusText(`Applying ${anim.name}...`);
    setTimeout(() => {
      setIsGenerating(false);
      setStatusText(`${anim.name} applied.`);
    }, 800);
    // Close bottom sheet on selection if in mobile
    if (window.innerWidth <= 1024) {
      setIsBottomSheetOpen(false);
    }
  };


  const setSetting = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleExport = useCallback(async (formatOverride) => {
    const { fps, quality, bgMode, bgColor, size } = settings;
    const format = formatOverride ?? settings.format;

    // ── JSON export (unchanged) ───────────────────────────────────
    if (format === 'json') {
      try {
        setIsExporting(true);
        setStatusText('Generating Lottie JSON...');
        const svg = logoSvgText || initialSvg;
        const b64 = btoa(unescape(encodeURIComponent(normalizeSvg(svg))));
        const dataUri = `data:image/svg+xml;base64,${b64}`;
        const jsonStr = generateLottieJson(selectedAnimation, dataUri, svgPathData, fps);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `loader-${selectedAnimation.id}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        setStatusText('Lottie JSON exported!');
      } catch {
        setStatusText('JSON export failed.');
      } finally { setIsExporting(false); }
      return;
    }

    // ── GIF export (High-quality 2-pass FFmpeg server, with client fallback) ──
    if (format === 'gif') {
      const matteColor = bgMode === 'transparent' ? '#ffffff' : bgColor;
      setIsExporting(true);
      const svg = logoSvgText || initialSvg;

      // 1. Try high-quality server export (FFmpeg 2-pass palettegen + paletteuse)
      try {
        setStatusText('Generating High-Quality GIF (server)...');
        const response = await fetch('/api/export-gif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            animId: selectedAnimation.id,
            logoSvgText: svg,
            fps,
            backgroundColor: matteColor,
            quality,
            size,
            speed: settings.speed,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `loader-${selectedAnimation.id}.gif`;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
          setStatusText(`HQ GIF exported! (${(blob.size / 1024).toFixed(0)} KB)`);
          setIsExporting(false);
          return;
        }
      } catch (e) {
        console.warn('[GIF Export] Server render failed, switching to client export:', e);
      }

      // 2. Client-side fallback via gifenc
      try {
        setStatusText('Generating GIF (client)...');
        const speedSafe = Math.max(0.1, Number(settings.speed) || 1);
        const animWithSpeed = {
          ...selectedAnimation,
          duration: selectedAnimation.duration / speedSafe,
        };

        const blob = await exportToGif({
          CoreEngine,
          animation: animWithSpeed,
          logoImg,
          svgPathsData: svgPathData,
          fps,
          quality,
          backgroundColor: matteColor,
          size,
          onProgress: (p) => setStatusText(`Generating GIF (${Math.round(p * 100)}%)...`),
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loader-${selectedAnimation.id}.gif`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);

        setStatusText(`GIF exported! (${(blob.size / 1024).toFixed(0)} KB)`);
      } catch (err) {
        console.error('[Export] GIF error:', err);
        setStatusText(`GIF export failed: ${err.message}`);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    // ── WebM export (High-quality VP9 server, with client fallback) ──
    const backgroundColor = bgMode === 'transparent' ? null : bgColor;
    const speedSafe = Math.max(0.1, Number(settings.speed) || 1);
    const animWithSpeed = {
      ...selectedAnimation,
      duration: selectedAnimation.duration / speedSafe,
    };
    setIsExporting(true);
    const svg = logoSvgText || initialSvg;

    // 1. Try high-quality server export (FFmpeg VP9 yuva420p)
    try {
      setStatusText('Generating High-Quality WebM (server)...');
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animId: selectedAnimation.id,
          logoSvgText: svg,
          fps,
          backgroundColor,
          quality,
          size,
          speed: settings.speed,
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loader-${selectedAnimation.id}.webm`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        setStatusText(`HQ WebM exported! (${(blob.size / 1024).toFixed(0)} KB)`);
        setIsExporting(false);
        return;
      }
    } catch (e) {
      console.warn('[WebM Export] Server render failed, switching to client export:', e);
    }

    // 2. Client-side fallback via WebCodecs
    try {
      setStatusText('Generating WebM (client)...');
      const effectiveBg = bgMode === 'transparent' ? '#000000' : bgColor;
      const blob = await exportToWebM({
        CoreEngine,
        animation: animWithSpeed,
        logoImg,
        svgPathsData: svgPathData,
        fps,
        quality,
        backgroundColor: effectiveBg,
        size,
        onProgress: (p) => setStatusText(`Generating WebM (${Math.round(p * 100)}%)...`),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loader-${selectedAnimation.id}.webm`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);

      setStatusText(`WebM exported! (${(blob.size / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error('[Export] WebM error:', err);
      setStatusText(`WebM export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [settings, logoImg, logoSvgText, initialSvg, selectedAnimation, svgPathData]);

  const triggerExport = (format) => {
    setSetting('format', format);
    setIsExportDropdownOpen(false);
    // Pass format directly to avoid stale closure capturing old settings.format
    handleExport(format);
  };


  const visibleAnimations = showAllStyles ? ANIMATIONS : ANIMATIONS.slice(0, 2);

  return (
    <div className="app-shell">
      <SplashCursor RAINBOW_MODE={false} COLOR="#8b5cf6" COLOR_MULTIPLIER={0.005} DENSITY_DISSIPATION={2} VELOCITY_DISSIPATION={1.5} />
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-icon">✦</div>
          <span className="brand-name">Logo Loader Studio</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ position: 'relative' }}>
            <button
              className="export-btn-top"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={isExporting}
            >
              {isExporting ? <span className="spin">⟳</span> : "Export"}
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>
            <div className={`export-dropdown ${isExportDropdownOpen ? 'open' : ''}`}>
              <button className="export-option" onClick={() => triggerExport('json')}>
                <span>📄</span> Lottie JSON
              </button>
              <button className="export-option" onClick={() => triggerExport('webm')}>
                <span>🎥</span> WebM Video
              </button>
              <button className="export-option" onClick={() => triggerExport('gif')}>
                <span>🎞</span> Animated GIF
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* LEFT PANEL: Import + Settings */}
        <aside className="side-panel">
          <div className="section-header"><span className="section-title">Logo</span></div>
          <div className={`import-zone ${logoFileName ? 'has-file' : ''}`}>
            <input type="file" accept=".svg" onChange={onLogoChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', zIndex: 1 }} />
            {logoFileName ? (
              <>
                <span className="import-icon">✓</span>
                <div className="import-label">
                  <strong className="import-filename">{logoFileName}</strong>
                  <span className="import-hint">SVG loaded</span>
                </div>
                <button
                  className="import-remove-btn"
                  onClick={handleLogoRemove}
                  title="Remove file"
                  style={{ zIndex: 2 }}
                >×</button>
              </>
            ) : (
              <>
                <span className="import-icon">⬆</span>
                <div className="import-label"><strong>Import SVG</strong></div>
              </>
            )}
          </div>

          <div className="section-divider" />
          <div className="section-header"><span className="section-title">Settings</span></div>
          <div className="settings-group">
            <div className="setting-row">
              <span className="setting-label">Animation Speed</span>
              <select className="setting-select" value={settings.speed} onChange={e => setSetting('speed', parseFloat(e.target.value))}>
                <option value={0.5}>0.5x — Slow</option>
                <option value={1}>1.0x — Normal</option>
                <option value={1.5}>1.5x — Fast</option>
                <option value={2}>2.0x — Ultra Fast</option>
              </select>
            </div>
            <div className="setting-row">
              <span className="setting-label">Format</span>
              <div className="segment-control" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <button className={`segment-btn ${settings.format === 'json' ? 'active' : ''}`} onClick={() => setSetting('format', 'json')}>JSON</button>
                <button className={`segment-btn ${settings.format === 'webm' ? 'active' : ''}`} onClick={() => setSetting('format', 'webm')}>WebM</button>
                <button className={`segment-btn ${settings.format === 'gif' ? 'active' : ''}`} onClick={() => setSetting('format', 'gif')}>GIF</button>
              </div>
            </div>
            <div className="setting-row">
              <span className="setting-label">FPS</span>
              <select className="setting-select" value={settings.fps} onChange={e => setSetting('fps', Number(e.target.value))}>
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </div>
            <div className="setting-row">
              <span className="setting-label">Background</span>
              <div className="segment-control">
                <button className={`segment-btn ${settings.bgMode === 'transparent' ? 'active' : ''}`} onClick={() => setSetting('bgMode', 'transparent')}>Alpha</button>
                <button className={`segment-btn ${settings.bgMode === 'color' ? 'active' : ''}`} onClick={() => setSetting('bgMode', 'color')}>Color</button>
              </div>
              {settings.bgMode === 'color' && (
                <input type="color" className="setting-select" style={{ padding: 0, height: 32 }} value={settings.bgColor} onChange={e => setSetting('bgColor', e.target.value)} />
              )}
            </div>
            {settings.format === 'gif' && settings.bgMode === 'transparent' && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 0', lineHeight: 1.4 }}>
                GIF has no real transparency — will export on a white matte.
              </div>
            )}
            {(settings.format === 'webm' || settings.format === 'gif') && (
              <div className="setting-row">
                <span className="setting-label">Quality</span>
                <select className="setting-select" value={settings.quality} onChange={e => setSetting('quality', e.target.value)}>
                  <option value="low">Low — 1 Mbps</option>
                  <option value="medium">Medium — 3 Mbps</option>
                  <option value="high">High — 8 Mbps</option>
                  <option value="ultra">Ultra — 16 Mbps</option>
                </select>
              </div>
            )}
          </div>
        </aside>

        <main className="canvas-area">

          {/* Desktop-only: Ready badge at top of canvas, 16px from top */}
          <div className="status-bar desktop-status">
            <span className="status-dot" />{statusText}
          </div>

          {/* Mobile/Tablet-only: Status + Import above canvas */}
          <div className="canvas-top-bar">
            <div className="status-bar mobile-status-center">
              <span className="status-dot" />{statusText}
            </div>
            <div className={`import-zone mobile-canvas-import ${logoFileName ? 'has-file' : ''}`}>
              <input type="file" accept=".svg" onChange={onLogoChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', zIndex: 1 }} />
              {logoFileName ? (
                <>
                  <span className="import-icon">✓</span>
                  <div className="import-label">
                    <strong className="import-filename">{logoFileName}</strong>
                    <span className="import-hint">SVG loaded</span>
                  </div>
                  <button
                    className="import-remove-btn"
                    onClick={handleLogoRemove}
                    title="Remove file"
                    style={{ zIndex: 2 }}
                  >×</button>
                </>
              ) : (
                <>
                  <span className="import-icon">⬆</span>
                  <div className="import-label"><strong>Import SVG</strong></div>
                </>
              )}
            </div>
          </div>

          <div className={`canvas-wrapper ${showTransparentGrid ? 'transparent-grid' : ''}`}>
            <canvas ref={canvasRef} width={720} height={720} className="logo-canvas" />
          </div>
          <div className="bottom-control-bar">
            <div className="control-group-hug">
              <button className={`canvas-toolbar-btn ${showTransparentGrid ? 'active' : ''}`} onClick={() => setShowTransparentGrid(!showTransparentGrid)}>
                ⊞ Alpha
              </button>
              <div className="control-divider-v" />
              <span className="style-name-hug">{selectedAnimation.name}</span>
            </div>

            <div className="feedback-bar-inner">
              <span className="feedback-text-compact">Like?</span>
              <div className="feedback-actions">
                <button className={`feedback-btn like ${userVote === 'like' ? 'active' : ''}`} onClick={() => handleVote('like')}>
                  👍 {likeCount.toLocaleString()}
                </button>
                <button className={`feedback-btn dislike ${userVote === 'dislike' ? 'active' : ''}`} onClick={() => handleVote('dislike')}>
                  👎 {dislikeCount.toLocaleString()}
                </button>
              </div>
            </div>
          </div>
        </main>


        {/* RIGHT PANEL: Styles (Animations) */}
        <aside className="right-panel">
          <div className="section-header"><span className="section-title">Styles</span></div>
          <div className="style-grid">
            {visibleAnimations.map(anim => (
              <button
                key={anim.id}
                className={`style-card ${selectedAnimationId === anim.id ? 'selected' : ''}`}
                onClick={() => handleStyleClick(anim)}
              >
                <span className="style-card-icon">✧</span>
                <span className="style-card-label">{anim.name}</span>
              </button>
            ))}
          </div>
          <button className="show-more-btn" onClick={() => setShowAllStyles(!showAllStyles)}>
            {showAllStyles ? '↑ Show Less' : `↓ Show All (${ANIMATIONS.length})`}
          </button>
        </aside>
      </div>

      {/* Mobile Floating Actions */}
      <div className="floating-actions">
        <button className="fab-btn" onClick={() => { setBottomSheetTab('styles'); setIsBottomSheetOpen(true); }}>
          <span>✨</span> Styles
        </button>
        <button className="fab-btn icon-only" onClick={() => { setBottomSheetTab('settings'); setIsBottomSheetOpen(true); }}>
          <span>⚙️</span>
        </button>
      </div>

      {/* Bottom Sheet */}
      <div className={`bottom-sheet-overlay ${isBottomSheetOpen ? 'open' : ''}`} onClick={() => setIsBottomSheetOpen(false)} />
      <div className={`bottom-sheet ${isBottomSheetOpen ? 'open' : ''}`}>
        <div className="sheet-handle" />
        <div className="sheet-content">
          <div className="section-header">
            <span className="section-title">{bottomSheetTab === 'styles' ? 'Choose Style' : 'Settings'}</span>
          </div>

          {bottomSheetTab === 'styles' ? (
            <div className="style-grid">
              {ANIMATIONS.map(anim => (
                <button
                  key={anim.id}
                  className={`style-card ${selectedAnimationId === anim.id ? 'selected' : ''}`}
                  onClick={() => handleStyleClick(anim)}
                >
                  <span className="style-card-icon">✧</span>
                  <span className="style-card-label">{anim.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="settings-group">

              <div className="setting-row">
                <span className="setting-label">Animation Speed</span>
                <select className="setting-select" value={settings.speed} onChange={e => setSetting('speed', parseFloat(e.target.value))}>
                  <option value={0.5}>0.5x — Slow</option>
                  <option value={1}>1.0x — Normal</option>
                  <option value={1.5}>1.5x — Fast</option>
                  <option value={2}>2.0x — Ultra Fast</option>
                </select>
              </div>
              <div className="setting-row">
                <span className="setting-label">Format</span>
                <div className="segment-control" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <button className={`segment-btn ${settings.format === 'json' ? 'active' : ''}`} onClick={() => setSetting('format', 'json')}>JSON</button>
                  <button className={`segment-btn ${settings.format === 'webm' ? 'active' : ''}`} onClick={() => setSetting('format', 'webm')}>WebM</button>
                  <button className={`segment-btn ${settings.format === 'gif' ? 'active' : ''}`} onClick={() => setSetting('format', 'gif')}>GIF</button>
                </div>
              </div>
              <div className="setting-row">
                <span className="setting-label">FPS</span>
                <select className="setting-select" value={settings.fps} onChange={e => setSetting('fps', Number(e.target.value))}>
                  <option value={24}>24 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>
              <div className="setting-row">
                <span className="setting-label">Background</span>
                <div className="segment-control">
                  <button className={`segment-btn ${settings.bgMode === 'transparent' ? 'active' : ''}`} onClick={() => setSetting('bgMode', 'transparent')}>Alpha</button>
                  <button className={`segment-btn ${settings.bgMode === 'color' ? 'active' : ''}`} onClick={() => setSetting('bgMode', 'color')}>Color</button>
                </div>
                {settings.bgMode === 'color' && (
                  <input type="color" className="setting-select" style={{ padding: 0, height: 32 }} value={settings.bgColor} onChange={e => setSetting('bgColor', e.target.value)} />
                )}
              </div>
              {settings.format === 'gif' && settings.bgMode === 'transparent' && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 0', lineHeight: 1.4 }}>
                  GIF has no real transparency — will export on a white matte.
                </div>
              )}
              {(settings.format === 'webm' || settings.format === 'gif') && (
                <div className="setting-row">
                  <span className="setting-label">Quality</span>
                  <select className="setting-select" value={settings.quality} onChange={e => setSetting('quality', e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
