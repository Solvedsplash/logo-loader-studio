/**
 * gif-exporter.js  (client-side animated GIF)
 * ─────────────────────────────────────────────────────────────────
 * Uses gifenc (pure JS, no workers) to produce a looping animated GIF that
 * matches the canvas preview.
 *
 * GIF supports 256 colours and *1-bit* transparency — a pixel is either fully
 * opaque or fully clear. When the caller asks for a transparent background we
 * reserve a palette slot for it and threshold the alpha channel; otherwise the
 * engine paints an opaque matte and every pixel is kept.
 */

import { GIFEncoder, quantize, applyPalette, prequantize } from 'gifenc';

/**
 * @param {object}           opts
 * @param {object}           opts.CoreEngine        CoreEngine module
 * @param {object}           opts.animation         Resolved animation (duration already speed-adjusted)
 * @param {HTMLImageElement} opts.logoImg           Loaded logo image
 * @param {Array}            opts.svgPathsData      Extracted path data
 * @param {number}           opts.fps               Frames per second
 * @param {string|null}      opts.backgroundColor   Matte colour, or null for transparent
 * @param {number}           opts.size              Square output size in px
 * @param {Function}         opts.onProgress        Called with 0..1
 * @returns {Promise<Blob>}  image/gif
 */
export async function exportToGif({
  CoreEngine,
  animation,
  logoImg,
  svgPathsData = [],
  fps = 20,
  backgroundColor = null,
  size = 420,
  onProgress,
}) {
  if (!CoreEngine?.getFrameState || !CoreEngine?.renderStateToCanvas) {
    throw new Error('CoreEngine must expose getFrameState() and renderStateToCanvas().');
  }
  if (!logoImg) throw new Error('logoImg is required for GIF export.');

  const transparent = !backgroundColor;
  const delay = Math.round(1000 / Math.max(1, fps));

  // Render at 2× and draw down, for cleaner edges before quantisation.
  const RENDER_SIZE = size * 2;
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = RENDER_SIZE;
  renderCanvas.height = RENDER_SIZE;
  const renderCtx = renderCanvas.getContext('2d', { willReadFrequently: true });

  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });

  const durationMs = Math.max(100, animation.duration);
  const totalFrames = Math.max(2, Math.round((durationMs / 1000) * fps));

  const gif = GIFEncoder();

  for (let i = 0; i < totalFrames; i++) {
    // Sample over [0, 1). Including 1 duplicates frame 0 and stutters the loop.
    const progress = i / totalFrames;

    // The background comes from the animation itself, exactly as in the preview.
    const state = CoreEngine.getFrameState(progress, animation, svgPathsData);
    CoreEngine.renderStateToCanvas(renderCtx, state, logoImg);

    outCtx.clearRect(0, 0, size, size);
    outCtx.drawImage(renderCanvas, 0, 0, size, size);

    const imageData = outCtx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // oneBitAlpha collapses partial alpha to fully-on or fully-off, which is all
    // GIF can represent. Passing a threshold here (rather than null) is what makes
    // transparent GIF export work at all.
    prequantize(data, {
      roundRGB: 4,
      roundAlpha: transparent ? 0 : 10,
      oneBitAlpha: transparent ? 128 : null,
    });

    // One palette entry is reserved for the transparent index.
    const palette = quantize(data, transparent ? 255 : 256, {
      format: transparent ? 'rgba4444' : 'rgb444',
      oneBitAlpha: transparent,
    });

    const index = applyPalette(data, palette, transparent ? 'rgba4444' : 'rgb444');

    gif.writeFrame(index, size, size, {
      palette,
      delay,
      repeat: 0, // loop forever
      transparent,
      // gifenc places the fully-transparent colour at index 0 when oneBitAlpha
      // is enabled during quantisation.
      transparentIndex: transparent ? 0 : undefined,
      dispose: transparent ? 2 : -1, // restore-to-background, or frames stack up
    });

    if (onProgress) onProgress((i + 1) / totalFrames);
  }

  gif.finish();
  return new Blob([gif.bytesView()], { type: 'image/gif' });
}
