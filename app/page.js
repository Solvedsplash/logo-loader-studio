"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ANIMATIONS, TOTAL_ANIMATIONS } from './animations';
const CoreEngine = require('../lib/core-engine');
const { generateLottieJson } = require('../lib/lottie-exporter');

const DEFAULT_ANIMATION_ID = 1;
const INITIAL_EFFECTS_SHOWN = 2;

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
    return `M${x},${y}H${x+w}V${y+h}H${x}Z`;
  }
  if (tag === 'circle') {
    const cx = parseFloat(node.getAttribute('cx') || '0');
    const cy = parseFloat(node.getAttribute('cy') || '0');
    const r  = parseFloat(node.getAttribute('r')  || '0');
    return `M${cx-r},${cy}A${r},${r},0,1,0,${cx+r},${cy}A${r},${r},0,1,0,${cx-r},${cy}Z`;
  }
  if (tag === 'ellipse') {
    const cx = parseFloat(node.getAttribute('cx') || '0');
    const cy = parseFloat(node.getAttribute('cy') || '0');
    const rx = parseFloat(node.getAttribute('rx') || '0');
    const ry = parseFloat(node.getAttribute('ry') || '0');
    return `M${cx-rx},${cy}A${rx},${ry},0,1,0,${cx+rx},${cy}A${rx},${ry},0,1,0,${cx-rx},${cy}Z`;
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
    for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]},${pts[i+1]}`;
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
      const fill   = (cs.fill   && cs.fill   !== 'none') ? cs.fill   : (node.getAttribute('fill')   || '');
      return { d, length, color: stroke || fill || '#9b8fff', strokeWidth: cs.strokeWidth || node.getAttribute('stroke-width') || '2' };
    }).filter(p => Boolean(p.d));
    document.body.removeChild(div);
    return data;
  } catch(err) { console.warn('Path data failed:', err); return []; }
}

/* ── Style presets ────────────────────────────────────────── */
const STYLE_PRESETS = [
  { id: 'notion-fade',    label: 'Notion',   icon: '◐', animId: 1  },
  { id: 'linear-breathe', label: 'Linear',   icon: '◈', animId: 2  },
  { id: 'vercel-float',   label: 'Vercel',   icon: '▲', animId: 3  },
  { id: 'stripe-slide',   label: 'Stripe',   icon: '⌘', animId: 4  },
  { id: 'github-zoom',    label: 'GitHub',   icon: '◉', animId: 5  },
  { id: 'framer-blur',    label: 'Framer',   icon: '✦', animId: 6  },
  { id: 'figma-tilt',     label: 'Figma',    icon: '◇', animId: 7  },
  { id: 'slack-spin',     label: 'Slack',    icon: '⊕', animId: 8  },
  { id: 'intercom-pop',   label: 'Intercom', icon: '●', animId: 10 },
];

/* ── Settings defaults ────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  fps: 30,
  format: 'json',
  quality: 'high',
  bgMode: 'transparent',
  bgColor: '#000000',
  size: 420,
};

/* ─────────────────────────────────────────────────────────── */
export default function Home() {
  const [theme, setTheme] = useState('dark');
  const [selectedAnimationId, setSelectedAnimationId] = useState(DEFAULT_ANIMATION_ID);
  const [logoSvgText, setLogoSvgText] = useState('');
  const [logoImg, setLogoImg] = useState(null);
  const [svgPathData, setSvgPathData] = useState([]);
  const [showAllEffects, setShowAllEffects] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [showTransparentGrid, setShowTransparentGrid] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [logoFileName, setLogoFileName] = useState('');

  const canvasRef = useRef(null);
  const effectsRef = useRef(null);
  const rafRef = useRef(null);

  const initialSvg = useMemo(() => getDefaultLogoText(), []);

  /* Apply theme to html element */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /* System theme detection */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mq.matches ? 'dark' : 'light');
  }, []);

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

  const selectedAnimation = useMemo(() =>
    ANIMATIONS.find(a => a.id === selectedAnimationId) ?? ANIMATIONS[0],
    [selectedAnimationId]
  );

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
    } else {
      setStatusText('Please import an SVG file.');
    }
  };

  const handleEffectClick = (anim) => {
    setSelectedAnimationId(anim.id);
    setIsGenerating(true);
    setStatusText(`Applying ${anim.name}...`);
    setTimeout(() => {
      setIsGenerating(false);
      setStatusText(`${anim.name} applied.`);
    }, 800);
    // If effect is beyond visible area, show all and scroll
    if (!showAllEffects) {
      const idx = ANIMATIONS.findIndex(a => a.id === anim.id);
      if (idx >= INITIAL_EFFECTS_SHOWN) {
        setShowAllEffects(true);
        setTimeout(() => {
          const el = effectsRef.current?.querySelector(`[data-id="${anim.id}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      }
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setStatusText(`Generating ${selectedAnimation.name}...`);
    setTimeout(() => {
      setIsGenerating(false);
      setStatusText(`${selectedAnimation.name} ready.`);
    }, 900);
  };

  const handleStyleCardClick = (preset) => {
    handleEffectClick({ id: preset.animId, name: preset.label });
  };

  const setSetting = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleExport = useCallback(async () => {
    const { format, fps, quality, bgMode, bgColor, size } = settings;
    const backgroundColor = bgMode === 'transparent' ? null : bgColor;

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
      } catch(err) {
        setStatusText('Export failed.');
      } finally { setIsExporting(false); }
      return;
    }

    // WebM
    try {
      setIsExporting(true);
      setStatusText('Rendering WebM frames...');
      const svg = logoSvgText || initialSvg;
      const crfMap = { low: 28, medium: 22, high: 18, ultra: 12 };
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animId: selectedAnimation.id,
          logoSvgText: svg,
          duration: selectedAnimation.duration,
          fps,
          backgroundColor,
          quality: crfMap[quality] ?? 18,
          size,
        })
      });
      if (!response.ok) throw new Error('Server error');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `loader-${selectedAnimation.id}.webm`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setStatusText('WebM exported!');
    } catch(err) {
      setStatusText('WebM export failed.');
    } finally { setIsExporting(false); }
  }, [settings, logoSvgText, initialSvg, selectedAnimation, svgPathData]);

  const visibleAnimations = showAllEffects ? ANIMATIONS : ANIMATIONS.slice(0, INITIAL_EFFECTS_SHOWN);

  return (
    <div className="app-shell">
      {/* ── Top Bar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-icon">✦</div>
          <span className="brand-name">Logo Loader Studio</span>
        </div>

        <div className="topbar-actions">
          <button
            id="theme-toggle"
            className="icon-btn"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            id="surprise-btn"
            className="icon-btn"
            onClick={() => {
              const id = 1 + Math.floor(Math.random() * TOTAL_ANIMATIONS);
              setSelectedAnimationId(id);
              setStatusText(`Surprise: ${ANIMATIONS.find(a => a.id === id)?.name}`);
            }}
            title="Surprise me"
          >
            🎲
          </button>

          <button
            id="export-btn-top"
            className="export-btn-top"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <><span className="spin">⟳</span> Exporting…</>
            ) : (
              <>{settings.format === 'json' ? '↓ Lottie JSON' : '↓ WebM'}</>
            )}
          </button>
        </div>
      </header>

      {/* ── Main 3-column layout ── */}
      <div className="main-content">

        {/* ── LEFT PANEL ── */}
        <aside className="side-panel">
          {/* Import */}
          <div className="section-header">
            <span className="section-title">Logo</span>
          </div>

          <label className="import-zone" id="import-logo-zone">
            <input type="file" accept=".svg,image/svg+xml" onChange={onLogoChange} />
            <span className="import-icon">⬆</span>
            <div className="import-label">
              <strong>{logoFileName || 'Import SVG'}</strong>
              {logoFileName ? 'Click to replace' : 'Drop or click to upload'}
            </div>
          </label>

          <div className="section-divider" />

          {/* Effects */}
          <div className="section-header">
            <span className="section-title">Effects</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{TOTAL_ANIMATIONS}</span>
          </div>

          <div className="effects-list" ref={effectsRef}>
            {visibleAnimations.map((anim) => (
              <button
                key={anim.id}
                id={`effect-${anim.id}`}
                data-id={anim.id}
                className={`effect-card${selectedAnimationId === anim.id ? ' active' : ''}`}
                onClick={() => handleEffectClick(anim)}
              >
                <span className="effect-dot" />
                <span className="effect-name">{anim.name}</span>
                {selectedAnimationId === anim.id && (
                  <span className="effect-badge">Active</span>
                )}
              </button>
            ))}
          </div>

          <button
            id="show-more-btn"
            className="show-more-btn"
            onClick={() => setShowAllEffects(v => !v)}
          >
            {showAllEffects
              ? '↑ Show less'
              : `↓ Show ${ANIMATIONS.length - INITIAL_EFFECTS_SHOWN} more`}
          </button>

          <button
            id="generate-btn"
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><span className="spin">⟳</span> Generating…</>
            ) : (
              <>✦ Generate</>
            )}
          </button>
        </aside>

        {/* ── CENTER: Canvas ── */}
        <main className="canvas-area">
          <div className="status-bar">
            <span className="status-dot" />
            {statusText}
          </div>

          <div className={`canvas-wrapper${showTransparentGrid ? ' transparent-grid' : ''}`}>
            <canvas
              ref={canvasRef}
              width={720}
              height={720}
              className="logo-canvas"
            />
          </div>

          <div className="canvas-toolbar">
            <button
              className={`canvas-toolbar-btn${showTransparentGrid ? ' active' : ''}`}
              onClick={() => setShowTransparentGrid(v => !v)}
              title="Toggle transparency grid"
            >
              ⊞ Alpha
            </button>
            <span className="canvas-toolbar-divider" />
            <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '0 6px' }}>
              {selectedAnimation.name}
            </span>
            <span className="canvas-toolbar-divider" />
            <button
              className="canvas-toolbar-btn"
              onClick={handleGenerate}
            >
              {isGenerating ? <span className="spin">⟳</span> : '▶'} Preview
            </button>
          </div>
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside className="right-panel">
          {/* Styles */}
          <div className="section-header">
            <span className="section-title">Styles</span>
          </div>

          <div className="style-grid">
            {STYLE_PRESETS.map(preset => (
              <button
                key={preset.id}
                id={`style-${preset.id}`}
                className={`style-card${selectedAnimationId === preset.animId ? ' selected' : ''}`}
                onClick={() => handleStyleCardClick(preset)}
                title={preset.label}
              >
                <span className="style-card-icon">{preset.icon}</span>
                <span className="style-card-label">{preset.label}</span>
              </button>
            ))}
          </div>

          <div className="section-divider" />

          {/* Settings */}
          <div className="section-header">
            <span className="section-title">Settings</span>
          </div>

          <div className="settings-group">
            {/* Format */}
            <div className="setting-row">
              <span className="setting-label">Export Format</span>
              <div className="segment-control">
                <button
                  className={`segment-btn${settings.format === 'json' ? ' active' : ''}`}
                  onClick={() => setSetting('format', 'json')}
                >
                  Lottie JSON
                </button>
                <button
                  className={`segment-btn${settings.format === 'webm' ? ' active' : ''}`}
                  onClick={() => setSetting('format', 'webm')}
                >
                  WebM
                </button>
              </div>
            </div>

            {/* FPS */}
            <div className="setting-row">
              <span className="setting-label">Frame Rate</span>
              <select
                id="fps-select"
                className="setting-select"
                value={settings.fps}
                onChange={e => setSetting('fps', Number(e.target.value))}
              >
                <option value={24}>24 FPS — Cinematic</option>
                <option value={30}>30 FPS — Standard</option>
                <option value={40}>40 FPS — Smooth</option>
                <option value={50}>50 FPS — Ultra</option>
                <option value={60}>60 FPS — Pro Studio</option>
              </select>
            </div>

            {/* Quality (WebM only) */}
            {settings.format === 'webm' && (
              <div className="setting-row">
                <span className="setting-label">Quality</span>
                <select
                  id="quality-select"
                  className="setting-select"
                  value={settings.quality}
                  onChange={e => setSetting('quality', e.target.value)}
                >
                  <option value="low">Low — Smaller file</option>
                  <option value="medium">Medium — Balanced</option>
                  <option value="high">High — Recommended</option>
                  <option value="ultra">Ultra — Largest file</option>
                </select>
              </div>
            )}

            {/* Size (WebM only) */}
            {settings.format === 'webm' && (
              <div className="setting-row">
                <span className="setting-label">Output Size</span>
                <select
                  id="size-select"
                  className="setting-select"
                  value={settings.size}
                  onChange={e => setSetting('size', Number(e.target.value))}
                >
                  <option value={200}>200 × 200 px</option>
                  <option value={300}>300 × 300 px</option>
                  <option value={420}>420 × 420 px</option>
                  <option value={600}>600 × 600 px</option>
                  <option value={800}>800 × 800 px</option>
                </select>
              </div>
            )}

            {/* Background */}
            <div className="setting-row">
              <span className="setting-label">Background</span>
              <div className="segment-control">
                <button
                  className={`segment-btn${settings.bgMode === 'transparent' ? ' active' : ''}`}
                  onClick={() => setSetting('bgMode', 'transparent')}
                >
                  Transparent
                </button>
                <button
                  className={`segment-btn${settings.bgMode === 'color' ? ' active' : ''}`}
                  onClick={() => setSetting('bgMode', 'color')}
                >
                  Color
                </button>
              </div>
              {settings.bgMode === 'color' && (
                <div className="color-row" style={{ marginTop: 6 }}>
                  <div className="color-preview">
                    <input
                      type="color"
                      className="color-input-hidden"
                      value={settings.bgColor}
                      onChange={e => setSetting('bgColor', e.target.value)}
                    />
                    <div style={{ background: settings.bgColor, inset: 0, position: 'absolute' }} />
                  </div>
                  <span className="color-label-text">{settings.bgColor.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Alpha grid preview toggle */}
            <div className="toggle-row">
              <span className="toggle-label">Show transparency grid</span>
              <div
                className={`toggle-switch${showTransparentGrid ? ' on' : ''}`}
                onClick={() => setShowTransparentGrid(v => !v)}
              >
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>

          <div className="section-divider" />

          {/* Export action area at bottom */}
          <div style={{ padding: '14px', marginTop: 'auto' }}>
            <button
              id="export-btn-panel"
              className="generate-btn"
              style={{ margin: 0, width: '100%' }}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <><span className="spin">⟳</span> Exporting…</>
              ) : settings.format === 'json' ? (
                '↓ Export Lottie JSON'
              ) : (
                '↓ Export WebM'
              )}
            </button>
            <p style={{ marginTop: 8, fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
              {settings.fps} FPS · {settings.format.toUpperCase()}
              {settings.format === 'webm' ? ` · ${settings.quality} quality · ${settings.size}px` : ''}
              {settings.bgMode === 'transparent' ? ' · Alpha' : ` · ${settings.bgColor}`}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
