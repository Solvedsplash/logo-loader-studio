/**
 * gif-exporter.js  (client-side animated GIF)
 * ─────────────────────────────────────────────────────────────────
 * Uses gifenc (pure-JS, no web workers) to produce a looping animated
 * GIF that matches the canvas preview as closely as possible.
 *
 * GIF is limited to 256 colours with no real transparency.
 * To minimise banding/dithering we:
 *   1. Always render with an opaque matte background
 *   2. Pre-composite the frame fully on canvas before sampling
 *   3. Use rgb444 format for colour-distance comparisons
 *      (better perceptual accuracy than rgb565 for smooth gradients)
 *   4. Use the maximum palette size (256 colours) per frame
 */

import { GIFEncoder, quantize, applyPalette, prequantize } from 'gifenc';

/**
 * Export an animation as an animated GIF.
 *
 * @param {object}           opts
 * @param {object}           opts.CoreEngine       CoreEngine instance
 * @param {object}           opts.animation        Animation config (speed-adjusted duration)
 * @param {HTMLImageElement} opts.logoImg           Loaded SVG Image element
 * @param {Array}            opts.svgPathsData      SVG path data array
 * @param {number}           opts.fps               Frames per second (default 20)
 * @param {string}           opts.quality           'low'|'medium'|'high'|'ultra' (unused – always max palette)
 * @param {string}           opts.backgroundColor   CSS colour string – always opaque
 * @param {number}           opts.size              Square output size in px (default 420)
 * @param {Function}         opts.onProgress        Called with (0..1)
 * @returns {Promise<Blob>}  image/gif blob
 */
export async function exportToGif({
  CoreEngine,
  animation,
  logoImg,
  svgPathsData = [],
  fps = 20,
  quality = 'high',
  backgroundColor = '#000000',
  size = 420,
  onProgress,
}) {
  if (!CoreEngine?.getFrameState || !CoreEngine?.renderStateToCanvas) {
    throw new Error('CoreEngine must expose getFrameState() and renderStateToCanvas().');
  }
  if (!logoImg) {
    throw new Error('logoImg is required for GIF export.');
  }

  const matteColor = backgroundColor || '#000000';
  const delay      = Math.round(1000 / fps); // ms per frame

  // ── Offscreen canvas – matches the preview's virtual design space ──
  // We render at double the output size then draw down to `size` for
  // better anti-aliasing and colour accuracy on the final samples.
  const RENDER_SIZE = size * 2;
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width  = RENDER_SIZE;
  renderCanvas.height = RENDER_SIZE;
  const renderCtx = renderCanvas.getContext('2d');

  // Output canvas at final GIF pixel size
  const outCanvas = document.createElement('canvas');
  outCanvas.width  = size;
  outCanvas.height = size;
  const outCtx = outCanvas.getContext('2d');

  // ── Frame loop ────────────────────────────────────────────────────
  const durationMs  = Math.max(100, animation.duration);
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

  const gif = GIFEncoder();

  for (let i = 0; i < totalFrames; i++) {
    const progress = totalFrames === 1 ? 0 : i / (totalFrames - 1);

    // 1. Render at 2× into renderCanvas with solid matte
    const state = CoreEngine.getFrameState(progress, animation, svgPathsData);
    const renderState = {
      ...state,
      global: { ...state.global, backgroundColor: matteColor },
    };
    CoreEngine.renderStateToCanvas(renderCtx, renderState, logoImg);

    // 2. Downscale to output size for smooth anti-aliasing
    outCtx.clearRect(0, 0, size, size);
    outCtx.drawImage(renderCanvas, 0, 0, size, size);

    // 3. Extract RGBA pixels
    const imageData = outCtx.getImageData(0, 0, size, size);
    const data = imageData.data; // Uint8ClampedArray

    // 4. Prequantize: slightly round RGB channels to reduce noise
    //    before palette building (roundRGB=4 is very mild)
    prequantize(data, { roundRGB: 4, roundAlpha: 10, oneBitAlpha: null });

    // 5. Build a 256-colour palette using rgb444 format for
    //    perceptually accurate colour distances on smooth gradients
    const palette = quantize(data, 256, { format: 'rgb444' });

    // 6. Map every pixel to its nearest palette colour
    const index = applyPalette(data, palette, 'rgb444');

    // 7. Encode frame
    gif.writeFrame(index, size, size, {
      palette,
      delay,
      repeat: 0, // loop forever
    });

    if (onProgress) onProgress((i + 1) / totalFrames);
  }

  gif.finish();

  const buffer = gif.bytesView();
  return new Blob([buffer], { type: 'image/gif' });
}
