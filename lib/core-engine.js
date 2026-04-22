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
      particles: [],
      paths: [],
      proMorphRing: null
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
    var PARTICLE_OFFSET = parseFloat(vars['--particle-offset'])  || 0;

    switch (FAMILY) {
      case 'notion-fade':
      case 'fade-in-out':
        state.logo.opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
        break;

      case 'linear-breathe':
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(0.94, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
        break;

      case 'vercel-float':
        state.logo.ty      += t < 0.5 ? lerp(AMP_Y * 0.8, -AMP_Y, t * 2) : lerp(-AMP_Y, AMP_Y * 0.8, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(0.92, 1, t * 2) : lerp(1, 0.92, (t - 0.5) * 2);
        break;

      case 'stripe-slide':
        state.logo.ty      += t < 0.5 ? lerp(AMP_Y, 0, t * 2) : lerp(0, -AMP_Y, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'github-zoom':
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN - 0.06, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'framer-blur':
        state.logo.blur    = t < 0.5 ? lerp(0, BLUR_MAX, t * 2) : lerp(BLUR_MAX, 0, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
        break;

      case 'figma-tilt':
        state.logo.rotate  = t < 0.5 ? lerp(-ROTATE_DEG, ROTATE_DEG, t * 2) : lerp(ROTATE_DEG, -ROTATE_DEG, (t - 0.5) * 2);
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(0.95, 1, t * 2) : lerp(1, 0.95, (t - 0.5) * 2);
        break;

      case 'slack-spin':
        state.logo.rotate  = ROTATE_DEG * 8 * t;
        state.logo.opacity = t < 0.5 ? lerp(0.9, 1, t * 2) : lerp(1, 0.9, (t - 0.5) * 2);
        break;

      case 'airtable-drift':
        state.logo.tx      += t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'intercom-pop':
        var et = EASE.pop(t);
        state.logo.scale = et < 0.2 ? lerp(SCALE_MIN, SCALE_MAX, et / 0.2)
          : et < 0.6     ? lerp(SCALE_MAX, (SCALE_MIN + SCALE_MAX) / 2, (et - 0.2) / 0.4)
          :                 lerp((SCALE_MIN + SCALE_MAX) / 2, SCALE_MIN, (et - 0.6) / 0.4);
        state.logo.opacity = et < 0.2 ? lerp(0.88, 1, et / 0.2)
          : et < 0.6       ? lerp(1, 0.95, (et - 0.2) / 0.4)
          :                   lerp(0.95, 0.88, (et - 0.6) / 0.4);
        break;

      case 'dropbox-reveal':
        state.logo.ty      += t < 0.6 ? lerp(AMP_Y * 0.8, 0, t / 0.6) : lerp(0, -AMP_Y * 0.35, (t - 0.6) / 0.4);
        state.logo.scale   = t < 0.6 ? lerp(SCALE_MIN, 1, t / 0.6)   : lerp(1, 1.01, (t - 0.6) / 0.4);
        state.logo.opacity = t < 0.35 ? lerp(0, 0.8, t / 0.35)
          : t < 0.6         ? lerp(0.8, 1, (t - 0.35) / 0.25)
          :                    lerp(1, 0.9, (t - 0.6) / 0.4);
        break;

      case 'asana-sweep':
        state.logo.tx      += t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
        state.logo.scale   = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
        break;

      case 'shopify-soft-bounce':
        state.logo.ty += t < 0.22 ? lerp(0, -AMP_Y, t / 0.22)
          : t < 0.42   ? lerp(-AMP_Y, -AMP_Y * 0.3, (t - 0.22) / 0.2)
          : t < 0.7    ? lerp(-AMP_Y * 0.3, -AMP_Y * 0.6, (t - 0.42) / 0.28)
          :               lerp(-AMP_Y * 0.6, 0, (t - 0.7) / 0.3);
        state.logo.scale   = t < 0.22 ? lerp(SCALE_MIN, SCALE_MAX, EASE.bounce(t)) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.22) / 0.78);
        state.logo.opacity = t < 0.22 ? lerp(0.9, 1, t / 0.22) : lerp(1, 0.9, (t - 0.22) / 0.78);
        break;

      case 'monday-blink':
        state.logo.opacity = (t > 0.18 && t < 0.28) || (t > 0.48 && t < 0.58) ? FADE_MIN : 1;
        state.logo.scale   = state.logo.opacity === FADE_MIN ? SCALE_MIN : 1;
        break;

      case 'loom-settle':
        state.logo.ty += t < 0.5  ? lerp(AMP_Y,       -AMP_Y * 0.5,   t * 2)
          : t < 0.72   ? lerp(-AMP_Y * 0.5, AMP_Y * 0.15,  (t - 0.5) / 0.22)
          :               lerp(AMP_Y * 0.15, 0,             (t - 0.72) / 0.28);
        state.logo.scale = t < 0.5    ? lerp(SCALE_MIN, SCALE_MAX, t * 2)
          : t < 0.72       ? lerp(SCALE_MAX, 0.99, (t - 0.5) / 0.22)
          :                   lerp(0.99, 1, (t - 0.72) / 0.28);
        state.logo.opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
        break;

      case 'canva-glide':
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

      case 'pro-morph':
        var morphT = progress; // uses raw progress
        if (morphT < 0.35) {
          var r1 = morphT / 0.35;
          state.logo.scale   = lerp(1, 0.45, EASE.easeInOut(r1));
          state.logo.blur    = lerp(0, 24,   EASE.easeInOut(r1));
          state.logo.opacity = lerp(1, 0,    EASE.easeInOut(clamp(r1 * 1.5, 0, 1)));
        } else if (morphT > 0.65) {
          var r3 = (morphT - 0.65) / 0.35;
          state.logo.scale   = lerp(0.45, 1, EASE.backOut(r3));
          state.logo.blur    = lerp(24, 0,   EASE.easeInOut(r3));
          state.logo.opacity = lerp(0, 1,    EASE.easeInOut(clamp((r3 - 0.2) / 0.8, 0, 1)));
        } else {
          state.logo.scale   = 0.45;
          state.logo.blur    = 24;
          state.logo.opacity = 0;
        }

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
            ringRotate = holdT * Math.PI * 2;
          }

          if (ringAlpha > 0) {
            state.proMorphRing = {
              alpha: ringAlpha * 0.9,
              scale: ringScale,
              rotate: ringRotate,
              color: baseColor
            };
          }
        }
        break;

      case 'particle-burst':
        var offsets = [
          { dx: PARTICLE_OFFSET * 1,    dy: PARTICLE_OFFSET * -0.4,  delay: 0.00 },
          { dx: PARTICLE_OFFSET * 0.45, dy: PARTICLE_OFFSET * -1,    delay: 0.04 },
          { dx: PARTICLE_OFFSET * -0.75,dy: PARTICLE_OFFSET * -0.8,  delay: 0.08 },
          { dx: PARTICLE_OFFSET * 0.95, dy: PARTICLE_OFFSET * 0.75,  delay: 0.12 },
          { dx: PARTICLE_OFFSET * -0.5, dy: PARTICLE_OFFSET * 1,     delay: 0.16 },
          { dx: PARTICLE_OFFSET * -1,   dy: PARTICLE_OFFSET * 0.15,  delay: 0.20 }
        ];
        offsets.forEach(function (off) {
          var pt = clamp((t - off.delay) / (1 - off.delay), 0, 1);
          var pX = 0, pY = 0, pScale = 0, pAlpha = 0;
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
            state.particles.push({
              x: pX,
              y: pY,
              scale: pScale,
              alpha: pAlpha
            });
          }
        });
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
      if (state.logo.scale <= 0.45 && state.logo.opacity <= 0) {
        // pro-morph special drop
        ctx.filter = 'blur(' + (state.logo.blur / 3) + 'px) contrast(20)';
      } else {
        ctx.filter = 'blur(' + state.logo.blur + 'px)';
      }
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

    // 5. Draw Particles
    for (var j = 0; j < state.particles.length; j++) {
      var pt = state.particles[j];
      ctx.save();
      ctx.translate(width / 2 + pt.x * baseScale, height / 2 + pt.y * baseScale);
      ctx.scale(pt.scale * baseScale, pt.scale * baseScale);
      ctx.globalAlpha  = pt.alpha;
      ctx.fillStyle    = '#91f6ff';
      ctx.shadowBlur   = 10 * baseScale;
      ctx.shadowColor  = 'rgba(145,246,255,0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Draw Pro Morph Ring
    if (state.proMorphRing) {
      ctx.save();
      ctx.filter = 'none';
      ctx.translate(width / 2, height / 2);
      ctx.rotate(state.proMorphRing.rotate);
      var rs = state.proMorphRing.scale * baseScale;
      ctx.scale(rs, rs);
      ctx.globalAlpha  = state.proMorphRing.alpha;
      ctx.strokeStyle  = state.proMorphRing.color;
      ctx.lineWidth    = 14;
      ctx.lineCap      = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 72, 0, Math.PI * 1.75); 
      ctx.stroke();
      ctx.restore();
      ctx.filter = 'none';
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
