import puppeteer from 'puppeteer';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import { ANIMATIONS } from '../../animations';
import { renderFrame } from '../../../lib/animation-engine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getFFmpegPath() {
  if (!ffmpegStatic) return 'ffmpeg';
  // If it's a virtual root path, resolve it
  if (ffmpegStatic.startsWith('\\ROOT\\')) {
    return path.join(process.cwd(), ffmpegStatic.replace('\\ROOT\\', ''));
  }
  return ffmpegStatic;
}

const FFMPEG_BIN = getFFmpegPath();

export async function POST(req) {
  let browser;
  try {
    const { animId, logoData, logoSvgText, fps = 30 } = await req.json();
    const targetFps = Math.min(Number(fps) || 30, 50); // Cap at 50 FPS for GIF standard compatibility
    const animation = ANIMATIONS.find(a => a.id === animId) ?? ANIMATIONS[0];
    const frameCount = Math.ceil((animation.duration / 1000) * targetFps);
    const frameDelayMs = animation.duration / frameCount;

    console.log(`[Export] Starting session: ${animation.name} (${frameCount} frames)`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 420, deviceScaleFactor: 2 });

    const isPathDraw = animation.family === 'path-draw';
    const isParticleBurst = animation.family === 'particle-burst';

    // Priority: logoData (Base64 from client) > logoSvgText
    const dataUrl = logoData || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvgText)}`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{width:420px;height:420px;overflow:hidden;background:transparent !important;display:grid;place-items:center;image-rendering:optimizeQuality;-webkit-font-smoothing:antialiased;}
      .preview-root{width:420px;height:420px;display:grid;place-items:center;background:transparent !important;position:relative;}
      .logo-stage{position:relative;width:110px;height:110px;display:grid;place-items:center;}
      #logo{width:110px !important;height:110px !important;object-fit:contain;position:absolute;inset:0;z-index:2;display:block;background:transparent;}
      .drawn-layer{position:absolute;inset:0;width:110px;height:110px;z-index:3;display:grid;place-items:center;pointer-events:none;}
      .drawn-layer svg{width:100% !important;height:100% !important;display:block;}
      .drawn-layer svg :is(path, rect, circle, ellipse, line, polyline, polygon){
        fill:none !important;
        stroke: var(--computed-color, rgba(145, 246, 255, 0.9)) !important;
        stroke-width: var(--computed-stroke-width, var(--draw-width, 1.5px)) !important;
        stroke-linecap:round !important;
        stroke-linejoin:round !important;
        stroke-dasharray: var(--path-len, 1000px) !important;
        stroke-dashoffset: var(--path-len, 1000px);
        vector-effect: non-scaling-stroke;
      }
      .particles{position:absolute;inset:0;z-index:3;pointer-events:none;}
      .particle{
        position:absolute;left:50%;top:50%;
        width: var(--particle-size, 4px);
        height: var(--particle-size, 4px);
        background: var(--computed-color, #fff);
        border-radius: 999px;
        opacity: var(--particle-opacity, 0.8);
        transform-origin:center;
        box-shadow: 0 0 12px var(--computed-color, rgba(145, 246, 255, 0.7));
      }
    </style></head><body>
      <div class="preview-root" id="preview-root">
        <div class="logo-stage">
          <img id="logo" src="${dataUrl}" />
          ${isPathDraw && logoSvgText ? `<div class="drawn-layer" id="drawn-layer">${logoSvgText}</div>` : ''}
        </div>
        ${isParticleBurst ? `<div class="particles" id="particles">${Array(6).fill('<span class="particle"></span>').join('')}</div>` : ''}
      </div>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ensure logo is loaded and decoded before we start capturing
    await page.evaluate(async () => {
      const img = document.getElementById('logo');
      const wait = () => new Promise(r => {
        if (img.complete) r();
        else { img.onload = r; img.onerror = r; }
      });
      await wait();
      await new Promise(r => requestAnimationFrame(r));
    });

    await page.evaluate((engineStr, animConfig) => {
      window.__renderFrameFn = new Function('return ' + engineStr)();
      window.__animConfig = animConfig;

      const shapes = document.querySelectorAll('#drawn-layer :is(path, rect, circle, ellipse, line, polyline, polygon)');
      shapes.forEach(p => {
        try {
          p._pathLen = p.getTotalLength ? p.getTotalLength() : 1000;
          p.style.setProperty('--path-len', `${p._pathLen}px`);
        } catch (e) { p._pathLen = 1000; }
      });
    }, renderFrame.toString(), animation);

    const filter = `split[v1][v2];[v1]palettegen=reserve_transparent=1:stats_mode=full[p];[v2][p]paletteuse=dither=floyd_steinberg:alpha_threshold=128`;

    const ffmpeg = spawn(FFMPEG_BIN, [
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', String(targetFps),
      '-i', '-',
      '-vf', filter,
      '-gifflags', '+transdiff',
      '-f', 'gif',
      '-'
    ]);

    const chunks = [];
    ffmpeg.stdout.on('data', c => chunks.push(c));
    let errLog = '';
    ffmpeg.stderr.on('data', d => errLog += d.toString());

    // ─── Render Loop ─────────────────────────────────────────────────────────
    const shapeSelectors = 'path, rect, circle, ellipse, line, polyline, polygon';

    for (let i = 0; i < frameCount; i++) {
      if (i % 20 === 0) console.log(`[Export] Frame ${i}/${frameCount}`);

      await page.evaluate((t, sel) => {
        const elements = {
          logo: document.getElementById('logo'),
          paths: document.querySelectorAll(`#drawn-layer :is(${sel})`),
          particles: document.querySelectorAll('.particle')
        };
        window.__renderFrameFn(t, elements, window.__animConfig);

        // Force a layout pass to ensure all SVG updates are flushed
        return document.body.offsetHeight;
      }, i * frameDelayMs, shapeSelectors);

      // We use double device scale for crisp dithering
      const buffer = await page.screenshot({
        type: 'png',
        omitBackground: true
      });

      // Defend against EPIPE
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.write(buffer);
      } else {
        throw new Error(`FFmpeg stdin closed prematurely: ${errLog}`);
      }
    }

    ffmpeg.stdin.end();

    const gifBuffer = await new Promise((resolve, reject) => {
      ffmpeg.on('close', code => {
        if (code === 0) resolve(Buffer.concat(chunks));
        else reject(new Error(`FFmpeg error (${code}): ${errLog}`));
      });
      ffmpeg.on('error', e => reject(e));
    });

    console.log(`[Export] Complete. Buffer: ${gifBuffer.length} bytes`);

    return new NextResponse(gifBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': `attachment; filename="loader.gif"`,
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('[Export] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}