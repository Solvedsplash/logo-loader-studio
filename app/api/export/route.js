import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { ANIMATIONS } from '../../animations';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─── Load the single source of truth engine once at startup ──────────────────────────────
const RENDER_ENGINE_IIFE = readFileSync(
  path.join(process.cwd(), 'lib', 'core-engine.js'),
  'utf8'
);

// ─── Environment helpers ──────────────────────────────────────────────────────
const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === 'production';

async function getBrowser() {
  if (isVercel) {
    const chromium      = (await import('@sparticuz/chromium')).default;
    const puppeteerCore = (await import('puppeteer-core')).default;
    chromium.setGraphicsMode = false;
    const remoteUrl = `https://github.com/Sparticuz/chromium/releases/download/v${await chromium.version}/chromium-v${await chromium.version}-pack.tar`;
    return puppeteerCore.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(remoteUrl),
      headless: chromium.headless,
    });
  }
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
}

function getFFmpegPath() {
  if (!ffmpegStatic) return 'ffmpeg';
  if (process.env.VERCEL) {
    const vPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    try { if (require('fs').existsSync(vPath)) return vPath; } catch {}
  }
  if (typeof ffmpegStatic === 'string' && ffmpegStatic.startsWith('\\ROOT\\')) {
    return path.join(process.cwd(), ffmpegStatic.replace('\\ROOT\\', ''));
  }
  return ffmpegStatic;
}

const FFMPEG_BIN  = getFFmpegPath();
const CANVAS_SIZE = 440;

// ─── Why formats work the way they do ────────────────────────────────────────
//
// APNG (default transparent):
//   Full 32-bit RGBA, lossless. Pixel-perfect fading. Best quality.
//
// Lottie JSON:
//   Vector format, native transparency, infinitely scalable. Best for web.
//
// GIF Transparent:
//   1-bit alpha (fully opaque or fully transparent per pixel).
//   Fading animations will snap rather than fade smoothly — this is inherent
//   to GIF. For smooth transparent fading, use Lottie JSON or APNG instead.
//   alpha_threshold=128. Logo stays pixel-sharp with no dithering artifacts.
//
// GIF Solid BG:
//   Composites onto a dark background (#121932). No alpha needed.
//   bayer_scale=1 for finest color dithering.

// ─── SVG normalization ────────────────────────────────────────────────────────
// SVGs from Figma/Illustrator often only have viewBox, no explicit width/height.
// Puppeteer renders those as 0×0. This injects correct dimensions from viewBox.
function normalizeSvg(svgText) {
  try {
    let svg = (svgText || '').trim();
    const hasW = /<svg[^>]+\bwidth\s*=\s*["'][\d]/.test(svg);
    const hasH = /<svg[^>]+\bheight\s*=\s*["'][\d]/.test(svg);
    if (hasW && hasH) return svg;
    const vb = svg.match(/viewBox\s*=\s*["']([^"']+)["']/);
    if (vb) {
      const parts = vb[1].trim().split(/[\s,]+/).map(Number);
      const vw = parts[2] || 220;
      const vh = parts[3] || 220;
      svg = svg.replace(/(<svg)(\s|>)/, `$1 width="${vw}" height="${vh}"$2`);
    } else {
      svg = svg.replace(/(<svg)(\s|>)/, '$1 width="220" height="220" viewBox="0 0 220 220"$2');
    }
    return svg;
  } catch {
    return svgText;
  }
}

// ─── SVG shape → path `d` string (injected into Puppeteer browser context) ───
// Handles all 7 SVG primitive types for accurate getTotalLength() calls.
// Written as a plain JS string (no ES modules) because it runs inside Puppeteer.
const SHAPE_TO_PATH_D_SRC = `
function shapeToPathD(node) {
  var tag = node.tagName.toLowerCase();
  if (tag === 'path') return node.getAttribute('d') || '';

  if (tag === 'rect') {
    var x = parseFloat(node.getAttribute('x')      || '0');
    var y = parseFloat(node.getAttribute('y')      || '0');
    var w = parseFloat(node.getAttribute('width')  || '0');
    var h = parseFloat(node.getAttribute('height') || '0');
    return 'M'+x+','+y+'H'+(x+w)+'V'+(y+h)+'H'+x+'Z';
  }
  if (tag === 'circle') {
    var cx = parseFloat(node.getAttribute('cx') || '0');
    var cy = parseFloat(node.getAttribute('cy') || '0');
    var r  = parseFloat(node.getAttribute('r')  || '0');
    return 'M'+(cx-r)+','+cy+'A'+r+','+r+',0,1,0,'+(cx+r)+','+cy
         + 'A'+r+','+r+',0,1,0,'+(cx-r)+','+cy+'Z';
  }
  if (tag === 'ellipse') {
    var ecx = parseFloat(node.getAttribute('cx') || '0');
    var ecy = parseFloat(node.getAttribute('cy') || '0');
    var rx  = parseFloat(node.getAttribute('rx') || '0');
    var ry  = parseFloat(node.getAttribute('ry') || '0');
    return 'M'+(ecx-rx)+','+ecy+'A'+rx+','+ry+',0,1,0,'+(ecx+rx)+','+ecy
         + 'A'+rx+','+ry+',0,1,0,'+(ecx-rx)+','+ecy+'Z';
  }
  if (tag === 'line') {
    var x1 = parseFloat(node.getAttribute('x1') || '0');
    var y1 = parseFloat(node.getAttribute('y1') || '0');
    var x2 = parseFloat(node.getAttribute('x2') || '0');
    var y2 = parseFloat(node.getAttribute('y2') || '0');
    return 'M'+x1+','+y1+'L'+x2+','+y2;
  }
  if (tag === 'polyline' || tag === 'polygon') {
    var raw = (node.getAttribute('points') || '').trim();
    if (!raw) return '';
    var pts = raw.replace(/,/g, ' ').split(/\s+/).map(Number);
    if (pts.length < 4) return '';
    var d = 'M'+pts[0]+','+pts[1];
    for (var i = 2; i+1 < pts.length; i += 2) d += 'L'+pts[i]+','+pts[i+1];
    if (tag === 'polygon') d += 'Z';
    return d;
  }
  return '';
}
`;



export async function POST(req) {
  let browser;
  try {
    const { animId, logoData, logoSvgText, fps = 30, format = 'apng' } = await req.json();

    const targetFps       = Math.min(Number(fps) || 30, 50);
    const isApng          = format === 'apng';
    const isSolidGif      = format === 'gif-solid';
    const isTransparentGif = format === 'gif';

    // Solid GIF composites onto a dark background; transparent modes use no bg
    const bgColor = isSolidGif ? '#121932' : null;

    const animation  = {
      ...(ANIMATIONS.find(a => a.id === animId) ?? ANIMATIONS[0]),
      backgroundColor: bgColor
    };
    const frameCount = Math.ceil((animation.duration / 1000) * targetFps);
    const outputExt  = isApng ? 'apng' : 'gif';

    console.log(`[Export] ${animation.name} | ${frameCount}fr @ ${targetFps}fps | format:${format}`);

    // Normalize SVG: inject width/height from viewBox so Puppeteer renders it correctly
    const normalizedSvg = normalizeSvg(logoSvgText || '');

    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: CANVAS_SIZE, height: CANVAS_SIZE, deviceScaleFactor: 1 });

    const bgStyle = bgColor ? `background:${bgColor} !important;` : 'background:transparent !important;';
    const html = `<!DOCTYPE html><html style="${bgStyle}"><head><meta charset="utf-8"/><style>
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{width:${CANVAS_SIZE}px;height:${CANVAS_SIZE}px;overflow:hidden;${bgStyle}}
      canvas{width:${CANVAS_SIZE}px;height:${CANVAS_SIZE}px;display:block;background:transparent;}
    </style></head><body>
      <canvas id="canvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Inject the render engine and shape helper
    await page.addScriptTag({ content: RENDER_ENGINE_IIFE });
    await page.addScriptTag({ content: SHAPE_TO_PATH_D_SRC });

    // ── One-time setup: load logo image + extract SVG path data ──────────────
    await page.evaluate(async (animConfig, svgText, logoDataUrl) => {
      window.__animConfig = animConfig;
      window.__ctx = document.getElementById('canvas').getContext('2d');

      // Load the logo image
      const src = logoDataUrl
        ? logoDataUrl
        : ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText));

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload  = resolve;
        img.onerror = reject;
        img.src = src;
      });
      window.__logoImg = img;

      // Extract SVG path data via live DOM for accurate getTotalLength()
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden;top:-9999px;';
      container.innerHTML = svgText || '';
      document.body.appendChild(container);

      const svgEl = container.querySelector('svg');
      if (svgEl) {
        const nodes = svgEl.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon');
        window.__svgPathData = Array.from(nodes).map(node => {
          const d = shapeToPathD(node);
          const length = (node.getTotalLength && d) ? node.getTotalLength() : 1000;
          const cs     = window.getComputedStyle(node);
          const stroke = (cs.stroke && cs.stroke !== 'none') ? cs.stroke : (node.getAttribute('stroke') || '');
          const fill   = (cs.fill   && cs.fill   !== 'none') ? cs.fill   : (node.getAttribute('fill')   || '');
          return {
            d,
            length,
            color:       stroke || fill || '#91f6ff',
            strokeWidth: cs.strokeWidth || node.getAttribute('stroke-width') || '2',
          };
        }).filter(p => Boolean(p.d));
      } else {
        window.__svgPathData = [];
      }

      document.body.removeChild(container);
    }, animation, normalizedSvg, logoData || null);

    // ─── FFmpeg pipeline ──────────────────────────────────────────────────────
    let ffmpegArgs;

    if (isApng) {
      // APNG: full 32-bit RGBA, lossless, pixel-perfect, loops forever (-plays 0)
      ffmpegArgs = [
        '-f', 'image2pipe', '-vcodec', 'png', '-r', String(targetFps), '-i', '-',
        '-plays', '0',
        '-f', 'apng', '-'
      ];
    } else if (isSolidGif) {
      // Solid-BG GIF: bayer_scale=1 = 2×2 grid, finest color dither available
      // Much less visible than sierra2_4a on gradient logos at icon sizes
      const vf = [
        'split[v1][v2]',
        '[v1]palettegen=stats_mode=full[p]',
        '[v2][p]paletteuse=diff_mode=rectangle:dither=bayer:bayer_scale=1'
      ].join(';');
      ffmpegArgs = [
        '-f', 'image2pipe', '-vcodec', 'png', '-r', String(targetFps), '-i', '-',
        '-vf', vf, '-f', 'gif', '-'
      ];
    } else {
      // Transparent GIF: clean binary alpha, no dithering on alpha channel.
      // Logo stays pixel-sharp. Fades snap at ~50% (inherent GIF limitation).
      // For smooth transparent fading, use Lottie JSON or APNG.
      const vf = [
        'split[v1][v2]',
        '[v1]palettegen=reserve_transparent=1:stats_mode=full[p]',
        '[v2][p]paletteuse=alpha_threshold=128:diff_mode=rectangle:dither=bayer:bayer_scale=1'
      ].join(';');
      ffmpegArgs = [
        '-f', 'image2pipe', '-vcodec', 'png', '-r', String(targetFps), '-i', '-',
        '-vf', vf,
        '-gifflags', '+transdiff',
        '-f', 'gif', '-'
      ];
    }

    const ffmpeg = spawn(FFMPEG_BIN, ffmpegArgs);
    const chunks = [];
    ffmpeg.stdout.on('data', c => chunks.push(c));
    let errLog = '';
    ffmpeg.stderr.on('data', d => { errLog += d.toString(); });

    // ─── Deterministic frame render loop ──────────────────────────────────────
    // Animation = pure function of time. Same progress in → same pixels out.
    for (let i = 0; i < frameCount; i++) {
      if (i % 20 === 0) console.log(`[Export] Frame ${i}/${frameCount}`);

      const progress = i / frameCount; // 0..1, never reaches 1 (loops cleanly)

      await page.evaluate((p) => {
        const state = window.CoreEngine.getFrameState(
          p,
          window.__animConfig,
          window.__svgPathData
        );
        window.CoreEngine.renderStateToCanvas(
          window.__ctx,
          state,
          window.__logoImg
        );
      }, progress);

      // Capture the canvas frame.
      // omitBackground=true for transparent modes: preserves canvas alpha exactly.
      // omitBackground=false for solid BG: Puppeteer's bg matches our bgColor.
      const buffer = await page.screenshot({
        type: 'png',
        omitBackground: !bgColor,
        clip: { x: 0, y: 0, width: CANVAS_SIZE, height: CANVAS_SIZE }
      });

      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.write(buffer);
      } else {
        throw new Error(`FFmpeg stdin closed prematurely: ${errLog}`);
      }
    }

    ffmpeg.stdin.end();

    const outputBuffer = await new Promise((resolve, reject) => {
      ffmpeg.on('close', code => {
        if (code === 0) resolve(Buffer.concat(chunks));
        else reject(new Error(`FFmpeg error (${code}): ${errLog}`));
      });
      ffmpeg.on('error', e => reject(e));
    });

    console.log(`[Export] Done. ${format.toUpperCase()} | ${outputBuffer.length} bytes`);

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': isApng ? 'image/apng' : 'image/gif',
        'Content-Disposition': `attachment; filename="logo-loader-${animation.id}.${outputExt}"`,
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('[Export] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}