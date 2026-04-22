"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ANIMATIONS, TOTAL_ANIMATIONS } from './animations';
const CoreEngine = require('../lib/core-engine');
const { generateLottieJson } = require('../lib/lottie-exporter');

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

  const handleStyleClick = (anim) => {
    setSelectedAnimationId(anim.id);
    setIsGenerating(true);
    setStatusText(`Applying ${anim.name}...`);
    setTimeout(() => {
      setIsGenerating(false);
      setStatusText(`${anim.name} applied.`);
    }, 800);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setStatusText(`Generating ${selectedAnimation.name}...`);
    setTimeout(() => {
      setIsGenerating(false);
      setStatusText(`${selectedAnimation.name} ready.`);
    }, 900);
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

  const visibleAnimations = showAllStyles ? ANIMATIONS : ANIMATIONS.slice(0, 2);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-icon">✦</div>
          <span className="brand-name">Logo Loader Studio</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="export-btn-top" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <span className="spin">⟳</span> : `Export ${settings.format.toUpperCase()}`}
          </button>
        </div>
      </header>

      <div className="main-content">
        {/* LEFT PANEL: Import + Settings */}
        <aside className="side-panel">
          <div className="section-header"><span className="section-title">Logo</span></div>
          <label className="import-zone">
            <input type="file" accept=".svg" onChange={onLogoChange} />
            <span className="import-icon">⬆</span>
            <div className="import-label"><strong>{logoFileName || 'Import SVG'}</strong></div>
          </label>

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
              <div className="segment-control">
                <button className={`segment-btn ${settings.format === 'json' ? 'active' : ''}`} onClick={() => setSetting('format', 'json')}>JSON</button>
                <button className={`segment-btn ${settings.format === 'webm' ? 'active' : ''}`} onClick={() => setSetting('format', 'webm')}>WebM</button>
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
                <input type="color" className="setting-select" style={{padding: 0, height: 32}} value={settings.bgColor} onChange={e => setSetting('bgColor', e.target.value)} />
              )}
            </div>
          </div>
          <button className="generate-btn" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <span className="spin">⟳</span> : '✦ Generate'}
          </button>
        </aside>

        {/* CENTER: Canvas */}
        <main className="canvas-area">
          <div className="status-bar"><span className="status-dot" />{statusText}</div>
          <div className={`canvas-wrapper ${showTransparentGrid ? 'transparent-grid' : ''}`}>
            <canvas ref={canvasRef} width={720} height={720} className="logo-canvas" />
          </div>
          <div className="canvas-toolbar">
            <button className={`canvas-toolbar-btn ${showTransparentGrid ? 'active' : ''}`} onClick={() => setShowTransparentGrid(!showTransparentGrid)}>⊞ Alpha</button>
            <span className="canvas-toolbar-divider" />
            <span style={{fontSize: 11, color: 'var(--text-3)'}}>{selectedAnimation.name}</span>
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
    </div>
  );
}
