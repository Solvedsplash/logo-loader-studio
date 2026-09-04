import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getBrowser, getFFmpegPath } from '@/lib/server/browser';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const FFMPEG_BIN = getFFmpegPath(ffmpegStatic);
const CORE_ENGINE_SRC = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), 'lib', 'core-engine.js'), 'utf8');
const SVG_PATHS_SRC = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), 'lib', 'svg-paths.js'), 'utf8');

export async function POST(req) {
  let browser;
  let tmpDir;
  try {
    const {
      animation: clientAnimation,
      logoSvgText,
      fps = 20,
      size = 420,
    } = await req.json();

    if (!clientAnimation || !clientAnimation.family) {
      return NextResponse.json({ error: 'Missing animation definition' }, {
        status: 400,
        headers: { 'X-Export-Failed': '1' },
      });
    }

    const targetFps = Math.min(Math.max(1, Number(fps) || 20), 50);
    const targetSize = (Math.max(100, Math.min(800, Number(size) || 420)) >> 1) << 1;

    const animation = {
      ...clientAnimation,
      duration: Math.max(100, Number(clientAnimation.duration) || 3000),
      backgroundColor: clientAnimation.backgroundColor || null,
    };

    // A null background means the user asked for transparency. GIF only supports
    // 1-bit alpha, so we keep the frames transparent and let palettegen reserve a
    // transparent palette entry, rather than silently compositing a black matte.
    const wantsTransparency = !animation.backgroundColor;

    const frameCount = Math.max(2, Math.ceil((animation.duration / 1000) * targetFps));

    console.log(`[GIF] ${animation.name} | ${frameCount} frames @ ${targetFps}fps | ${targetSize}px | transparent=${wantsTransparency}`);

    browser = await getBrowser();
    const page = await browser.newPage();

    // Render above the target size so the palette pass has real detail to work
    // with, but never below it — the old fixed 720px upscaled larger requests.
    const internalSize = Math.min(1080, Math.max(targetSize * 2, 512)) & ~1;
    await page.setViewport({ width: internalSize, height: internalSize, deviceScaleFactor: 1 });

    const bgCss = animation.backgroundColor || 'transparent';
    const html = `<!DOCTYPE html>
<html style="background:${bgCss};">
<head><meta charset="utf-8"/><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${internalSize}px;height:${internalSize}px;overflow:hidden;background:${bgCss};}
  canvas{width:${internalSize}px;height:${internalSize}px;display:block;}
</style></head>
<body><canvas id="c" width="${internalSize}" height="${internalSize}"></canvas></body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(SVG_PATHS_SRC);
    await page.evaluate(CORE_ENGINE_SRC);

    await page.evaluate(async (svgText, anim) => {
      const normalized = window.SvgPaths.normalizeSvg(svgText);
      const blob = new Blob([normalized], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      window.__logoImg = img;
      URL.revokeObjectURL(url);

      window.__svgPathData = window.SvgPaths.extractPaths(svgText);
      window.__ctx = document.getElementById('c').getContext('2d');
      window.__anim = anim;
    }, logoSvgText, animation);

    // ── Pass 1: render frames straight to disk ────────────────────────
    // Written as we go rather than accumulated in an array — holding every PNG
    // in memory *and* on disk was enough to OOM the function on larger exports.
    const os = await import('os');
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-gif-'));

    for (let i = 0; i < frameCount; i++) {
      // [0, 1) so the last frame is not a duplicate of frame 0 — otherwise the
      // GIF visibly stutters once per loop.
      const progress = i / frameCount;

      await page.evaluate((p) => {
        const state = window.CoreEngine.getFrameState(p, window.__anim, window.__svgPathData);
        window.CoreEngine.renderStateToCanvas(window.__ctx, state, window.__logoImg);
      }, progress);

      const buffer = await page.screenshot({
        type: 'png',
        omitBackground: wantsTransparency,
        clip: { x: 0, y: 0, width: internalSize, height: internalSize },
      });

      fs.writeFileSync(path.join(tmpDir, `frame${String(i).padStart(5, '0')}.png`), buffer);
    }

    await browser.close();
    browser = null;

    // ── Pass 2: palettegen → paletteuse ───────────────────────────────
    const palettePath = path.join(tmpDir, 'palette.png');
    const outputPath = path.join(tmpDir, 'out.gif');
    const inputPattern = path.join(tmpDir, 'frame%05d.png');
    const scale = `scale=${targetSize}:${targetSize}:flags=lanczos`;

    // reserve_transparent keeps one palette slot free for fully transparent
    // pixels; alpha_threshold then decides which pixels claim it. Without both,
    // the alpha channel is simply discarded and the GIF comes out with a black
    // background, which is what used to happen for every "Alpha" export.
    const paletteFilters = wantsTransparency
      ? `${scale},palettegen=max_colors=255:stats_mode=full:reserve_transparent=1`
      : `${scale},palettegen=max_colors=256:stats_mode=full:reserve_transparent=0`;

    await runFFmpeg(FFMPEG_BIN, [
      '-framerate', String(targetFps),
      '-i', inputPattern,
      '-vf', paletteFilters,
      '-y', palettePath,
    ]);

    // Dithering is disabled for transparent output: error diffusion bleeds
    // colour into the transparent region and leaves a halo around the artwork.
    const useFilters = wantsTransparency
      ? `${scale}[s];[s][1:v]paletteuse=dither=none:alpha_threshold=128`
      : `${scale}[s];[s][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`;

    await runFFmpeg(FFMPEG_BIN, [
      '-framerate', String(targetFps),
      '-i', inputPattern,
      '-i', palettePath,
      '-lavfi', useFilters,
      '-loop', '0',
      '-y', outputPath,
    ]);

    const gifBuffer = fs.readFileSync(outputPath);
    console.log(`[GIF] Success: ${gifBuffer.length} bytes`);

    return new NextResponse(gifBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': `attachment; filename="loader-${animation.presetId || 'export'}.gif"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('[GIF Export] Error:', error);
    // Matches /api/export so the client can tell a real failure from a plain
    // non-OK response and log it instead of silently falling back.
    return NextResponse.json({ error: error.message }, {
      status: 500,
      headers: { 'X-Export-Failed': '1' },
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} }
  }
}

function runFFmpeg(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);
    let errLog = '';
    proc.stderr.on('data', (d) => { errLog += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code}:\n${errLog}`));
    });
    proc.on('error', reject);
  });
}
