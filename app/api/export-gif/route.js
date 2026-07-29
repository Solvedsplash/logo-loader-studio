import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { ANIMATIONS } from '../../animations';

export const maxDuration = 120;
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
  let p = ffmpegStatic;
  if (process.env.VERCEL) {
    const vPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    try { if (fs.existsSync(vPath)) p = vPath; } catch {}
  }
  if (typeof p === 'string' && p.startsWith('\\ROOT\\')) {
    p = path.join(process.cwd(), p.replace('\\ROOT\\', ''));
  }
  try {
    if (fs.existsSync(p)) fs.chmodSync(p, 0o755);
  } catch {}
  return p;
}

const FFMPEG_BIN = getFFmpegPath();
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
      fps = 20,
      backgroundColor = '#ffffff',
      quality = 'high',
      size = 420,
      speed = 1,
    } = await req.json();

    const targetFps  = Math.min(Number(fps) || 20, 50);
    const targetSize = (Math.max(100, Math.min(800, Number(size) || 420)) >> 1) << 1;
    const matteColor = backgroundColor || '#ffffff';

    const speedSafe = Math.max(0.1, Number(speed) || 1);
    const baseAnim  = ANIMATIONS.find(a => a.id === animId) ?? ANIMATIONS[0];
    const animation = {
      ...baseAnim,
      duration: baseAnim.duration / speedSafe,
      backgroundColor: matteColor,
    };

    const frameCount = Math.max(2, Math.ceil((animation.duration / 1000) * targetFps));
    const delayMs    = Math.round(1000 / targetFps); // ms per frame for GIF

    console.log(`[GIF Export] ${animation.name} | ${frameCount} frames @ ${targetFps}fps | size: ${targetSize} | bg: ${matteColor}`);

    browser = await getBrowser();
    const page = await browser.newPage();

    const internalSize = 720; // render at 720px internally for quality, FFmpeg scales down
    await page.setViewport({ width: internalSize, height: internalSize, deviceScaleFactor: 1 });

    const bgCss = matteColor;
    const html = `<!DOCTYPE html>
<html style="background:${bgCss};">
<head><meta charset="utf-8"/><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${internalSize}px;height:${internalSize}px;overflow:hidden;background:${bgCss};}
  canvas{width:${internalSize}px;height:${internalSize}px;display:block;}
</style></head>
<body>
  <canvas id="c" width="${internalSize}" height="${internalSize}"></canvas>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(CORE_ENGINE_SRC);

    await page.evaluate(async (svgText, anim) => {
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const img  = new Image();
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

      window.__ctx  = document.getElementById('c').getContext('2d');
      window.__anim = anim;
    }, logoSvgText, animation);

    // ── Pass 1: Render all frames and collect PNGs ──────────────────
    const framePngs = [];
    for (let i = 0; i < frameCount; i++) {
      const progress = frameCount === 1 ? 0 : i / (frameCount - 1);

      await page.evaluate((p, bg) => {
        const ctx     = window.__ctx;
        const anim    = window.__anim;
        const logoImg = window.__logoImg;
        const paths   = window.__svgPathData;

        // Fill with matte background first
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const state = window.CoreEngine.getFrameState(p, anim, paths);
        // Force the background color so renderStateToCanvas uses the matte
        const s = { ...state, global: { ...state.global, backgroundColor: bg } };
        window.CoreEngine.renderStateToCanvas(ctx, s, logoImg);
      }, progress, matteColor);

      const png = await page.screenshot({
        type: 'png',
        omitBackground: false,
        clip: { x: 0, y: 0, width: internalSize, height: internalSize },
      });
      framePngs.push(png);
    }

    await browser.close();
    browser = null;

    // ── Pass 2: FFmpeg 2-pass GIF (palettegen → paletteuse) ────────
    // We write all PNGs to a temp directory, then run FFmpeg.
    // FFmpeg's palettegen+paletteuse with stats_mode=full gives
    // the best possible 256-color representation of the entire animation.
    const os   = await import('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-gif-'));

    try {
      // Write frame PNGs
      for (let i = 0; i < framePngs.length; i++) {
        fs.writeFileSync(path.join(tmpDir, `frame${String(i).padStart(5, '0')}.png`), framePngs[i]);
      }

      const palettePath = path.join(tmpDir, 'palette.png');
      const outputPath  = path.join(tmpDir, 'out.gif');

      const inputPattern = path.join(tmpDir, 'frame%05d.png');

      // Step A: Generate optimal palette from all frames
      await runFFmpeg(FFMPEG_BIN, [
        '-framerate', String(targetFps),
        '-i', inputPattern,
        '-vf', `scale=${targetSize}:${targetSize}:flags=lanczos,palettegen=max_colors=256:stats_mode=full`,
        '-y', palettePath,
      ]);

      // Step B: Apply palette with best dithering (sierra2_4a is visually smooth)
      await runFFmpeg(FFMPEG_BIN, [
        '-framerate', String(targetFps),
        '-i', inputPattern,
        '-i', palettePath,
        '-lavfi', `scale=${targetSize}:${targetSize}:flags=lanczos[s];[s][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
        '-loop', '0',
        '-y', outputPath,
      ]);

      const gifBuffer = fs.readFileSync(outputPath);
      console.log(`[GIF Export] Success: ${gifBuffer.length} bytes`);

      return new NextResponse(gifBuffer, {
        headers: {
          'Content-Type': 'image/gif',
          'Content-Disposition': `attachment; filename="loader-${animation.id}.gif"`,
          'Cache-Control': 'no-store',
        },
      });

    } finally {
      // Clean up temp files
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }

  } catch (error) {
    console.error('[GIF Export] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}

function runFFmpeg(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);
    let errLog = '';
    proc.stderr.on('data', d => { errLog += d.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg (${args.join(' ')}) exited ${code}:\n${errLog}`));
    });
    proc.on('error', reject);
  });
}
