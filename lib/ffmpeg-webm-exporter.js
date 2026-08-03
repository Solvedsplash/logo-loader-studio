/**
 * ffmpeg-webm-exporter.js  (client-side, TRANSPARENT WebM via ffmpeg.wasm)
 * ─────────────────────────────────────────────────────────────────
 * Fallback path used when the server-side FFmpeg route (/api/export) is
 * unavailable — e.g. a Vercel function timeout on constrained plans. It
 * produces a VP9 WebM WITH a real alpha channel (yuva420p) entirely in the
 * browser via ffmpeg.wasm, matching what the server route produces.
 *
 * Why not WebCodecs: Chrome's VP9 VideoEncoder only writes yuv420p — it has
 * no alpha plane. Only libvpx-vp9 can emit yuva420p, which is what we use
 * here (and what the server route uses).
 *
 * The ~31MB WASM core is fetched from a CDN ONLY when this fallback runs,
 * so it adds no cost to the happy path. We use the single-threaded
 * @ffmpeg/core (not core-mt) because the multithreaded build needs
 * SharedArrayBuffer, which requires COOP/COEP headers that Vercel does not
 * set by default.
 */

const CORE_VERSION = '0.12.10';
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

// Same CRF mapping as the server route (app/api/export/route.js).
const CRF_MAP = { low: 35, medium: 25, high: 15, ultra: 0 };

// Upper bound on the raw RGBA buffer we will build (~63MB at 420px/30fps/90fr).
const MAX_RAW_BYTES = 400 * 1024 * 1024;

let ffmpegPromise = null;
let currentOnProgress = null;

/**
 * Lazily create (and reuse) the ffmpeg.wasm instance. The progress listener is
 * registered once and reads the mutable currentOnProgress so repeated exports
 * don't stack duplicate handlers.
 */
async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpeg.on('progress', ({ progress }) => {
        // Encode phase is the back half of overall progress.
        if (currentOnProgress && typeof progress === 'number') {
          currentOnProgress(0.5 + 0.5 * Math.min(1, progress));
        }
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

/**
 * Export an animation as a transparent (alpha) VP9 WebM, entirely in-browser.
 *
 * @param {object}           opts
 * @param {object}           opts.CoreEngine       CoreEngine instance (getFrameState + renderStateToCanvas)
 * @param {object}           opts.animation        Animation config (already speed-adjusted duration)
 * @param {HTMLImageElement} opts.logoImg           Loaded SVG Image element
 * @param {Array}            opts.svgPathsData      SVG path data array
 * @param {number}           opts.fps               Frames per second (default 30)
 * @param {string}           opts.quality           'low'|'medium'|'high'|'ultra' → CRF
 * @param {number}           opts.size              Square output size in px (default 420)
 * @param {Function}         opts.onProgress        Called with (0..1)
 * @returns {Promise<Blob>}  video/webm blob with alpha
 */
export async function exportToFfmpegWebM({
  CoreEngine,
  animation,
  logoImg,
  svgPathsData = [],
  fps = 30,
  quality = 'high',
  size = 420,
  onProgress,
}) {
  if (typeof document === 'undefined' || typeof CanvasRenderingContext2D === 'undefined') {
    throw new Error('ffmpeg.wasm export must run in a browser.');
  }
  if (!CoreEngine?.getFrameState || !CoreEngine?.renderStateToCanvas) {
    throw new Error('CoreEngine must expose getFrameState() and renderStateToCanvas().');
  }
  if (!logoImg) {
    throw new Error('logoImg is required for WebM export.');
  }

  const durationMs = Math.max(100, animation.duration);
  const totalFrames = Math.max(2, Math.round((durationMs / 1000) * fps));
  const crf = CRF_MAP[quality] ?? CRF_MAP.high;

  // Render at the requested size (capped to 720px) to keep raw RGBA memory sane.
  const renderSize = Math.min(720, Math.max(size, 128)) & ~1; // even
  const frameBytes = renderSize * renderSize * 4;
  const rawBytes = frameBytes * totalFrames;

  if (rawBytes > MAX_RAW_BYTES) {
    throw new Error(
      `This export (${renderSize}px, ${fps}fps, ${totalFrames} frames) is too large for ` +
      'in-browser fallback encoding. Lower the size or FPS, or use the server export.'
    );
  }

  // ── 1. Capture frames to raw RGBA ────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = renderSize;
  canvas.height = renderSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const raw = new Uint8Array(rawBytes);
  for (let i = 0; i < totalFrames; i++) {
    // Absolute progress — identical to the preview/export loops.
    const progress = totalFrames === 1 ? 0 : i / (totalFrames - 1);

    // Transparent canvas — we control the alpha, not the engine.
    ctx.clearRect(0, 0, renderSize, renderSize);
    const state = CoreEngine.getFrameState(progress, animation, svgPathsData);
    const s = { ...state, global: { ...state.global, backgroundColor: null } };
    CoreEngine.renderStateToCanvas(ctx, s, logoImg);

    const imageData = ctx.getImageData(0, 0, renderSize, renderSize);
    raw.set(imageData.data, i * frameBytes);

    // Capture phase is the first half of progress.
    if (onProgress) onProgress((i + 1) / totalFrames * 0.5);
  }

  // ── 2. Encode VP9 + alpha (yuva420p) with ffmpeg.wasm ───────────────────
  let ffmpeg = null;
  try {
    ffmpeg = await getFFmpeg();
    currentOnProgress = onProgress;

    await ffmpeg.writeFile('frames.raw', raw);

    const args = [
      '-f',      'rawvideo',
      '-pix_fmt','rgba',
      '-s',      `${renderSize}x${renderSize}`,
      '-r',      String(fps),
      '-i',      'frames.raw',
      '-c:v',    'libvpx-vp9',
      '-pix_fmt','yuva420p',
      '-lossless', crf === 0 ? '1' : '0',
      '-crf',    String(crf),
      '-b:v',    '0',                     // CRF mode (VBR with quality target)
      '-deadline','good',
      '-cpu-used','4',
      '-auto-alt-ref', '0',               // MUST be 0 for alpha
      '-lag-in-frames', '0',              // fixes VP9 premature-end in browsers
      '-an',
      '-f',      'webm',
      'out.webm',
    ];
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile('out.webm');
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));

    if (!bytes || bytes.byteLength < 32) {
      throw new Error(
        `ffmpeg.wasm produced a ${bytes?.byteLength ?? 0}-byte WebM — encoding failed silently.`
      );
    }

    if (onProgress) onProgress(1);

    console.log(`[WebM] ffmpeg.wasm done: ${totalFrames} frames, ${(bytes.byteLength / 1024).toFixed(0)} KB`);
    return new Blob([bytes], { type: 'video/webm' });
  } finally {
    // Best-effort cleanup so a retry doesn't fail on existing files.
    currentOnProgress = null;
    if (ffmpeg) {
      try { await ffmpeg.deleteFile('frames.raw'); } catch {}
      try { await ffmpeg.deleteFile('out.webm'); } catch {}
    }
  }
}
