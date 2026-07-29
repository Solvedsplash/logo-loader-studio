/**
 * webm-exporter.js  (client-side, opaque WebM only)
 * ─────────────────────────────────────────────────────────────────
 * Uses WebCodecs + webm-muxer v5 to produce a frame-accurate VP9 WebM
 * with a solid background color. For transparent (alpha) WebM, the
 * server-side FFmpeg route is used (see /api/export/route.js).
 *
 * Why this works (and why transparent WebM must go to server):
 *  • WebCodecs VideoEncoder with VP9 does NOT support alpha channel
 *    encoding in any shipping browser. Chrome's implementation of
 *    vp09 profile 0 only writes yuv420p (no alpha plane).
 *  • Lottie/LottieFiles achieve transparent WebM via FFmpeg with
 *    -pix_fmt yuva420p, which writes a separate alpha bitstream
 *    into the WebM container — something only libvpx-vp9 can do.
 *  • For opaque exports we use WebCodecs because it is fast (GPU),
 *    deterministic, and requires no server round-trip.
 */

const BITRATE_MAP = {
  low:    1_000_000,
  medium: 4_000_000,
  high:   8_000_000,
  ultra: 16_000_000,
};

/**
 * Export an animation as an opaque (solid background) WebM.
 *
 * @param {object}           opts
 * @param {object}           opts.CoreEngine       CoreEngine instance (must expose getFrameState + renderStateToCanvas)
 * @param {object}           opts.animation        Animation config (already speed-adjusted duration)
 * @param {HTMLImageElement} opts.logoImg           Loaded SVG Image element
 * @param {Array}            opts.svgPathsData      SVG path data array
 * @param {number}           opts.fps               Frames per second (default 30)
 * @param {string}           opts.quality           'low'|'medium'|'high'|'ultra'
 * @param {string}           opts.backgroundColor   CSS color string – required, must be opaque
 * @param {number}           opts.size              Square output size in px (default 420)
 * @param {Function}         opts.onProgress        Called with (0..1)
 * @returns {Promise<Blob>}  video/webm blob
 */
export async function exportToWebM({
  CoreEngine,
  animation,
  logoImg,
  svgPathsData = [],
  fps = 30,
  quality = 'high',
  backgroundColor = '#000000',
  size = 420,
  onProgress,
}) {
  // ── Guards ────────────────────────────────────────────────────────────────
  if (typeof VideoEncoder === 'undefined') {
    throw new Error(
      'WebCodecs is not supported in this browser. Please use Chrome 94+, Edge 94+, or Opera 81+.'
    );
  }
  if (!CoreEngine?.getFrameState || !CoreEngine?.renderStateToCanvas) {
    throw new Error('CoreEngine must expose getFrameState() and renderStateToCanvas().');
  }
  if (!logoImg) {
    throw new Error('logoImg is required for WebM export.');
  }

  // ── Timing ────────────────────────────────────────────────────────────────
  const durationMs   = Math.max(100, animation.duration);       // ms
  const totalFrames  = Math.max(2, Math.round((durationMs / 1000) * fps));
  const frameDurUs   = Math.round(1_000_000 / fps);             // µs per frame

  // ── webm-muxer ───────────────────────────────────────────────────────────
  // Must be dynamic-imported (ESM-only package)
  const { Muxer, ArrayBufferTarget } = await import('webm-muxer');

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec:     'V_VP9',
      width:     size,
      height:    size,
      frameRate: fps,         // written to container metadata (helps players)
    },
    // firstTimestampBehavior defaults to 'strict' which is what we want
    // since we generate timestamps ourselves starting at 0.
  });

  // ── VideoEncoder ──────────────────────────────────────────────────────────
  let encodeError = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error:  (e) => {
      encodeError = e;
      console.error('[WebM] VideoEncoder error:', e);
    },
  });

  // Check if the codec is actually supported before configuring
  const codecSupport = await VideoEncoder.isConfigSupported({
    codec:   'vp09.00.10.08',
    width:   size,
    height:  size,
    bitrate: BITRATE_MAP[quality] ?? BITRATE_MAP.high,
  });
  if (!codecSupport.supported) {
    throw new Error(
      'VP9 encoding is not supported by your browser\'s VideoEncoder. Try Chrome or Edge.'
    );
  }

  encoder.configure({
    codec:   'vp09.00.10.08',   // VP9 profile 0, 8-bit, YUV 4:2:0
    width:   size,
    height:  size,
    bitrate: BITRATE_MAP[quality] ?? BITRATE_MAP.high,
    framerate: fps,              // hint for bitrate controller
  });

  // ── Canvas setup ─────────────────────────────────────────────────────────
  // Always use a regular <canvas> — OffscreenCanvas has inconsistent
  // behaviour with VideoFrame in some Chrome versions on Windows.
  const canvas     = document.createElement('canvas');
  canvas.width     = size;
  canvas.height    = size;
  const ctx        = canvas.getContext('2d', { willReadFrequently: false });

  // ── Frame loop ────────────────────────────────────────────────────────────
  for (let i = 0; i < totalFrames; i++) {
    if (encodeError) throw encodeError;

    // Progress is absolute — frame index over (totalFrames - 1)
    // This is identical to the preview loop's `elapsed / duration` at each exact frame.
    const progress = totalFrames === 1 ? 0 : i / (totalFrames - 1);

    // 1. Solid background (required for opaque VP9)
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);

    // 2. Render animation frame — same code path as live preview
    const state = CoreEngine.getFrameState(progress, animation, svgPathsData);
    // Tell engine not to draw its own background (we've already drawn ours)
    const renderState = {
      ...state,
      global: { ...state.global, backgroundColor: null },
    };
    CoreEngine.renderStateToCanvas(ctx, renderState, logoImg);

    // 3. Encode — timestamp must be strictly increasing integers (µs)
    const timestamp = i * frameDurUs;
    const frame = new VideoFrame(canvas, {
      timestamp,
      duration: frameDurUs,
    });

    // Key-frame every 2 seconds to ensure seekability
    const isKey = i === 0 || i % (fps * 2) === 0;
    encoder.encode(frame, { keyFrame: isKey });
    frame.close();

    // 4. Report progress (exclude 100% — that comes after flush+finalize)
    if (onProgress) onProgress(i / totalFrames);

    // 5. Back-pressure: yield to encoder thread when queue gets deep
    if (encoder.encodeQueueSize > 8) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // ── Flush & finalize ──────────────────────────────────────────────────────
  // encoder.flush() resolves only after ALL pending encode jobs complete
  // and ALL output callbacks have been called. This is MANDATORY before
  // calling muxer.finalize() — otherwise the last chunks are not muxed.
  await encoder.flush();

  if (encodeError) throw encodeError;

  muxer.finalize();

  if (onProgress) onProgress(1);

  // Per webm-muxer v5 docs, access buffer through muxer.target
  const { buffer } = muxer.target;

  if (!buffer || buffer.byteLength < 32) {
    throw new Error(
      `WebM muxer produced a ${buffer?.byteLength ?? 0}-byte buffer — encoding failed silently. ` +
      'Make sure VP9 encoding is supported and the animation has at least 2 frames.'
    );
  }

  console.log(`[WebM] Done: ${totalFrames} frames, ${(buffer.byteLength / 1024).toFixed(0)} KB`);
  return new Blob([buffer], { type: 'video/webm' });
}
