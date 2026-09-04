/**
 * Logo Loader Studio — Core Engine v4.0
 * ─────────────────────────────────────────────────────────────────
 * THE SINGLE SOURCE OF TRUTH FOR EVERY RENDER PATH.
 *
 * This file is intentionally dependency-free ES5 in a UMD wrapper, because it is
 * consumed three different ways:
 *   1. imported by the React preview,
 *   2. imported by the client-side GIF / WebM exporters,
 *   3. read off disk with fs.readFileSync and injected verbatim into Puppeteer
 *      by app/api/export/route.js.
 * Do not add `import`/`export` statements here — it would break (3).
 *
 * Architecture: a pure state pass (getFrameState) followed by a dumb drawing pass
 * (renderStateToCanvas). Identical inputs must always produce identical pixels, so
 * preview and export can never drift.
 *
 * Every animation is described by a *parametric* preset:
 *   { family, easing, duration, direction, params: { ... }, backgroundColor }
 * The engine reads `params` with defensive defaults, so a preset may specify as
 * few or as many parameters as it likes.
 */

(function (global) {
  'use strict';

  // ═══ MATH & EASING ══════════════════════════════════════════════════

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
    'linear':        [0, 0, 1, 1],
    'ease':          [0.25, 0.1, 0.25, 1],
    'ease-in':       [0.42, 0, 1, 1],
    'ease-out':      [0, 0, 0.58, 1],
    'ease-in-out':   [0.42, 0, 0.58, 1],
    'ease-out-expo': [0.16, 1, 0.3, 1],
    'ease-in-expo':  [0.7, 0, 0.84, 0],
    'ease-out-back': [0.34, 1.56, 0.64, 1],
    'ease-in-back':  [0.36, 0, 0.66, -0.56],
    'ease-out-circ': [0, 0.55, 0.45, 1],
    'ease-in-out-circ': [0.85, 0, 0.15, 1],
    'ease-in-out-quart': [0.76, 0, 0.24, 1],
    'swift':         [0.4, 0, 0.2, 1]
  };

  var _easeCache = {};
  function getEasingFn(easingStr) {
    if (!easingStr) return function (t) { return t; };
    if (_easeCache[easingStr]) return _easeCache[easingStr];
    var fn;
    if (EASING_MAP[easingStr]) {
      fn = cubicBezier.apply(null, EASING_MAP[easingStr]);
    } else {
      var match = String(easingStr).match(/cubic-bezier\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
      fn = match
        ? cubicBezier(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]))
        : function (t) { return t; };
    }
    _easeCache[easingStr] = fn;
    return fn;
  }

  var EASE = {
    linear:    function (t) { return t; },
    easeInOut: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    easeOut:   function (t) { return 1 - Math.pow(1 - t, 3); },
    easeIn:    function (t) { return t * t * t; },
    expoOut:   function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    circOut:   function (t) { return Math.sqrt(1 - Math.pow(t - 1, 2)); },
    bounce: function (t) {
      var n1 = 7.5625, d1 = 2.75, _t = t;
      if (_t < 1 / d1) return n1 * _t * _t;
      if (_t < 2 / d1) return n1 * (_t -= 1.5 / d1) * _t + 0.75;
      if (_t < 2.5 / d1) return n1 * (_t -= 2.25 / d1) * _t + 0.9375;
      return n1 * (_t -= 2.625 / d1) * _t + 0.984375;
    },
    backOut: function (t) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    elasticOut: function (t) {
      var c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /** Normalised sub-progress: where does `t` sit inside the window [a,b]? */
  function seg(t, a, b) {
    if (b <= a) return t >= b ? 1 : 0;
    return clamp01((t - a) / (b - a));
  }

  /** A symmetric 0→1→0 ramp — the backbone of every "breathing" motion. */
  function pingPong(t) { return t < 0.5 ? t * 2 : 2 - t * 2; }

  /** Reads a numeric param with a fallback, tolerating strings like "12px". */
  function num(params, key, dflt) {
    var v = params[key];
    if (v === undefined || v === null || v === '') return dflt;
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? dflt : n;
  }

  function str(params, key, dflt) {
    var v = params[key];
    return (v === undefined || v === null || v === '') ? dflt : String(v);
  }

  function bool(params, key, dflt) {
    var v = params[key];
    return (v === undefined || v === null) ? dflt : !!v;
  }

  // ═══ COLOR ═════════════════════════════════════════════════════════

  /** Applies an alpha multiplier to any CSS color the canvas understands. */
  function withAlpha(color, alpha) {
    if (alpha >= 1) return color;
    var c = String(color).trim();
    var m;
    if ((m = c.match(/^#([0-9a-f]{3})$/i))) {
      var h = m[1];
      return 'rgba(' + parseInt(h[0] + h[0], 16) + ',' + parseInt(h[1] + h[1], 16) + ',' + parseInt(h[2] + h[2], 16) + ',' + alpha + ')';
    }
    if ((m = c.match(/^#([0-9a-f]{6})$/i))) {
      var hx = m[1];
      return 'rgba(' + parseInt(hx.slice(0, 2), 16) + ',' + parseInt(hx.slice(2, 4), 16) + ',' + parseInt(hx.slice(4, 6), 16) + ',' + alpha + ')';
    }
    if ((m = c.match(/^rgba?\(([^)]+)\)$/i))) {
      var parts = m[1].split(',');
      return 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + alpha + ')';
    }
    return c;
  }

  // ═══ STATE ENGINE (PURE) ═══════════════════════════════════════════

  function makeState(animation, progress) {
    return {
      global: {
        backgroundColor: animation.backgroundColor || null,
        progress: progress
      },
      logo: {
        tx: 0, ty: 0,
        scale: 1, scaleX: 1, scaleY: 1,
        rotate: 0,
        opacity: 1,
        blur: 0,
        glow: 0,
        glowColor: null,
        clip: null      // { type:'wipe', dir, amount } — reveals part of the logo
      },
      paths: [],
      decor: []         // rings / dots / sweeps, each with z:'below'|'above'
    };
  }

  /**
   * Maps raw loop progress through direction handling and the preset's easing.
   * Returns the eased time value every family reasons about.
   */
  function timeBase(progress, animation) {
    var p = clamp01(progress);
    var dir = animation.direction || 'normal';
    if (dir === 'reverse') p = 1 - p;
    else if (dir === 'alternate') p = pingPong(p);
    return clamp01(getEasingFn(animation.easing)(p));
  }

  /**
   * Calculates the exact visual state of every element at a point in time.
   * No side effects, no canvas, no DOM.
   */
  function getFrameState(progress, animation, svgPaths) {
    if (!animation) return makeState({}, progress);
    if (!svgPaths) svgPaths = [];

    var state = makeState(animation, progress);
    var P = animation.params || {};
    var t = timeBase(progress, animation);
    var raw = clamp01(progress);      // un-eased, for cyclic/continuous motion

    switch (animation.family) {

      // ─── PATH DRAWING ─────────────────────────────────────────────
      // The flagship family. One parametric implementation backs every
      // path-drawing preset; `mode` selects the stroke behaviour.
      case 'path-draw':
        applyPathDraw(state, t, raw, P, svgPaths, animation);
        break;

      // ─── PULSE / BREATHE ──────────────────────────────────────────
      case 'pulse': {
        var cycles = num(P, 'cycles', 1);
        var pt = EASE.easeInOut(pingPong((t * cycles) % 1));
        state.logo.scale = lerp(num(P, 'scaleMin', 0.92), num(P, 'scaleMax', 1.08), pt);
        state.logo.opacity = lerp(num(P, 'opacityMin', 0.85), num(P, 'opacityMax', 1), pt);
        state.logo.blur = lerp(num(P, 'blurMin', 0), num(P, 'blurMax', 0), 1 - pt);
        state.logo.glow = lerp(0, num(P, 'glow', 0), pt);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── FLOAT / DRIFT / ORBIT ────────────────────────────────────
      case 'float': {
        var mode = str(P, 'mode', 'bob');
        var ax = num(P, 'ampX', 0), ay = num(P, 'ampY', 12);
        var cyc = num(P, 'cycles', 1);
        var phase = raw * cyc * Math.PI * 2;
        if (mode === 'orbit') {
          state.logo.tx = Math.cos(phase) * ax;
          state.logo.ty = Math.sin(phase) * ay;
        } else if (mode === 'figure8') {
          state.logo.tx = Math.sin(phase) * ax;
          state.logo.ty = Math.sin(phase * 2) * ay * 0.5;
        } else if (mode === 'drift') {
          state.logo.tx = Math.sin(phase) * ax;
          state.logo.ty = Math.cos(phase * 0.5) * ay;
        } else { // bob
          state.logo.ty = -Math.sin(phase) * ay;
          state.logo.tx = Math.sin(phase * 0.5) * ax;
        }
        state.logo.rotate = Math.sin(phase) * num(P, 'tilt', 0);
        var fadeAmt = num(P, 'fade', 0);
        if (fadeAmt > 0) state.logo.opacity = 1 - fadeAmt * (0.5 - Math.cos(phase) * 0.5);
        state.logo.scale = 1 + Math.sin(phase) * num(P, 'scaleAmp', 0);
        break;
      }

      // ─── SPIN ─────────────────────────────────────────────────────
      case 'spin': {
        var turns = num(P, 'turns', 1);
        var smode = str(P, 'mode', 'continuous');
        if (smode === 'continuous') {
          state.logo.rotate = raw * 360 * turns;
        } else if (smode === 'stepped') {
          var steps = Math.max(1, Math.round(num(P, 'steps', 8)));
          state.logo.rotate = Math.floor(raw * steps) / steps * 360 * turns;
        } else if (smode === 'flip') {
          // 3D-ish card flip faked by squashing horizontally
          var fr = raw * turns;
          state.logo.rotate = 0;
          state.logo.scaleX = Math.abs(Math.cos(fr * Math.PI * 2));
        } else { // eased — accelerates then settles
          state.logo.rotate = t * 360 * turns;
        }
        state.logo.rotate += Math.sin(raw * Math.PI * 2 * num(P, 'wobbleCycles', 0)) * num(P, 'wobble', 0);
        var sp = num(P, 'scalePulse', 0);
        if (sp > 0) state.logo.scale = 1 + Math.sin(raw * Math.PI * 2) * sp;
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── SWING / TILT ─────────────────────────────────────────────
      case 'swing': {
        var scyc = num(P, 'cycles', 1);
        var sw = Math.sin(raw * Math.PI * 2 * scyc);
        var damp = bool(P, 'damped', false) ? (1 - raw) : 1;
        state.logo.rotate = sw * num(P, 'angle', 8) * damp;
        state.logo.tx = sw * num(P, 'shiftX', 0) * damp;
        state.logo.scale = 1 + Math.abs(sw) * num(P, 'scaleAmp', 0);
        break;
      }

      // ─── POP / ENTRANCE ───────────────────────────────────────────
      case 'pop': {
        var inEnd = num(P, 'inEnd', 0.45);
        var outStart = num(P, 'outStart', 0.75);
        var curve = str(P, 'curve', 'backOut');
        var easeFn = EASE[curve] || EASE.backOut;
        var ip = easeFn(seg(t, 0, inEnd));
        var op = seg(t, outStart, 1);
        state.logo.scale = lerp(num(P, 'fromScale', 0.4), 1, ip) * lerp(1, num(P, 'toScale', 1.15), op);
        state.logo.ty = lerp(num(P, 'fromY', 0), 0, ip) + lerp(0, num(P, 'toY', 0), op);
        state.logo.rotate = lerp(num(P, 'fromRotate', 0), 0, ip);
        state.logo.opacity = clamp01(seg(t, 0, num(P, 'fadeInEnd', 0.2))) * (1 - op * num(P, 'fadeOut', 1));
        state.logo.blur = lerp(num(P, 'fromBlur', 0), 0, ip);
        break;
      }

      // ─── SLIDE / SWEEP THROUGH ────────────────────────────────────
      case 'slide': {
        var dx = num(P, 'distanceX', 0), dy = num(P, 'distanceY', 0);
        var hold0 = num(P, 'holdStart', 0.35), hold1 = num(P, 'holdEnd', 0.65);
        var inP = EASE.expoOut(seg(t, 0, hold0));
        var outP = EASE.easeIn(seg(t, hold1, 1));
        state.logo.tx = lerp(-dx, 0, inP) + lerp(0, dx, outP);
        state.logo.ty = lerp(-dy, 0, inP) + lerp(0, dy, outP);
        state.logo.opacity = inP * (1 - outP);
        state.logo.blur = lerp(num(P, 'motionBlur', 0), 0, inP) + lerp(0, num(P, 'motionBlur', 0), outP);
        break;
      }

      // ─── BLUR DISSOLVE ────────────────────────────────────────────
      case 'dissolve': {
        var dp = pingPong(t);
        state.logo.blur = lerp(0, num(P, 'blurMax', 6), dp);
        state.logo.opacity = lerp(1, num(P, 'opacityMin', 0.25), dp);
        state.logo.scale = lerp(1, num(P, 'scaleAt', 1.06), dp);
        break;
      }

      // ─── WIPE REVEAL ──────────────────────────────────────────────
      // Reveals the logo behind a moving edge, then hides it again.
      case 'wipe': {
        var wIn = seg(t, 0, num(P, 'revealEnd', 0.45));
        var wOut = seg(t, num(P, 'hideStart', 0.8), 1);
        state.logo.clip = {
          type: 'wipe',
          dir: str(P, 'direction', 'left'),
          amount: clamp01(EASE.easeInOut(wIn) - EASE.easeInOut(wOut)),
          soft: num(P, 'softness', 0.12)
        };
        state.logo.opacity = 1;
        if (num(P, 'sweepLight', 0) > 0) {
          state.decor.push({
            type: 'sweep', z: 'above',
            pos: wIn, width: num(P, 'sweepWidth', 0.18),
            color: str(P, 'sweepColor', '#ffffff'),
            opacity: num(P, 'sweepLight', 0) * (1 - wOut),
            dir: str(P, 'direction', 'left')
          });
        }
        break;
      }

      // ─── RING PULSE (radar / sonar) ───────────────────────────────
      case 'rings': {
        var count = Math.max(1, Math.round(num(P, 'count', 3)));
        var rMin = num(P, 'radiusMin', 90), rMax = num(P, 'radiusMax', 190);
        var ringColor = str(P, 'color', '#8b5cf6');
        var ringW = num(P, 'width', 2);
        for (var r = 0; r < count; r++) {
          var rp = (raw + r / count) % 1;
          var eased = EASE.expoOut(rp);
          state.decor.push({
            type: 'ring', z: 'below',
            radius: lerp(rMin, rMax, eased),
            width: ringW * (1 - eased * 0.6),
            color: ringColor,
            opacity: (1 - eased) * num(P, 'opacity', 0.7),
            glow: num(P, 'glow', 0)
          });
        }
        var lp = EASE.easeInOut(pingPong(raw));
        state.logo.scale = lerp(1, num(P, 'logoScale', 1.04), lp);
        state.logo.glow = num(P, 'logoGlow', 0);
        state.logo.glowColor = ringColor;
        break;
      }

      // ─── ORBIT DOTS ───────────────────────────────────────────────
      case 'orbit': {
        var dots = Math.max(1, Math.round(num(P, 'count', 3)));
        var orbitR = num(P, 'radius', 150);
        var dotR = num(P, 'dotSize', 6);
        var oTurns = num(P, 'turns', 1);
        var dotColor = str(P, 'color', '#8b5cf6');
        var trail = Math.max(0, Math.round(num(P, 'trail', 0)));
        for (var d = 0; d < dots; d++) {
          for (var tr = 0; tr <= trail; tr++) {
            var ang = (raw * oTurns - tr * 0.02) * Math.PI * 2 + (d / dots) * Math.PI * 2;
            var squash = num(P, 'squash', 1);
            state.decor.push({
              type: 'dot', z: str(P, 'layer', 'below') === 'above' ? 'above' : 'below',
              x: Math.cos(ang) * orbitR,
              y: Math.sin(ang) * orbitR * squash,
              radius: dotR * (1 - tr / (trail + 2)),
              color: dotColor,
              opacity: num(P, 'opacity', 0.9) * (1 - tr / (trail + 1)),
              glow: num(P, 'glow', 0)
            });
          }
        }
        state.logo.scale = 1 + Math.sin(raw * Math.PI * 2) * num(P, 'scaleAmp', 0);
        state.logo.rotate = raw * 360 * num(P, 'logoTurns', 0);
        break;
      }

      // ─── HEARTBEAT ────────────────────────────────────────────────
      case 'heartbeat': {
        var hb = 0;
        if (t < 0.12) hb = EASE.easeOut(seg(t, 0, 0.12));
        else if (t < 0.24) hb = 1 - EASE.easeInOut(seg(t, 0.12, 0.24)) * 0.7;
        else if (t < 0.36) hb = 0.3 + EASE.easeOut(seg(t, 0.24, 0.36)) * 0.7;
        else if (t < 0.5) hb = 1 - EASE.easeInOut(seg(t, 0.36, 0.5));
        state.logo.scale = lerp(1, num(P, 'scaleMax', 1.14), hb);
        state.logo.glow = num(P, 'glow', 0) * hb;
        state.logo.glowColor = str(P, 'glowColor', null);
        state.logo.opacity = lerp(num(P, 'opacityMin', 1), 1, hb);
        break;
      }

      // ─── SHIMMER (light sweep across a static logo) ───────────────
      case 'shimmer': {
        state.decor.push({
          type: 'sweep', z: 'above',
          pos: raw,
          width: num(P, 'width', 0.22),
          color: str(P, 'color', '#ffffff'),
          opacity: num(P, 'intensity', 0.55),
          dir: str(P, 'direction', 'left'),
          angle: num(P, 'angle', 20)
        });
        state.logo.scale = 1 + Math.sin(raw * Math.PI * 2) * num(P, 'scaleAmp', 0);
        state.logo.glow = num(P, 'glow', 0);
        break;
      }

      default:
        break;
    }

    return state;
  }

  // ─── PATH DRAWING IMPLEMENTATION ───────────────────────────────────
  /**
   * Parametric SVG trim-path renderer. Modes:
   *   trace  — stroke grows from the start of each path
   *   comet  — a short dash travels along the path
   *   march  — a repeating dash pattern marches along
   *   mirror — stroke grows outward from the middle of the path
   *   erase  — draws fully, then retracts from the start
   */
  function applyPathDraw(state, t, raw, P, svgPaths, animation) {
    var mode        = str(P, 'mode', 'trace');
    var drawStart   = num(P, 'drawStart', 0.02);
    var drawEnd     = num(P, 'drawEnd', 0.55);
    var holdEnd     = num(P, 'holdEnd', 0.78);
    var fadeEnd     = num(P, 'fadeEnd', 0.9);
    var stagger     = num(P, 'stagger', 0);
    var glow        = num(P, 'glow', 0);
    var widthMul    = num(P, 'strokeScale', 1);
    var colorMode   = str(P, 'colorMode', 'source');
    var customColor = str(P, 'color', '#8b5cf6');
    var drawEase    = EASE[str(P, 'drawEase', 'easeInOut')] || EASE.easeInOut;
    var lineCap     = str(P, 'lineCap', 'round');
    var n           = svgPaths.length;

    // The logo image fades in behind the finished outline.
    var revealLogo  = bool(P, 'revealLogo', true);
    if (revealLogo) {
      var lStart = num(P, 'logoFadeStart', 0.5);
      var lEnd   = num(P, 'logoFadeEnd', 0.72);
      var lOut   = num(P, 'logoFadeOut', 0.92);
      state.logo.opacity = clamp01(seg(t, lStart, lEnd)) * (1 - seg(t, lOut, 1));
      state.logo.scale = lerp(num(P, 'logoFromScale', 0.98), 1, seg(t, lStart, lEnd));
    } else {
      state.logo.opacity = 0;
    }

    for (var i = 0; i < n; i++) {
      var pd = svgPaths[i];
      if (!pd || !pd.d) continue;

      // Stagger shifts each path's window later in the timeline.
      var slot = n > 1 ? (i / (n - 1)) : 0;
      var span = drawEnd - drawStart;
      var perSpan = span * (1 - stagger * (n > 1 ? (n - 1) / n : 0));
      var s0 = drawStart + slot * (span - perSpan);
      var s1 = s0 + perSpan;

      var dp = drawEase(seg(t, s0, s1));

      // Opacity envelope: fade in at the head of the window, out at fadeEnd.
      var op = clamp01(seg(t, s0, s0 + 0.03));
      if (t > holdEnd) op *= (1 - seg(t, holdEnd, fadeEnd));

      if (op <= 0.001) continue;

      var len = pd.length || 1000;
      var baseW = (parseFloat(pd.strokeWidth) || 2) * widthMul;
      var color = colorMode === 'custom' ? customColor : (pd.color || customColor);

      var dash, dashOffset = 0;
      if (mode === 'comet') {
        var tail = num(P, 'tailLength', 0.18) * len;
        dash = [tail, len];
        dashOffset = -dp * (len + tail) + tail;
      } else if (mode === 'march') {
        var dl = num(P, 'dashLength', 12), dg = num(P, 'dashGap', 10);
        dash = [dl, dg];
        dashOffset = -raw * (dl + dg) * num(P, 'marchSpeed', 4);
        dp = 1;
      } else if (mode === 'mirror') {
        var half = dp * len * 0.5;
        dash = [half * 2, len];
        dashOffset = half;
      } else if (mode === 'erase') {
        var grow = clamp01(dp * 2);
        var shrink = clamp01(dp * 2 - 1);
        dash = [(grow - shrink) * len, len];
        dashOffset = -shrink * len;
      } else { // trace
        dash = [dp * len, len];
        dashOffset = 0;
      }

      state.paths.push({
        d: pd.d,
        length: len,
        color: color,
        strokeWidth: baseW,
        opacity: op * num(P, 'opacity', 1),
        dash: dash,
        dashOffset: dashOffset,
        glow: glow,
        lineCap: lineCap,
        drawProgress: dp
      });

      // A bright head-dot riding the leading edge of the stroke.
      if (num(P, 'headDot', 0) > 0 && dp > 0 && dp < 1 && mode === 'trace') {
        state.decor.push({
          type: 'pathHead', z: 'above',
          d: pd.d, at: dp, length: len,
          radius: num(P, 'headDot', 0),
          color: str(P, 'headColor', color),
          opacity: op,
          glow: glow || num(P, 'headDot', 0) * 2
        });
      }
    }
  }

  // ═══ RENDERING ═════════════════════════════════════════════════════

  /** Virtual design space: presets are authored against a 440px stage. */
  var STAGE = 440;
  var LOGO_BOX = 220;

  /**
   * Draws a state object onto a 2D context. Purely mechanical — all timing
   * decisions were already made in getFrameState.
   */
  function renderStateToCanvas(ctx, state, logoImg) {
    if (!ctx || !state) return;

    var width = ctx.canvas.width;
    var height = ctx.canvas.height;

    // 1. Background. This is the ONLY place a background is ever painted, so
    //    preview and every export path agree by construction. null = transparent.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    if (state.global.backgroundColor) {
      ctx.fillStyle = state.global.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();

    // 2. Metrics. Everything is authored in stage units and scaled up, so a
    //    1080px export is a pixel-exact enlargement of the 720px preview.
    var baseScale = width / STAGE;
    var cx = width / 2;
    var cy = height / 2;

    var imgW = (logoImg && logoImg.width) || LOGO_BOX;
    var imgH = (logoImg && logoImg.height) || LOGO_BOX;
    var fitScale = LOGO_BOX / Math.max(imgW, imgH);

    var L = state.logo;
    var totalScale = L.scale * baseScale * fitScale;

    // 3. Decorations behind the logo.
    drawDecor(ctx, state, 'below', cx, cy, baseScale, totalScale, imgW, imgH);

    // 4. The logo itself.
    if (logoImg && L.opacity > 0.001) {
      ctx.save();
      ctx.translate(cx + L.tx * baseScale, cy + L.ty * baseScale);
      ctx.rotate((L.rotate * Math.PI) / 180);
      ctx.globalAlpha = clamp01(L.opacity);

      // Blur and glow are device-space effects, so they must be scaled by
      // baseScale or a 1080px export would look sharper than the preview.
      var fx = [];
      if (L.blur > 0) fx.push('blur(' + (L.blur * baseScale).toFixed(2) + 'px)');
      if (L.glow > 0) {
        fx.push('drop-shadow(0 0 ' + (L.glow * baseScale).toFixed(2) + 'px ' + (L.glowColor || '#ffffff') + ')');
      }
      ctx.filter = fx.length ? fx.join(' ') : 'none';

      ctx.scale(totalScale * (L.scaleX || 1), totalScale * (L.scaleY || 1));

      if (L.clip && L.clip.amount < 1) {
        applyWipeClip(ctx, L.clip, imgW, imgH);
      }

      if (!L.clip || L.clip.amount > 0.001) {
        ctx.drawImage(logoImg, -imgW / 2, -imgH / 2, imgW, imgH);
      }
      ctx.restore();
      ctx.filter = 'none';
    }

    // 5. Trim paths, drawn in the logo's own coordinate space so they line up
    //    with the artwork and inherit its motion.
    for (var i = 0; i < state.paths.length; i++) {
      var p = state.paths[i];
      ctx.save();
      ctx.translate(cx + L.tx * baseScale, cy + L.ty * baseScale);
      ctx.rotate((L.rotate * Math.PI) / 180);
      ctx.scale(totalScale, totalScale);
      ctx.translate(-imgW / 2, -imgH / 2);

      ctx.globalAlpha = clamp01(p.opacity);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.strokeWidth;
      ctx.lineCap = p.lineCap || 'round';
      ctx.lineJoin = 'round';
      if (p.glow > 0) {
        ctx.shadowBlur = p.glow * totalScale;
        ctx.shadowColor = p.color;
      }
      if (p.dash) {
        ctx.setLineDash(p.dash);
        ctx.lineDashOffset = p.dashOffset || 0;
      }
      try {
        ctx.stroke(new Path2D(p.d));
      } catch (e) { /* malformed path data — skip rather than kill the frame */ }
      ctx.restore();
    }

    // 6. Decorations in front of the logo.
    drawDecor(ctx, state, 'above', cx, cy, baseScale, totalScale, imgW, imgH);

    // Leave the context in a neutral state for the next frame.
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  function applyWipeClip(ctx, clip, imgW, imgH) {
    var a = clamp01(clip.amount);
    ctx.beginPath();
    if (clip.dir === 'up' || clip.dir === 'down') {
      var h = imgH * a;
      var y = clip.dir === 'up' ? imgH / 2 - h : -imgH / 2;
      ctx.rect(-imgW / 2, y, imgW, h);
    } else {
      var w = imgW * a;
      var x = clip.dir === 'right' ? imgW / 2 - w : -imgW / 2;
      ctx.rect(x, -imgH / 2, w, imgH);
    }
    ctx.clip();
  }

  function drawDecor(ctx, state, layer, cx, cy, baseScale, totalScale, imgW, imgH) {
    for (var i = 0; i < state.decor.length; i++) {
      var d = state.decor[i];
      if ((d.z || 'below') !== layer) continue;
      if (d.opacity <= 0.001) continue;

      if (d.type === 'ring') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = clamp01(d.opacity);
        ctx.strokeStyle = d.color;
        ctx.lineWidth = Math.max(0.4, d.width * baseScale);
        if (d.glow > 0) { ctx.shadowBlur = d.glow * baseScale; ctx.shadowColor = d.color; }
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0, d.radius * baseScale), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

      } else if (d.type === 'dot') {
        ctx.save();
        ctx.translate(cx + d.x * baseScale, cy + d.y * baseScale);
        ctx.globalAlpha = clamp01(d.opacity);
        ctx.fillStyle = d.color;
        if (d.glow > 0) { ctx.shadowBlur = d.glow * baseScale; ctx.shadowColor = d.color; }
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.3, d.radius * baseScale), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (d.type === 'sweep') {
        // A soft band of light travelling across the logo box.
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((d.angle || 0) * Math.PI) / 180);
        var box = LOGO_BOX * baseScale * 1.4;
        var travel = (d.pos * (1 + d.width * 2) - d.width) * box - box / 2;
        var bandW = Math.max(1, d.width * box);
        var g = ctx.createLinearGradient(travel, 0, travel + bandW, 0);
        g.addColorStop(0, withAlpha(d.color, 0));
        g.addColorStop(0.5, withAlpha(d.color, clamp01(d.opacity)));
        g.addColorStop(1, withAlpha(d.color, 0));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.fillRect(-box / 2, -box / 2, box, box);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';

      } else if (d.type === 'pathHead') {
        // Position the head dot by walking the path with an SVG measurer when
        // available; fall back to skipping rather than guessing wrongly.
        var pt = pointOnPath(d.d, d.at * d.length);
        if (!pt) continue;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(totalScale, totalScale);
        ctx.translate(-imgW / 2, -imgH / 2);
        ctx.globalAlpha = clamp01(d.opacity);
        ctx.fillStyle = d.color;
        if (d.glow > 0) { ctx.shadowBlur = d.glow; ctx.shadowColor = d.color; }
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.5, d.radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Path point measurement needs an SVG element, which exists in the browser and
  // inside Puppeteer but not in a bare Node context. Cache one hidden node.
  var _measureEl = null;
  var _measureCache = {};
  function pointOnPath(d, dist) {
    if (typeof document === 'undefined') return null;
    try {
      if (!_measureEl) {
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
        _measureEl = document.createElementNS(svgNS, 'path');
        svg.appendChild(_measureEl);
        document.body.appendChild(svg);
      }
      if (_measureCache.d !== d) {
        _measureEl.setAttribute('d', d);
        _measureCache.d = d;
      }
      return _measureEl.getPointAtLength(dist);
    } catch (e) {
      return null;
    }
  }

  // ═══ UMD EXPORT ════════════════════════════════════════════════════
  var API = {
    getFrameState: getFrameState,
    renderStateToCanvas: renderStateToCanvas,
    getEasingFn: getEasingFn,
    EASE: EASE,
    STAGE: STAGE,
    LOGO_BOX: LOGO_BOX
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.CoreEngine = API;
  } else {
    global.CoreEngine = API;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
