/**
 * Lottie-Level Animation Engine (Core Engine v3.0)
 * ─────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH.
 * This file is purely mathematical and stateless.
 * It is imported by the React preview AND injected into Puppeteer.
 */

(function(global) {

  // ─── MATH & EASING ───────────────────────────────────────────────
  function cubicBezier(x1, y1, x2, y2) {
    if (!(0 <= x1 && x1 <= 1 && 0 <= x2 && x2 <= 1)) return function(t) { return t; };
    if (x1 === y1 && x2 === y2) return function(t) { return t; };
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
    return function(x) {
      if (x === 0 || x === 1) return x;
      var t = getTForX(x);
      return (((1.0 - 3.0 * y2 + 3.0 * y1) * t + (3.0 * y2 - 6.0 * y1)) * t + (3.0 * y1)) * t;
    };
  }

  var EASING_MAP = {
    'linear':       [0, 0, 1, 1],
    'ease':         [0.25, 0.1, 0.25, 1],
    'ease-in':      [0.42, 0, 1, 1],
    'ease-out':     [0, 0, 0.58, 1],
    'ease-in-out':  [0.42, 0, 0.58, 1],
  };

  function getEasingFn(easingStr) {
    if (!easingStr) return function(t) { return t; };
    if (EASING_MAP[easingStr]) return cubicBezier.apply(null, EASING_MAP[easingStr]);
    var match = easingStr.match(/cubic-bezier\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
    if (match) return cubicBezier(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]));
    return function(t) { return t; };
  }

  var EASE = {
    easeInOut: function(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    cubicBezier: function(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    pop: function(t) { return 1 - Math.pow(1 - t, 3); },
    bounce: function(t) {
      var n1 = 7.5625, d1 = 2.75, _t = t;
      if (_t < 1 / d1) return n1 * _t * _t;
      if (_t < 2 / d1) return n1 * (_t -= 1.5 / d1) * _t + 0.75;
      if (_t < 2.5 / d1) return n1 * (_t -= 2.25 / d1) * _t + 0.9375;
      return n1 * (_t -= 2.625 / d1) * _t + 0.984375;
    },
    backOut: function(t) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  };

  var lerp = function(a, b, t) { return a + (b - a) * t; };
  var clamp = function(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };


  // ─── STATE ENGINE (PURE FUNCTION) ────────────────────────────────

  /**
   * Calculates the exact mathematical state of every visual element for a given time.
   * NO side effects. NO canvas context. NO DOM.
   * Same inputs MUST always yield identical outputs.
   */
  function getFrameState(progress, animation, svgPaths) {
    if (!svgPaths) svgPaths = [];
    var state = {
      global: {
        backgroundColor: animation.backgroundColor || null,
        progress: progress
      },
      logo: {
        tx: 0,
        ty: 0,
        scale: 1,
        rotate: 0,
        opacity: 1,
        blur: 0
      },
      paths: []
    };

    var globalEase = getEasingFn(animation.easing);
    var t = clamp(globalEase(progress), 0, 1); // Eased progress

    var FAMILY = animation.family;
    var vars = animation.vars || {};

    var AMP_Y           = parseFloat(vars['--amp-y'])            || 0;
    var AMP_X           = parseFloat(vars['--amp-x'])            || 0;
    var SCALE_MIN       = parseFloat(vars['--scale-min'])        || 1;
    var SCALE_MAX       = parseFloat(vars['--scale-max'])        || 1;
    var FADE_MIN        = parseFloat(vars['--fade-min'])         || 0;
    var ROTATE_DEG      = parseFloat(vars['--rotate-deg'])       || 0;
    var BLUR_MAX        = parseFloat(vars['--blur-max'])         || 0;
    switch (FAMILY) {
      case 'soft-breathe':
      case 'fade-in-out':
        state.logo.opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
        break;

      case 'gentle-pulse':
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(0.94, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
        break;

      case 'bob-float':
        state.logo.ty      += t < 0.5 ? lerp(AMP_Y * 0.8, -AMP_Y, t * 2) : lerp(-AMP_Y, AMP_Y * 0.8, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(0.92, 1, t * 2) : lerp(1, 0.92, (t - 0.5) * 2);
        break;

      case 'vertical-slide':
        state.logo.ty      += t < 0.5 ? lerp(AMP_Y, 0, t * 2) : lerp(0, -AMP_Y, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'zoom-fade':
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN - 0.06, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'blur-dissolve':
        state.logo.blur    = t < 0.5 ? lerp(0, BLUR_MAX, t * 2) : lerp(BLUR_MAX, 0, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
        break;

      case 'tilt-sway':
        state.logo.rotate  = t < 0.5 ? lerp(-ROTATE_DEG, ROTATE_DEG, t * 2) : lerp(ROTATE_DEG, -ROTATE_DEG, (t - 0.5) * 2);
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(0.95, 1, t * 2) : lerp(1, 0.95, (t - 0.5) * 2);
        break;

      case 'soft-spin':
        state.logo.rotate  = ROTATE_DEG * 8 * t;
        state.logo.opacity = t < 0.5 ? lerp(0.9, 1, t * 2) : lerp(1, 0.9, (t - 0.5) * 2);
        break;

      case 'horizontal-drift':
        state.logo.tx      += t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'elastic-pop':
        var et = EASE.pop(t);
        state.logo.scale = et < 0.2 ? lerp(SCALE_MIN, SCALE_MAX, et / 0.2)
          : et < 0.6     ? lerp(SCALE_MAX, (SCALE_MIN + SCALE_MAX) / 2, (et - 0.2) / 0.4)
          :                 lerp((SCALE_MIN + SCALE_MAX) / 2, SCALE_MIN, (et - 0.6) / 0.4);
        state.logo.opacity = et < 0.2 ? lerp(0.88, 1, et / 0.2)
          : et < 0.6       ? lerp(1, 0.95, (et - 0.2) / 0.4)
          :                   lerp(0.95, 0.88, (et - 0.6) / 0.4);
        break;

      case 'rise-reveal':
        state.logo.ty      += t < 0.6 ? lerp(AMP_Y * 0.8, 0, t / 0.6) : lerp(0, -AMP_Y * 0.35, (t - 0.6) / 0.4);
        state.logo.scale   = t < 0.6 ? lerp(SCALE_MIN, 1, t / 0.6)   : lerp(1, 1.01, (t - 0.6) / 0.4);
        state.logo.opacity = t < 0.35 ? lerp(0, 0.8, t / 0.35)
          : t < 0.6         ? lerp(0.8, 1, (t - 0.35) / 0.25)
          :                    lerp(1, 0.9, (t - 0.6) / 0.4);
        break;

      case 'lateral-sweep':
        state.logo.tx      += t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'spring-bounce':
        state.logo.ty += t < 0.22 ? lerp(0, -AMP_Y, t / 0.22)
          : t < 0.42   ? lerp(-AMP_Y, -AMP_Y * 0.3, (t - 0.22) / 0.2)
          : t < 0.7    ? lerp(-AMP_Y * 0.3, -AMP_Y * 0.6, (t - 0.42) / 0.28)
          :               lerp(-AMP_Y * 0.6, 0, (t - 0.7) / 0.3);
        state.logo.scale   = t < 0.22 ? lerp(SCALE_MIN, SCALE_MAX, EASE.bounce(t)) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.22) / 0.78);
        state.logo.opacity = t < 0.22 ? lerp(0.9, 1, t / 0.22) : lerp(1, 0.9, (t - 0.22) / 0.78);
        break;

      case 'strobe-blink':
        state.logo.opacity = (t > 0.18 && t < 0.28) || (t > 0.48 && t < 0.58) ? FADE_MIN : 1;
        state.logo.scale   = state.logo.opacity === FADE_MIN ? SCALE_MIN : 1;
        break;

      case 'drop-settle':
        state.logo.ty += t < 0.5  ? lerp(AMP_Y,       -AMP_Y * 0.5,   t * 2)
          : t < 0.72   ? lerp(-AMP_Y * 0.5, AMP_Y * 0.15,  (t - 0.5) / 0.22)
          :               lerp(AMP_Y * 0.15, 0,             (t - 0.72) / 0.28);
        state.logo.scale = t < 0.5    ? lerp(SCALE_MIN, SCALE_MAX, t * 2)
          : t < 0.72       ? lerp(SCALE_MAX, 0.99, (t - 0.5) / 0.22)
          :                   lerp(0.99, 1, (t - 0.72) / 0.28);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
        break;

      case 'diagonal-glide':
        state.logo.tx      += t < 0.5 ? lerp(-AMP_X * 0.8, 0, t * 2) : lerp(0, AMP_X * 0.8, (t - 0.5) / 0.5);
        state.logo.ty      += t < 0.5 ? lerp(AMP_Y * 0.4, 0, t * 2)  : lerp(0, -AMP_Y * 0.4, (t - 0.5) / 0.5);
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2)    : lerp(1, SCALE_MAX, (t - 0.5) / 0.5);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2)     : lerp(1, FADE_MIN, (t - 0.5) / 0.5);
        break;

      case 'scale-pulse':
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(0.86, 1, t * 2) : lerp(1, 0.86, (t - 0.5) * 2);
        break;

      case 'path-draw':
        if      (t < 0.35) state.logo.opacity = 0;
        else if (t < 0.60) state.logo.opacity = lerp(0, 1, (t - 0.35) / 0.25);
        else if (t < 0.85) state.logo.opacity = 1;
        else if (t < 0.95) state.logo.opacity = lerp(1, 0, (t - 0.85) / 0.10);
        else               state.logo.opacity = 0;

        for (var i = 0; i < svgPaths.length; i++) {
          var pData = svgPaths[i];
          var pOpacity = 0;
          var drawProgress = 0;

          if      (t < 0.05) { pOpacity = lerp(0, 1, t / 0.05); drawProgress = 0; }
          else if (t < 0.50) { pOpacity = 1; drawProgress = EASE.easeInOut((t - 0.05) / 0.45); }
          else if (t < 0.65) { pOpacity = 1; drawProgress = 1; }
          else if (t < 0.70) { pOpacity = lerp(1, 0, (t - 0.65) / 0.05); drawProgress = 1; }

          if (pOpacity > 0) {
            state.paths.push({
              d: pData.d,
              length: pData.length,
              color: pData.color || '#91f6ff',
              strokeWidth: pData.strokeWidth || 2,
              opacity: pOpacity,
              drawProgress: drawProgress
            });
          }
        }
        break;

      default:
        break;
    }

    return state;
  }

  // ─── RENDERING ENGINE ──────────────────────────────────────────

  /**
   * Translates mathematically derived state strictly into canvas drawing commands.
   */
  function renderStateToCanvas(ctx, state, logoImg) {
    if (!ctx || !logoImg) return;

    var width  = ctx.canvas.width;
    var height = ctx.canvas.height;
    
    // 1. Clear & Background
    ctx.filter = 'none';
    if (state.global.backgroundColor) {
      ctx.fillStyle = state.global.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    // 2. Base metrics calculations
    var targetSize = 220; // Virtual design space width
    var baseScale  = width / 440;
    var imgW       = logoImg.width  || targetSize;
    var imgH       = logoImg.height || targetSize;
    var fitScale   = targetSize / Math.max(imgW, imgH);
    
    var absTx = (width / 2) + state.logo.tx * baseScale;
    var absTy = (height / 2) + state.logo.ty * baseScale;
    var totalScale = state.logo.scale * baseScale * fitScale;

    // 3. Draw Logo
    ctx.save();
    ctx.translate(absTx, absTy);
    ctx.scale(totalScale, totalScale);
    ctx.rotate((state.logo.rotate * Math.PI) / 180);
    ctx.globalAlpha = state.logo.opacity;
    if (state.logo.blur > 0) {
      ctx.filter = 'blur(' + state.logo.blur + 'px)';
    }
    ctx.drawImage(logoImg, -imgW / 2, -imgH / 2, imgW, imgH);
    ctx.restore();

    ctx.filter = 'none'; // reset filter strictly

    // 4. Draw Trim Paths
    for (var i = 0; i < state.paths.length; i++) {
      var pInfo = state.paths[i];
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(totalScale, totalScale);
      ctx.translate(-imgW / 2, -imgH / 2);
      
      var p = new Path2D(pInfo.d);
      ctx.globalAlpha  = pInfo.opacity;
      ctx.strokeStyle  = pInfo.color;
      ctx.lineWidth    = parseFloat(pInfo.strokeWidth) || 2;
      ctx.lineCap      = 'round';
      ctx.lineJoin     = 'round';
      var visibleLen   = pInfo.drawProgress * pInfo.length;
      ctx.setLineDash([visibleLen, pInfo.length]);
      ctx.lineDashOffset = 0;
      ctx.stroke(p);
      ctx.restore();
    }

  }

  // ─── EXPORT UNIVERSALLY ──────────────────────────────────────────
  var API = {
    getFrameState: getFrameState,
    renderStateToCanvas: renderStateToCanvas
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.CoreEngine = API;
  } else {
    global.CoreEngine = API;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
