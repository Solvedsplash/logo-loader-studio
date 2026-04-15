/**
 * animation-engine-export.js  (v3.0 — Single Source of Truth IIFE)
 *
 * Self-contained IIFE — zero import/export statements.
 * Safe to inject into Puppeteer via page.addScriptTag({ content }).
 *
 * ─── IMPORTANT: KEEP IN SYNC WITH animation-engine.js ───────────────────────
 * This file is the canonical export-side clone of the preview engine.
 * Every animation case MUST produce identical output for the same (progress) input.
 *
 * Exposes: window.renderAnimFrame(ctx, progress, logoImg, animation, svgPaths)
 */
(function () {

  // ─── EASING HELPERS ─────────────────────────────────────────────────────────

  function cubicBezier(x1, y1, x2, y2) {
    if (!(0 <= x1 && x1 <= 1 && 0 <= x2 && x2 <= 1)) return function (t) { return t; };
    if (x1 === y1 && x2 === y2) return function (t) { return t; };
    var sampleValues = new Float32Array(11);
    for (var i = 0; i < 11; ++i) {
      sampleValues[i] = (((1.0 - 3.0 * x2 + 3.0 * x1) * (i * 0.1) + (3.0 * x2 - 6.0 * x1)) * (i * 0.1) + (3.0 * x1)) * (i * 0.1);
    }
    function getTForX(aX) {
      var intervalStart = 0.0, currentSample = 1;
      for (; currentSample !== 10 && sampleValues[currentSample] <= aX; ++currentSample) intervalStart += 0.1;
      --currentSample;
      var guessForT = intervalStart + (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]) * 0.1;
      for (var j = 0; j < 4; ++j) {
        var slope = 3.0 * (1.0 - 3.0 * x2 + 3.0 * x1) * guessForT * guessForT + 2.0 * (3.0 * x2 - 6.0 * x1) * guessForT + (3.0 * x1);
        if (slope === 0) return guessForT;
        guessForT -= ((((1.0 - 3.0 * x2 + 3.0 * x1) * guessForT + (3.0 * x2 - 6.0 * x1)) * guessForT + (3.0 * x1)) * guessForT - aX) / slope;
      }
      return guessForT;
    }
    return function (x) {
      if (x === 0 || x === 1) return x;
      var t = getTForX(x);
      return (((1.0 - 3.0 * y2 + 3.0 * y1) * t + (3.0 * y2 - 6.0 * y1)) * t + (3.0 * y1)) * t;
    };
  }

  var EASING_MAP = {
    'linear':       [0,    0,    1,    1],
    'ease':         [0.25, 0.1,  0.25, 1],
    'ease-in':      [0.42, 0,    1,    1],
    'ease-out':     [0,    0,    0.58, 1],
    'ease-in-out':  [0.42, 0,    0.58, 1],
  };

  function getEasingFn(easingStr) {
    if (!easingStr) return function (t) { return t; };
    if (EASING_MAP[easingStr]) return cubicBezier.apply(null, EASING_MAP[easingStr]);
    var match = easingStr.match(/cubic-bezier\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
    if (match) return cubicBezier(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]));
    return function (t) { return t; };
  }

  var EASE = {
    easeInOut: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    cubicBezier: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    pop: function (t) { return 1 - Math.pow(1 - t, 3); },
    bounce: function (t) {
      var n1 = 7.5625, d1 = 2.75, _t = t;
      if (_t < 1 / d1)   return n1 * _t * _t;
      if (_t < 2 / d1)   return n1 * (_t -= 1.5  / d1) * _t + 0.75;
      if (_t < 2.5 / d1) return n1 * (_t -= 2.25 / d1) * _t + 0.9375;
      return n1 * (_t -= 2.625 / d1) * _t + 0.984375;
    },
    backOut: function (t) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ─── MAIN RENDER FUNCTION ────────────────────────────────────────────────────

  /**
   * renderAnimFrame — deterministic, time-driven renderer.
   * Identical output to animation-engine.js:renderFrame() for the same inputs.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number}   progress  0..1  (fraction of animation cycle, NOT eased)
   * @param {HTMLImageElement} logoImg
   * @param {object}   animation  { family, easing, vars, backgroundColor? }
   * @param {Array}    svgPaths   [{ d, length, color, strokeWidth }]
   */
  function renderAnimFrame(ctx, progress, logoImg, animation, svgPaths) {
    if (!ctx || !logoImg) return;

    var width  = ctx.canvas.width;
    var height = ctx.canvas.height;

    // CRITICAL: Always reset filter at the top of every frame to prevent contamination
    ctx.filter = 'none';

    // Background
    if (animation.backgroundColor) {
      ctx.fillStyle = animation.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    var globalEase = getEasingFn(animation.easing);
    var t = clamp(globalEase(progress), 0, 1);   // eased progress

    var FAMILY = animation.family;
    var vars   = animation.vars || {};

    var AMP_Y           = parseFloat(vars['--amp-y'])            || 0;
    var AMP_X           = parseFloat(vars['--amp-x'])            || 0;
    var SCALE_MIN       = parseFloat(vars['--scale-min'])        || 1;
    var SCALE_MAX       = parseFloat(vars['--scale-max'])        || 1;
    var FADE_MIN        = parseFloat(vars['--fade-min'])         || 0;
    var ROTATE_DEG      = parseFloat(vars['--rotate-deg'])       || 0;
    var BLUR_MAX        = parseFloat(vars['--blur-max'])         || 0;
    var PARTICLE_OFFSET = parseFloat(vars['--particle-offset'])  || 0;

    // State variables — same names and initial values as preview engine
    var tx      = width  / 2;
    var ty      = height / 2;
    var scale   = 1;
    var rotate  = 0;
    var opacity = 1;
    var blur    = 0;

    switch (FAMILY) {

      case 'notion-fade':
      case 'fade-in-out':
        opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
        break;

      case 'linear-breathe':
        scale   = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(0.94, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
        break;

      case 'vercel-float':
        ty += t < 0.5 ? lerp(AMP_Y * 0.8, -AMP_Y, t * 2) : lerp(-AMP_Y, AMP_Y * 0.8, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(0.92, 1, t * 2) : lerp(1, 0.92, (t - 0.5) * 2);
        break;

      case 'stripe-slide':
        ty += t < 0.5 ? lerp(AMP_Y, 0, t * 2) : lerp(0, -AMP_Y, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'github-zoom':
        scale   = t < 0.5 ? lerp(SCALE_MIN - 0.06, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'framer-blur':
        blur    = t < 0.5 ? lerp(0, BLUR_MAX, t * 2) : lerp(BLUR_MAX, 0, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
        break;

      case 'figma-tilt':
        rotate  = t < 0.5 ? lerp(-ROTATE_DEG, ROTATE_DEG, t * 2) : lerp(ROTATE_DEG, -ROTATE_DEG, (t - 0.5) * 2);
        scale   = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(0.95, 1, t * 2) : lerp(1, 0.95, (t - 0.5) * 2);
        break;

      case 'slack-spin':
        rotate  = ROTATE_DEG * 8 * t;
        opacity = t < 0.5 ? lerp(0.9, 1, t * 2) : lerp(1, 0.9, (t - 0.5) * 2);
        break;

      case 'airtable-drift':
        tx     += t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'intercom-pop': {
        var et = EASE.pop(t);
        scale = et < 0.2 ? lerp(SCALE_MIN, SCALE_MAX, et / 0.2)
          : et < 0.6     ? lerp(SCALE_MAX, (SCALE_MIN + SCALE_MAX) / 2, (et - 0.2) / 0.4)
          :                 lerp((SCALE_MIN + SCALE_MAX) / 2, SCALE_MIN, (et - 0.6) / 0.4);
        opacity = et < 0.2 ? lerp(0.88, 1, et / 0.2)
          : et < 0.6       ? lerp(1, 0.95, (et - 0.2) / 0.4)
          :                   lerp(0.95, 0.88, (et - 0.6) / 0.4);
        break;
      }

      case 'dropbox-reveal':
        ty     += t < 0.6 ? lerp(AMP_Y * 0.8, 0, t / 0.6) : lerp(0, -AMP_Y * 0.35, (t - 0.6) / 0.4);
        scale   = t < 0.6 ? lerp(SCALE_MIN, 1, t / 0.6)   : lerp(1, 1.01, (t - 0.6) / 0.4);
        opacity = t < 0.35 ? lerp(0, 0.8, t / 0.35)
          : t < 0.6         ? lerp(0.8, 1, (t - 0.35) / 0.25)
          :                    lerp(1, 0.9, (t - 0.6) / 0.4);
        break;

      case 'asana-sweep':
        tx     += t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
        scale   = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'shopify-soft-bounce':
        ty += t < 0.22 ? lerp(0, -AMP_Y, t / 0.22)
          : t < 0.42   ? lerp(-AMP_Y, -AMP_Y * 0.3, (t - 0.22) / 0.2)
          : t < 0.7    ? lerp(-AMP_Y * 0.3, -AMP_Y * 0.6, (t - 0.42) / 0.28)
          :               lerp(-AMP_Y * 0.6, 0, (t - 0.7) / 0.3);
        scale   = t < 0.22 ? lerp(SCALE_MIN, SCALE_MAX, EASE.bounce(t)) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.22) / 0.78);
        opacity = t < 0.22 ? lerp(0.9, 1, t / 0.22) : lerp(1, 0.9, (t - 0.22) / 0.78);
        break;

      case 'monday-blink':
        opacity = (t > 0.18 && t < 0.28) || (t > 0.48 && t < 0.58) ? FADE_MIN : 1;
        scale   = opacity === FADE_MIN ? SCALE_MIN : 1;
        break;

      case 'loom-settle':
        ty += t < 0.5  ? lerp(AMP_Y,       -AMP_Y * 0.5,   t * 2)
          : t < 0.72   ? lerp(-AMP_Y * 0.5, AMP_Y * 0.15,  (t - 0.5) / 0.22)
          :               lerp(AMP_Y * 0.15, 0,             (t - 0.72) / 0.28);
        scale = t < 0.5    ? lerp(SCALE_MIN, SCALE_MAX, t * 2)
          : t < 0.72       ? lerp(SCALE_MAX, 0.99, (t - 0.5) / 0.22)
          :                   lerp(0.99, 1, (t - 0.72) / 0.28);
        opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
        break;

      case 'canva-glide':
        tx     += t < 0.5 ? lerp(-AMP_X * 0.8, 0, t * 2) : lerp(0, AMP_X * 0.8, (t - 0.5) / 0.5);
        ty     += t < 0.5 ? lerp(AMP_Y * 0.4, 0, t * 2)  : lerp(0, -AMP_Y * 0.4, (t - 0.5) / 0.5);
        scale   = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2)    : lerp(1, SCALE_MAX, (t - 0.5) / 0.5);
        opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2)     : lerp(1, FADE_MIN, (t - 0.5) / 0.5);
        break;

      case 'scale-pulse':
        scale   = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
        opacity = t < 0.5 ? lerp(0.86, 1, t * 2) : lerp(1, 0.86, (t - 0.5) * 2);
        break;

      case 'path-draw':
        // Logo image fade — path overlay handled separately below
        if      (t < 0.35) opacity = 0;
        else if (t < 0.60) opacity = lerp(0, 1, (t - 0.35) / 0.25);
        else if (t < 0.85) opacity = 1;
        else if (t < 0.95) opacity = lerp(1, 0, (t - 0.85) / 0.10);
        else               opacity = 0;
        break;

      case 'pro-morph': {
        // Uses raw `progress` (NOT eased `t`) for the morph timeline.
        // Must match animation-engine.js exactly.
        var morphT = progress;
        if (morphT < 0.35) {
          var r1 = morphT / 0.35;
          scale   = lerp(1, 0.45, EASE.easeInOut(r1));
          blur    = lerp(0, 24,   EASE.easeInOut(r1));
          opacity = lerp(1, 0,    EASE.easeInOut(clamp(r1 * 1.5, 0, 1))); // Fade logo out faster
        } else if (morphT > 0.65) {
          var r3 = (morphT - 0.65) / 0.35;
          scale   = lerp(0.45, 1, EASE.backOut(r3));
          blur    = lerp(24, 0,   EASE.easeInOut(r3));
          opacity = lerp(0, 1,    EASE.easeInOut(clamp((r3 - 0.2) / 0.8, 0, 1))); // Fade logo in
        } else {
          scale   = 0.45;
          blur    = 24;
          opacity = 0;
        }
        // Liquid-morph filter — applied to ctx BEFORE the logo save/restore block below
        if (blur > 0) {
          ctx.filter = 'blur(' + (blur / 3) + 'px) contrast(20)';
        }
        break;
      }

      default:
        break;
    }

    // ─── SIZING (identical formula to preview engine) ─────────────────────────
    var baseScale  = width / 440; // Reference scale — preview canvas is 440 logical px wide
    var targetSize = 220;
    var imgW       = logoImg.width  || targetSize;
    var imgH       = logoImg.height || targetSize;
    var fitScale   = targetSize / Math.max(imgW, imgH);
    var totalScale = scale * baseScale * fitScale;

    // ─── DRAW LOGO ────────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(totalScale, totalScale);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.globalAlpha = opacity;
    // Note: for pro-morph, ctx.filter was set above (before save/restore).
    // Inside save(), it is inherited; we override it here for the pixel-wise blur:
    if (blur > 0) ctx.filter = 'blur(' + blur + 'px)';
    ctx.drawImage(logoImg, -imgW / 2, -imgH / 2, imgW, imgH);
    ctx.restore();

    // CRITICAL: Reset filter after every logo draw — prevents contamination of overlays
    ctx.filter = 'none';

    // ─── PATH DRAW OVERLAY ───────────────────────────────────────────────────
    if (FAMILY === 'path-draw' && svgPaths && svgPaths.length > 0) {
      svgPaths.forEach(function (pathData) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(totalScale, totalScale);
        ctx.translate(-imgW / 2, -imgH / 2);

        var p   = new Path2D(pathData.d);
        var len = pathData.length;
        var pOpacity    = 0;
        var drawProgress = 0;

        if      (t < 0.05) { pOpacity = lerp(0, 1, t / 0.05); drawProgress = 0; }
        else if (t < 0.50) { pOpacity = 1; drawProgress = EASE.easeInOut((t - 0.05) / 0.45); }
        else if (t < 0.65) { pOpacity = 1; drawProgress = 1; }
        else if (t < 0.70) { pOpacity = lerp(1, 0, (t - 0.65) / 0.05); drawProgress = 1; }

        if (pOpacity > 0) {
          ctx.globalAlpha  = pOpacity;
          ctx.strokeStyle  = pathData.color || '#91f6ff';
          ctx.lineWidth    = parseFloat(pathData.strokeWidth) || 2;
          ctx.lineCap      = 'round';
          ctx.lineJoin     = 'round';
          var visibleLen   = drawProgress * len;
          ctx.setLineDash([visibleLen, len]);
          ctx.lineDashOffset = 0;
          ctx.stroke(p);
        }
        ctx.restore();
      });
    }

    // ─── PARTICLE BURST ──────────────────────────────────────────────────────
    if (FAMILY === 'particle-burst') {
      var offsets = [
        { dx: PARTICLE_OFFSET * 1    * baseScale, dy: PARTICLE_OFFSET * -0.4  * baseScale, delay: 0.00 },
        { dx: PARTICLE_OFFSET * 0.45 * baseScale, dy: PARTICLE_OFFSET * -1    * baseScale, delay: 0.04 },
        { dx: PARTICLE_OFFSET * -0.75* baseScale, dy: PARTICLE_OFFSET * -0.8  * baseScale, delay: 0.08 },
        { dx: PARTICLE_OFFSET * 0.95 * baseScale, dy: PARTICLE_OFFSET * 0.75  * baseScale, delay: 0.12 },
        { dx: PARTICLE_OFFSET * -0.5 * baseScale, dy: PARTICLE_OFFSET * 1     * baseScale, delay: 0.16 },
        { dx: PARTICLE_OFFSET * -1   * baseScale, dy: PARTICLE_OFFSET * 0.15  * baseScale, delay: 0.20 }
      ];
      offsets.forEach(function (off) {
        var pt = Math.max(0, (t - off.delay) / (1 - off.delay));
        var pX = width / 2, pY = height / 2, pScale = 0, pAlpha = 0;
        if (pt < 0.2) {
          pAlpha = lerp(0, 1, pt / 0.2);
          pScale = lerp(0.5, 1, pt / 0.2);
        } else if (pt < 0.75) {
          var pr = (pt - 0.2) / 0.55;
          pAlpha = lerp(1, 0.65, pr);
          pScale = 1;
          pX += lerp(0, off.dx, pr);
          pY += lerp(0, off.dy, pr);
        } else {
          var pr2 = (pt - 0.75) / 0.25;
          pAlpha = lerp(0.65, 0, pr2);
          pScale = lerp(1, 0.8, pr2);
          pX += off.dx;
          pY += off.dy;
        }
        if (pAlpha > 0) {
          ctx.save();
          ctx.translate(pX, pY);
          ctx.scale(pScale * baseScale, pScale * baseScale);
          ctx.globalAlpha  = pAlpha;
          ctx.fillStyle    = '#91f6ff';
          ctx.shadowBlur   = 10 * baseScale;
          ctx.shadowColor  = 'rgba(145,246,255,0.8)';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // ─── PRO MORPH RING ───────────────────────────────────────────────────────
    if (FAMILY === 'pro-morph') {
      // CRITICAL: reset filter before drawing ring — it must never inherit logo blur
      ctx.filter = 'none';

      var ringStart  = 0.05;
      var ringEnd    = 0.95;
      var baseColor  = (svgPaths && svgPaths.length > 0) ? (svgPaths[0].color || '#91f6ff') : '#91f6ff';

      if (progress > ringStart && progress < ringEnd) {
        var ringAlpha  = 1;
        var ringScale  = 1;
        var ringRotate = 0;

        if (progress < 0.35) {
          var rIn = (progress - ringStart) / (0.35 - ringStart);
          ringAlpha  = lerp(0, 1, EASE.easeInOut(rIn));
          ringScale  = lerp(0.8, 1, EASE.easeInOut(rIn));
        } else if (progress > 0.65) {
          var rOut = (progress - 0.65) / (ringEnd - 0.65);
          ringAlpha  = lerp(1, 0, EASE.easeInOut(rOut));
          ringScale  = lerp(1, 1.2, EASE.easeInOut(rOut));
        } else {
          var holdT  = (progress - 0.35) / 0.3;
          ringScale  = 1 + Math.sin(holdT * Math.PI * 4) * 0.04;
          ringRotate = holdT * Math.PI * 2; // One full rotation during hold phase
        }

        if (ringAlpha > 0) {
          ctx.save();
          ctx.filter = 'none'; // Double-lock: isolated from any outer state
          ctx.translate(width / 2, height / 2);
          ctx.rotate(ringRotate);
          ctx.scale(ringScale * baseScale, ringScale * baseScale);
          ctx.globalAlpha  = ringAlpha * 0.9;
          ctx.strokeStyle  = baseColor;
          ctx.lineWidth    = 14;
          ctx.lineCap      = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, 72, 0, Math.PI * 1.75); // Open arc — professional loader look
          ctx.stroke();
          ctx.restore();
          // Reset after restore in case restore re-applies a stale filter
          ctx.filter = 'none';
        }
      }
    }
  }

  // ─── EXPOSE ──────────────────────────────────────────────────────────────────
  window.renderAnimFrame = renderAnimFrame;

})();
