import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { ANIMATIONS } from '../../animations';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === 'production';

async function getBrowser() {
  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteerCore = (await import('puppeteer-core')).default;
    chromium.setGraphicsMode = false;
    return puppeteerCore.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    const puppeteer = (await import('puppeteer')).default;
    return puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
  }
}

function getFFmpegPath() {
  if (!ffmpegStatic) return 'ffmpeg';
  if (process.env.VERCEL) {
    const vPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    try { if (fs.existsSync(vPath)) return vPath; } catch {}
  }
  if (typeof ffmpegStatic === 'string' && ffmpegStatic.startsWith('\\ROOT\\')) {
    return path.join(process.cwd(), ffmpegStatic.replace('\\ROOT\\', ''));
  }
  return ffmpegStatic;
}

const FFMPEG_BIN = getFFmpegPath();

// Read core-engine.js once at module load
const CORE_ENGINE_SRC = fs.readFileSync(
  path.join(process.cwd(), 'lib', 'core-engine.js'),
  'utf8'
);

export async function POST(req) {
  let browser;
  try {
    const {
      animId,
      logoSvgText,
      fps = 30,
      backgroundColor,
      quality = 'high',
      size = 420,
      speed = 1,          // animation speed multiplier from client
    } = await req.json();

    const targetFps  = Math.min(Number(fps) || 30, 60);
    const targetSize = (Math.max(100, Math.min(1200, Number(size) || 420)) >> 1) << 1; // Force even

    // Map quality strings to CRF (0 is lossless, higher is worse)
    const crfMap = { 'low': 35, 'medium': 25, 'high': 15, 'ultra': 0 };
    const targetCrf = crfMap[quality] ?? 15;

    const baseAnim = ANIMATIONS.find(a => a.id === animId) ?? ANIMATIONS[0];
    // Apply speed multiplier so server export matches the preview duration
    const speedSafe = Math.max(0.1, Number(speed) || 1);
    const animation = {
      ...baseAnim,
      duration: baseAnim.duration / speedSafe,
      backgroundColor: backgroundColor || null,
    };

    // Duration in ms, converted to frames
    const frameCount = Math.ceil((animation.duration / 1000) * targetFps);

    console.log(`[Export] Starting: ${animation.name} | ${frameCount} frames | CRF: ${targetCrf} | Size: ${targetSize}`);

    browser = await getBrowser();
    const page = await browser.newPage();

    const internalSize = 720;
    await page.setViewport({ width: internalSize, height: internalSize, deviceScaleFactor: 1 });

    const html = `<!DOCTYPE html>
<html style="background:transparent;">
<head><meta charset="utf-8"/><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${internalSize}px;height:${internalSize}px;overflow:hidden;background:transparent;}
  canvas{width:${internalSize}px;height:${internalSize}px;display:block;}
</style></head>
<body>
  <canvas id="c" width="${internalSize}" height="${internalSize}"></canvas>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Inject core-engine
    await page.evaluate(CORE_ENGINE_SRC);

    // Setup render data
    await page.evaluate(async (svgText, anim) => {
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      window.__logoImg = img;
      URL.revokeObjectURL(url);

      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden;top:-9999px;';
      container.innerHTML = svgText;
      document.body.appendChild(container);
      const svgEl = container.querySelector('svg');
      const nodes = svgEl ? svgEl.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon') : [];

      function shapeToD(node) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'path') return node.getAttribute('d') || '';
        if (tag === 'rect') {
          const x = +node.getAttribute('x')||0, y = +node.getAttribute('y')||0,
                w = +node.getAttribute('width')||0, h = +node.getAttribute('height')||0;
          return `M${x},${y}H${x+w}V${y+h}H${x}Z`;
        }
        if (tag === 'circle') {
          const cx = +node.getAttribute('cx')||0, cy = +node.getAttribute('cy')||0, r = +node.getAttribute('r')||0;
          return `M${cx-r},${cy}A${r},${r},0,1,0,${cx+r},${cy}A${r},${r},0,1,0,${cx-r},${cy}Z`;
        }
        return '';
      }

      window.__svgPathData = Array.from(nodes).map(node => {
        const d = shapeToD(node);
        const length = node.getTotalLength ? node.getTotalLength() : 1000;
        const cs = window.getComputedStyle(node);
        return {
          d, length,
          color: (cs.stroke && cs.stroke !== 'none') ? cs.stroke : (node.getAttribute('stroke') || node.getAttribute('fill') || '#9b8fff'),
          strokeWidth: cs.strokeWidth || node.getAttribute('stroke-width') || '2',
        };
      }).filter(p => Boolean(p.d));
      document.body.removeChild(container);

      window.__ctx = document.getElementById('c').getContext('2d');
      window.__anim = anim;
    }, logoSvgText, animation);

    // ─── FFmpeg: VP9 with alpha (yuva420p) ─────────────────────────────
    const ffmpegArgs = [
      // Input: PNG frames piped from stdin
      '-f',      'image2pipe',
      '-vcodec', 'png',
      '-r',      String(targetFps),
      '-i',      '-',

      // Output: VP9 WebM with full alpha channel (yuva420p)
      // This is the ONLY reliable way to get transparent WebM —
      // WebCodecs VideoEncoder does not support VP9 alpha in any browser.
      '-c:v',       'libvpx-vp9',
      '-pix_fmt',   'yuva420p',        // Y+U+V+Alpha — Lottie uses the same
      '-lossless',  targetCrf === 0 ? '1' : '0',
      '-crf',       String(targetCrf),
      '-b:v',       '0',              // Use CRF mode (VBR with quality target)
      '-deadline',  'good',           // 'realtime' skips frames; 'good' = balanced
      '-cpu-used',  '2',              // 0=best quality, 5=fastest; 2 is a good middle
      '-lag-in-frames', '0',          // Fixes VP9 premature-end bug in browsers
      '-row-mt',    '1',
      '-auto-alt-ref', '0',           // MUST be 0 for alpha — alt-ref breaks yuva420p
      '-an',
      '-vf',        `scale=${targetSize}:${targetSize}:flags=lanczos,format=rgba`,
      '-f',         'webm',
      '-'
    ];

    const ffmpeg = spawn(FFMPEG_BIN, ffmpegArgs);
    const chunks = [];
    ffmpeg.stdout.on('data', c => chunks.push(c));
    let errLog = '';
    ffmpeg.stderr.on('data', d => { errLog += d.toString(); });

    // ─── Render Loop (deterministic, absolute progress) ─────────────────
    for (let i = 0; i < frameCount; i++) {
      // Absolute progress — never accumulated deltaTime
      const progress = i / (frameCount - 1 || 1);

      await page.evaluate((p) => {
        const ctx      = window.__ctx;
        const anim     = window.__anim;
        const logoImg  = window.__logoImg;
        const svgPaths = window.__svgPathData;

        // Clear canvas before each frame
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const state = window.CoreEngine.getFrameState(p, anim, svgPaths);
        // Suppress engine background fill — we handle alpha ourselves
        const s = { ...state, global: { ...state.global, backgroundColor: null } };
        window.CoreEngine.renderStateToCanvas(ctx, s, logoImg);
      }, progress);

      const buffer = await page.screenshot({
        type: 'png',
        omitBackground: true,
        clip: { x: 0, y: 0, width: internalSize, height: internalSize }
      });

      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.write(buffer);
      } else {
        throw new Error(`FFmpeg crashed: ${errLog}`);
      }
    }

    ffmpeg.stdin.end();

    const webmBuffer = await new Promise((resolve, reject) => {
      ffmpeg.on('close', code => {
        if (code === 0) resolve(Buffer.concat(chunks));
        else reject(new Error(`FFmpeg error (${code}): ${errLog}`));
      });
      ffmpeg.on('error', e => reject(e));
    });

    console.log(`[Export] Success: ${webmBuffer.length} bytes`);

    return new NextResponse(webmBuffer, {
      headers: {
        'Content-Type': 'video/webm',
        'Content-Disposition': `attachment; filename="loader-${animation.id}.webm"`,
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('[Export] Critical Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
