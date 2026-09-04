import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getBrowser, getFFmpegPath } from '@/lib/server/browser';

export const maxDuration = 300; // Vercel Pro honors up to 300s; Hobby clamps to 60s
export const dynamic = 'force-dynamic';

const FFMPEG_BIN = getFFmpegPath(ffmpegStatic);

// Both engine files are read once at module load and injected verbatim into the
// Puppeteer page, so the server renders with byte-identical code to the preview.
const CORE_ENGINE_SRC = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), 'lib', 'core-engine.js'), 'utf8');
const SVG_PATHS_SRC = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), 'lib', 'svg-paths.js'), 'utf8');

/** Writes to a stream, waiting for 'drain' when the buffer is full. */
function writeBackpressured(stream, buffer) {
  return new Promise((resolve, reject) => {
    if (stream.write(buffer)) return resolve();
    const onDrain = () => { stream.off('error', onError); resolve(); };
    const onError = (e) => { stream.off('drain', onDrain); reject(e); };
    stream.once('drain', onDrain);
    stream.once('error', onError);
  });
}

export async function POST(req) {
  let browser;
  let ffmpeg;
  try {
    const {
      animation: clientAnimation,
      logoSvgText,
      fps = 30,
      quality = 'high',
      size = 420,
    } = await req.json();

    if (!clientAnimation || !clientAnimation.family) {
      return NextResponse.json({ error: 'Missing animation definition' }, {
        status: 400,
        headers: { 'X-Export-Failed': '1' },
      });
    }

    const targetFps = Math.min(Math.max(1, Number(fps) || 30), 60);
    const targetSize = (Math.max(100, Math.min(1200, Number(size) || 420)) >> 1) << 1; // even

    // Map quality strings to CRF (0 is lossless, higher is worse)
    const crfMap = { low: 35, medium: 25, high: 15, ultra: 0 };
    const targetCrf = crfMap[quality] ?? 15;

    // The client sends the fully resolved animation — speed, easing, direction and
    // every parameter are already baked in — so there is no preset lookup here and
    // therefore no way for the server to disagree with what the user previewed.
    const animation = {
      ...clientAnimation,
      duration: Math.max(100, Number(clientAnimation.duration) || 3000),
      backgroundColor: clientAnimation.backgroundColor || null,
    };

    const frameCount = Math.max(2, Math.ceil((animation.duration / 1000) * targetFps));

    console.log(`[Export] ${animation.name} | ${frameCount} frames | CRF ${targetCrf} | ${targetSize}px | alpha=${!animation.backgroundColor}`);

    browser = await getBrowser();
    const page = await browser.newPage();

    // Supersample to at least 512px so FFmpeg downscales cleanly, but never render
    // larger than needed: a fixed 720px at 60fps on Vercel's throttled CPU is what
    // used to push this route past the function timeout.
    const internalSize = Math.min(1080, Math.max(targetSize, 512)) & ~1;
    await page.setViewport({ width: internalSize, height: internalSize, deviceScaleFactor: 1 });

    const html = `<!DOCTYPE html>
<html style="background:transparent;">
<head><meta charset="utf-8"/><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${internalSize}px;height:${internalSize}px;overflow:hidden;background:transparent;}
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

    // ─── FFmpeg: VP9 with alpha (yuva420p) ────────────────────────────
    const ffmpegArgs = [
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', String(targetFps),
      '-i', '-',

      // VP9 in WebM with a real alpha plane. WebCodecs cannot encode VP9 alpha in
      // any shipping browser, so this server path is the only route to a truly
      // transparent video.
      '-c:v', 'libvpx-vp9',
      '-pix_fmt', 'yuva420p',
      '-lossless', targetCrf === 0 ? '1' : '0',
      '-crf', String(targetCrf),
      '-b:v', '0',
      '-deadline', 'good',
      '-cpu-used', '4',
      '-lag-in-frames', '0',    // fixes a VP9 premature-end bug in browsers
      '-row-mt', '1',
      '-tile-columns', '2',
      '-tile-rows', '2',
      '-threads', '0',
      '-auto-alt-ref', '0',     // MUST be 0 for alpha — alt-ref breaks yuva420p
      '-an',
      '-vf', `scale=${targetSize}:${targetSize}:flags=lanczos,format=rgba`,
      '-f', 'webm',
      '-',
    ];

    ffmpeg = spawn(FFMPEG_BIN, ffmpegArgs);

    // Attach every listener BEFORE the render loop. spawn emits 'error'
    // asynchronously (ENOENT, EACCES), and an unhandled 'error' on an
    // EventEmitter takes the whole process down rather than failing the request.
    const chunks = [];
    let errLog = '';
    let spawnError = null;
    ffmpeg.on('error', (e) => { spawnError = e; });
    ffmpeg.stdin.on('error', (e) => { spawnError = spawnError || e; });
    ffmpeg.stdout.on('data', (c) => chunks.push(c));
    ffmpeg.stderr.on('data', (d) => { errLog += d.toString(); });

    const closed = new Promise((resolve) => {
      ffmpeg.on('close', (code) => resolve(code));
    });

    // ─── Render loop ──────────────────────────────────────────────────
    for (let i = 0; i < frameCount; i++) {
      if (spawnError) throw spawnError;

      // Sample over [0, 1) rather than [0, 1]. Including 1 would make the final
      // frame a duplicate of frame 0, which shows up as a one-frame stutter every
      // time the loop wraps.
      const progress = i / frameCount;

      await page.evaluate((p) => {
        const state = window.CoreEngine.getFrameState(p, window.__anim, window.__svgPathData);
        window.CoreEngine.renderStateToCanvas(state && window.__ctx ? window.__ctx : null, state, window.__logoImg);
      }, progress);

      const buffer = await page.screenshot({
        type: 'png',
        omitBackground: true,
        clip: { x: 0, y: 0, width: internalSize, height: internalSize },
      });

      if (!ffmpeg.stdin.writable) throw new Error(`FFmpeg exited early: ${errLog}`);
      await writeBackpressured(ffmpeg.stdin, buffer);
    }

    ffmpeg.stdin.end();

    const code = await closed;
    if (spawnError) throw spawnError;
    if (code !== 0) throw new Error(`FFmpeg error (${code}): ${errLog}`);

    const webmBuffer = Buffer.concat(chunks);
    console.log(`[Export] Success: ${webmBuffer.length} bytes`);

    return new NextResponse(webmBuffer, {
      headers: {
        'Content-Type': 'video/webm',
        'Content-Disposition': `attachment; filename="loader-${animation.presetId || 'export'}.webm"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('[Export] Critical Error:', error);
    // X-Export-Failed lets the client distinguish a real server failure (and log
    // it) from an ordinary non-OK response, instead of silently degrading.
    return NextResponse.json({ error: error.message }, {
      status: 500,
      headers: { 'X-Export-Failed': '1' },
    });
  } finally {
    // Kill ffmpeg explicitly. If the render loop threw, stdin.end() was never
    // reached and the child would otherwise sit forever waiting on input.
    if (ffmpeg && ffmpeg.exitCode === null && !ffmpeg.killed) {
      try { ffmpeg.stdin.destroy(); } catch {}
      try { ffmpeg.kill('SIGKILL'); } catch {}
    }
    if (browser) await browser.close().catch(() => {});
  }
}
