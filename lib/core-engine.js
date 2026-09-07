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

  /**
   * A real damped-harmonic-oscillator solver, not a bezier approximation of one.
   * Returns f(t) over t ∈ [0,1] settling at 1, so overshoot and the number of
   * bounces come out of the physics rather than being hand-tuned per preset.
   *
   *   stiffness — spring constant k: how hard it pulls back
   *   damping   — viscous damping c: how quickly oscillation dies
   *   mass      — m: inertia, higher feels heavier and slower
   */
  function makeSpring(stiffness, damping, mass) {
    var k = stiffness > 0 ? stiffness : 170;
    var c = damping >= 0 ? damping : 12;
    var m = mass > 0 ? mass : 1;

    var w0 = Math.sqrt(k / m);              // undamped angular frequency
    var zeta = c / (2 * Math.sqrt(k * m));  // damping ratio

    // Normalise so t=1 is roughly "settled", independent of k/c/m.
    var settle = zeta < 1
      ? -Math.log(0.001) / (zeta * w0 || 1)
      : (4 / w0);
    if (!isFinite(settle) || settle <= 0) settle = 1;

    if (zeta < 1) {
      var wd = w0 * Math.sqrt(1 - zeta * zeta); // damped frequency
      return function (t) {
        var x = clamp01(t) * settle;
        return 1 - Math.exp(-zeta * w0 * x) *
          (Math.cos(wd * x) + (zeta * w0 / wd) * Math.sin(wd * x));
      };
    }
    // Critically damped / overdamped — no overshoot.
    return function (t) {
      var x = clamp01(t) * settle;
      return 1 - (1 + w0 * x) * Math.exp(-w0 * x);
    };
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /**
   * Deterministic pseudo-random in [0,1). Seeded so every render path — preview,
   * client export, Puppeteer — produces byte-identical "randomness".
   */
  function hash01(seed) {
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

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
        skewX: 0, skewY: 0,
        opacity: 1,
        blur: 0,
        glow: 0,
        glowColor: null,
        clip: null,     // { type:'wipe', dir, amount } — reveals part of the logo
        // Per-slice displacement, used by the wave / liquid / glitch families.
        // { mode, slices, amplitude, frequency, phase, axis, chroma }
        warp: null,
        // { intensity, width, angle, color } — a shine clipped to the logo's
        // own alpha, which is what makes it read as glass rather than a bar.
        shine: null,
        // Colour poured into the artwork's own alpha:
        //   { type:'liquid', level, amp, freq, phase, color }
        //   { type:'gradient', colors, pos, angle, spread }
        fill: null,
        // { mode:'shatter'|'pixelate'|'bands', ... } — reveals built by
        // decomposing the artwork rather than transforming it whole.
        decompose: null,
        // { samples, distance, alpha } — radial zoom streak.
        streak: null,
        // Draws the logo underneath at low alpha, so a partial reveal still
        // reads as "this shape, incomplete" rather than a fragment.
        ghost: 0
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

      // ─── WAVE — multi-axis sinusoidal distortion ──────────────────
      case 'wave': {
        var wAxis = str(P, 'axis', 'horizontal');
        state.logo.warp = {
          mode: 'wave',
          axis: wAxis,
          slices: Math.max(4, Math.round(num(P, 'slices', 48))),
          amplitude: num(P, 'amplitude', 10),
          frequency: num(P, 'frequency', 2),
          phase: raw * Math.PI * 2 * num(P, 'speed', 1),
          // A second, slower wave on the other axis is what makes this read as
          // cloth rather than a single sine.
          crossAmplitude: num(P, 'crossAmplitude', 0),
          crossFrequency: num(P, 'crossFrequency', 1.5)
        };
        state.logo.scale = 1 + Math.sin(raw * Math.PI * 2) * num(P, 'scaleAmp', 0);
        state.logo.opacity = 1 - num(P, 'fade', 0) * (0.5 - Math.cos(raw * Math.PI * 2) * 0.5);
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── LIQUID — blob-like squash, stretch and shear ─────────────
      case 'liquid': {
        var lPhase = raw * Math.PI * 2 * num(P, 'speed', 1);
        var visc = num(P, 'wobble', 0.08);
        // Offsetting the x/y phases by π/2 keeps the area roughly constant, so
        // it reads as a volume deforming rather than the logo simply scaling.
        state.logo.scaleX = 1 + Math.sin(lPhase) * visc;
        state.logo.scaleY = 1 + Math.sin(lPhase + Math.PI / 2) * visc;
        state.logo.skewX = Math.sin(lPhase * 0.5) * num(P, 'shear', 0);
        state.logo.rotate = Math.sin(lPhase * 0.5) * num(P, 'sway', 0);
        state.logo.warp = num(P, 'ripple', 0) > 0 ? {
          mode: 'wave', axis: 'radial',
          slices: Math.max(8, Math.round(num(P, 'slices', 40))),
          amplitude: num(P, 'ripple', 0),
          frequency: num(P, 'rippleFrequency', 3),
          phase: -lPhase * 1.5,
          crossAmplitude: 0, crossFrequency: 1
        } : null;
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── GLASS SHINE — specular sweep clipped to the artwork ──────
      case 'glass-shine': {
        var gsCycles = Math.max(1, Math.round(num(P, 'cycles', 1)));
        var gsPos = (raw * gsCycles) % 1;
        // Dwell between passes so the shine reads as an event, not a strobe.
        var dwell = clamp01(num(P, 'dwell', 0.35));
        var swept = dwell >= 1 ? 0 : clamp01(gsPos / (1 - dwell));
        state.logo.shine = {
          intensity: num(P, 'intensity', 0.75),
          width: num(P, 'width', 0.18),
          angle: num(P, 'angle', 24),
          color: str(P, 'color', '#ffffff'),
          pos: swept,
          active: gsPos < (1 - dwell),
          softness: num(P, 'softness', 1)
        };
        state.logo.scale = 1 + Math.sin(raw * Math.PI * 2) * num(P, 'scaleAmp', 0);
        state.logo.rotate = Math.sin(raw * Math.PI * 2) * num(P, 'tilt', 0);
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── GLITCH — slice displacement with chromatic fringing ──────
      case 'glitch': {
        var burst = num(P, 'burstiness', 0.6);
        // Gate the effect into short bursts; a continuous glitch reads as a bug.
        var slot = Math.floor(raw * Math.max(1, Math.round(num(P, 'bursts', 4))));
        var inBurst = hash01(slot * 3.7) < burst;
        state.logo.warp = {
          mode: 'glitch',
          slices: Math.max(3, Math.round(num(P, 'slices', 14))),
          amplitude: inBurst ? num(P, 'amplitude', 14) : 0,
          seed: slot,
          chroma: inBurst ? num(P, 'chroma', 5) : 0
        };
        state.logo.opacity = inBurst ? lerp(1, num(P, 'flicker', 1), hash01(slot * 9.1) * 0.35) : 1;
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── ELASTIC SNAP — spring-physics arrival ────────────────────
      case 'snap': {
        var spring = makeSpring(
          num(P, 'stiffness', 220),
          num(P, 'damping', 11),
          num(P, 'mass', 1)
        );
        var sIn = num(P, 'inEnd', 0.55);
        var sp = spring(seg(t, 0, sIn));
        var sOut = seg(t, num(P, 'outStart', 0.85), 1);

        state.logo.scale = lerp(num(P, 'fromScale', 0.35), 1, sp) * lerp(1, num(P, 'toScale', 1), sOut);
        state.logo.ty = lerp(num(P, 'fromY', 0), 0, sp);
        state.logo.tx = lerp(num(P, 'fromX', 0), 0, sp);
        state.logo.rotate = lerp(num(P, 'fromRotate', 0), 0, sp);
        // Squash-and-stretch driven by spring velocity, approximated from the
        // gap between the spring and its target.
        var overshoot = sp - 1;
        var sq = num(P, 'squash', 0);
        state.logo.scaleX = 1 + overshoot * sq;
        state.logo.scaleY = 1 - overshoot * sq;
        state.logo.opacity = clamp01(seg(t, 0, num(P, 'fadeInEnd', 0.15))) * (1 - sOut);
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── DEPTH — perspective tilt faked with axis squash ──────────
      case 'depth': {
        var dPhase = raw * Math.PI * 2 * num(P, 'cycles', 1);
        var yaw = Math.sin(dPhase) * num(P, 'yaw', 30);
        var pitch = Math.cos(dPhase) * num(P, 'pitch', 12);
        // cos of the rotation angle is the foreshortening of a flat plane.
        state.logo.scaleX = Math.max(0.05, Math.cos((yaw * Math.PI) / 180));
        state.logo.scaleY = Math.max(0.05, Math.cos((pitch * Math.PI) / 180));
        state.logo.skewX = -yaw * num(P, 'shear', 0.15);
        state.logo.rotate = Math.sin(dPhase * 0.5) * num(P, 'roll', 0);
        // Things that turn away from the light get dimmer.
        state.logo.opacity = lerp(1, num(P, 'shade', 1), 1 - state.logo.scaleX);
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── PARTICLES — sparks travelling the logo outline ───────────
      case 'particles': {
        var pc = Math.max(1, Math.round(num(P, 'count', 24)));
        var pSpread = num(P, 'spread', 150);
        var pLife = num(P, 'life', 0.6);
        var pColor = str(P, 'color', '#a78bfa');
        var rise = num(P, 'rise', 40);
        for (var pi = 0; pi < pc; pi++) {
          var born = hash01(pi * 1.31);
          var lt = (raw - born + 1) % 1;             // 0..1 through this life
          if (lt > pLife) continue;
          var lp = lt / pLife;
          var ang2 = hash01(pi * 5.77) * Math.PI * 2;
          var dist = pSpread * (0.4 + hash01(pi * 2.19) * 0.6);
          state.decor.push({
            type: 'dot',
            z: str(P, 'layer', 'above') === 'below' ? 'below' : 'above',
            x: Math.cos(ang2) * dist * EASE.expoOut(lp),
            y: Math.sin(ang2) * dist * EASE.expoOut(lp) - rise * lp,
            radius: num(P, 'size', 3) * (1 - lp * 0.8),
            color: pColor,
            opacity: num(P, 'opacity', 0.9) * Math.sin(lp * Math.PI),
            glow: num(P, 'glow', 6)
          });
        }
        state.logo.scale = 1 + Math.sin(raw * Math.PI * 2) * num(P, 'scaleAmp', 0.02);
        state.logo.glow = num(P, 'logoGlow', 0);
        state.logo.glowColor = pColor;
        break;
      }

      // ─── HANDWRITING — a nib writing the logo, stroke by stroke ───
      // Unlike path-draw's parallel/staggered windows, strokes here run in
      // strict sequence and each one's duration is proportional to its own
      // length, which is what makes the pace read as a hand rather than a
      // machine. A short flourish is quick; a long curve takes its time.
      case 'handwrite':
        applyHandwrite(state, t, raw, P, svgPaths);
        break;

      // ─── LIQUID FILL — colour pouring into the artwork ────────────
      case 'liquid-fill': {
        var fillEase = EASE[str(P, 'curve', 'easeInOut')] || EASE.easeInOut;
        var rise = fillEase(seg(t, num(P, 'fillStart', 0.05), num(P, 'fillEnd', 0.7)));
        var drain = num(P, 'drain', 1) > 0 ? seg(t, num(P, 'drainStart', 0.88), 1) : 0;
        state.logo.ghost = num(P, 'ghost', 0.18);
        state.logo.fill = {
          type: 'liquid',
          level: clamp01(rise - drain),
          amp: num(P, 'waveHeight', 5),
          freq: num(P, 'waveCount', 2),
          phase: raw * Math.PI * 2 * num(P, 'waveSpeed', 1.5),
          color: str(P, 'color', '#8b5cf6'),
          // A second offset wave keeps the surface from looking like one sine.
          amp2: num(P, 'waveHeight', 5) * 0.55,
          freq2: num(P, 'waveCount', 2) * 1.7
        };
        state.logo.scale = 1 + Math.sin(raw * Math.PI * 2) * num(P, 'scaleAmp', 0);
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'color', '#8b5cf6');
        break;
      }

      // ─── GRADIENT SWEEP — colour travelling through the mark ──────
      case 'gradient-sweep': {
        state.logo.fill = {
          type: 'gradient',
          colors: [
            str(P, 'colorA', '#8b5cf6'),
            str(P, 'colorB', '#22d3ee'),
            str(P, 'colorC', '#f472b6')
          ],
          pos: raw * num(P, 'cycles', 1),
          angle: num(P, 'angle', 30),
          spread: num(P, 'spread', 1),
          opacity: num(P, 'intensity', 1)
        };
        state.logo.scale = 1 + Math.sin(raw * Math.PI * 2) * num(P, 'scaleAmp', 0);
        state.logo.glow = num(P, 'glow', 0);
        break;
      }

      // ─── SHATTER / ASSEMBLE — tiles flying into place ─────────────
      case 'shatter': {
        var assembling = str(P, 'mode', 'assemble') === 'assemble';
        var sEase = EASE[str(P, 'curve', 'expoOut')] || EASE.expoOut;
        var prog = sEase(seg(t, num(P, 'start', 0), num(P, 'end', 0.6)));
        var outP2 = seg(t, num(P, 'exitStart', 0.9), 1);
        state.logo.decompose = {
          mode: 'shatter',
          cols: Math.max(2, Math.round(num(P, 'columns', 8))),
          rows: Math.max(2, Math.round(num(P, 'rows', 8))),
          // 1 = fully dispersed, 0 = assembled.
          disperse: clamp01(assembling ? 1 - prog : prog) + outP2,
          distance: num(P, 'distance', 90),
          spin: num(P, 'spin', 40),
          stagger: clamp01(num(P, 'stagger', 0.5)),
          origin: str(P, 'origin', 'random'),
          fade: num(P, 'fade', 1),
          seed: 7
        };
        state.logo.opacity = 1;
        break;
      }

      // ─── PIXELATE — resolution snapping into focus ────────────────
      case 'pixelate': {
        var pxEase = EASE[str(P, 'curve', 'expoOut')] || EASE.expoOut;
        var sharp = pxEase(seg(t, num(P, 'start', 0.05), num(P, 'end', 0.6)));
        var reblur = seg(t, num(P, 'exitStart', 0.9), 1);
        var amount = clamp01(1 - sharp + reblur);
        state.logo.decompose = {
          mode: 'pixelate',
          // Quantised so the effect steps between resolutions instead of
          // sliding continuously — sliding just looks like a blur.
          steps: Math.max(2, Math.round(num(P, 'steps', 6))),
          amount: amount,
          minBlocks: Math.max(2, Math.round(num(P, 'minBlocks', 4))),
          maxBlocks: Math.max(8, Math.round(num(P, 'maxBlocks', 120)))
        };
        state.logo.opacity = clamp01(seg(t, 0, num(P, 'fadeInEnd', 0.12))) * (1 - reblur * num(P, 'fadeOut', 0));
        break;
      }

      // ─── BANDS — sequential slice reveal (letter-by-letter feel) ──
      case 'bands': {
        var bEase = EASE[str(P, 'curve', 'expoOut')] || EASE.expoOut;
        state.logo.decompose = {
          mode: 'bands',
          count: Math.max(2, Math.round(num(P, 'count', 10))),
          axis: str(P, 'axis', 'vertical'),
          progress: bEase(seg(t, num(P, 'start', 0), num(P, 'end', 0.6))),
          exit: seg(t, num(P, 'exitStart', 0.88), 1),
          overlap: clamp01(num(P, 'overlap', 0.5)),
          slide: num(P, 'slide', 24),
          direction: str(P, 'order', 'forward')
        };
        state.logo.opacity = 1;
        break;
      }

      // ─── NEON FLICKER — a tube struggling, then holding ───────────
      case 'neon': {
        var settleAt = num(P, 'settle', 0.42);
        var on = 1;
        if (t < settleAt) {
          // Deterministic flicker that thins out as it approaches settle.
          var stepN = Math.floor(t * num(P, 'rate', 34));
          var chance = 1 - (t / settleAt);
          on = hash01(stepN * 4.13) < chance * num(P, 'instability', 0.75) ? num(P, 'dimLevel', 0.12) : 1;
        }
        var offAt = num(P, 'offStart', 0.94);
        if (t > offAt) on *= 1 - seg(t, offAt, 1);
        // A slow breath once lit, so it never looks like a frozen frame.
        var breathe = 1 - num(P, 'breathe', 0.05) * (0.5 - Math.cos(raw * Math.PI * 4) * 0.5);
        state.logo.opacity = on * breathe;
        state.logo.glow = num(P, 'glow', 26) * on;
        state.logo.glowColor = str(P, 'glowColor', '#22d3ee');
        break;
      }

      // ─── ZOOM STREAK — radial motion blur burst ───────────────────
      case 'zoom-streak': {
        var zEase = EASE[str(P, 'curve', 'expoOut')] || EASE.expoOut;
        var zin = zEase(seg(t, 0, num(P, 'inEnd', 0.45)));
        var zout = EASE.easeIn(seg(t, num(P, 'outStart', 0.85), 1));
        var intensity = (1 - zin) + zout;
        state.logo.streak = {
          samples: Math.max(2, Math.round(num(P, 'samples', 12))),
          distance: num(P, 'distance', 0.35) * intensity,
          alpha: num(P, 'strength', 0.7)
        };
        state.logo.scale = lerp(num(P, 'fromScale', 1.6), 1, zin) * lerp(1, num(P, 'toScale', 0.7), zout);
        state.logo.opacity = clamp01(seg(t, 0, num(P, 'fadeInEnd', 0.15))) * (1 - zout);
        state.logo.rotate = lerp(num(P, 'fromRotate', 0), 0, zin);
        break;
      }

      // ─── JELLY — squash and stretch that conserves volume ─────────
      case 'jelly': {
        var jCycles = num(P, 'cycles', 1);
        var jp = (raw * jCycles) % 1;
        var amp = num(P, 'squash', 0.18);
        // Decaying oscillation: a jelly wobbles hardest on impact and settles.
        var decay = Math.exp(-num(P, 'damping', 2.4) * jp);
        var osc = Math.sin(jp * Math.PI * 2 * num(P, 'bounces', 2)) * decay;
        // x and y move opposite so area stays roughly constant — that inverse
        // relationship is what makes it read as a squashing volume.
        state.logo.scaleX = 1 + osc * amp;
        state.logo.scaleY = 1 - osc * amp;
        state.logo.ty = -Math.abs(osc) * num(P, 'lift', 0);
        state.logo.rotate = osc * num(P, 'tilt', 0);
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── BOUNCE — a loader hop with impact squash ─────────────────
      case 'bounce': {
        var bCycles = Math.max(1, Math.round(num(P, 'hops', 2)));
        var bp = (raw * bCycles) % 1;
        // Parabolic arc: fast up, hang, fast down — gravity, not a sine.
        var height = 1 - Math.pow(2 * bp - 1, 2);
        state.logo.ty = -height * num(P, 'height', 60);
        // Squash only near the ground, where the impact happens.
        var impact = Math.pow(1 - height, 6);
        var sq = num(P, 'squash', 0.22);
        state.logo.scaleX = 1 + impact * sq;
        state.logo.scaleY = 1 - impact * sq;
        state.logo.rotate = Math.sin(raw * Math.PI * 2) * num(P, 'tilt', 0);
        if (num(P, 'shadow', 0) > 0) {
          state.decor.push({
            type: 'dot', z: 'below', x: 0, y: num(P, 'height', 60) * 0.55 + 40,
            radius: num(P, 'shadow', 0) * (0.5 + (1 - height) * 0.5),
            color: str(P, 'shadowColor', '#000000'),
            opacity: 0.18 + (1 - height) * 0.22, glow: 0, squashY: 0.22
          });
        }
        break;
      }

      // ─── FLIP 3D — perspective card turn with a shaded back ───────
      case 'flip3d': {
        var axis = str(P, 'axis', 'y');
        var turns = num(P, 'turns', 1);
        var angle = raw * 360 * turns;
        var rad = (angle * Math.PI) / 180;
        var face = Math.cos(rad);
        // Foreshortening plus a perspective-driven skew on the leading edge.
        if (axis === 'x') {
          state.logo.scaleY = Math.max(0.02, Math.abs(face));
          state.logo.skewX = Math.sin(rad) * num(P, 'perspective', 8);
        } else {
          state.logo.scaleX = Math.max(0.02, Math.abs(face));
          state.logo.skewY = Math.sin(rad) * num(P, 'perspective', 8);
        }
        // The reverse side is dimmer, which is what sells it as one solid card
        // rather than two images cross-fading.
        var backLit = face < 0 ? num(P, 'backShade', 0.4) : 1;
        state.logo.opacity = backLit * (1 - Math.pow(1 - Math.abs(face), 8) * num(P, 'edgeFade', 0.6));
        state.logo.scale = 1 + (1 - Math.abs(face)) * num(P, 'lift', 0.06);
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── IRIS / SPOTLIGHT — masked reveals ────────────────────────
      case 'iris': {
        var iEase = EASE[str(P, 'curve', 'expoOut')] || EASE.expoOut;
        var open = iEase(seg(t, num(P, 'start', 0), num(P, 'end', 0.55)));
        var close = EASE.easeIn(seg(t, num(P, 'closeStart', 0.88), 1));
        state.logo.clip = {
          type: str(P, 'shape', 'circle'),
          amount: clamp01(open - close),
          feather: num(P, 'feather', 0.12),
          cx: num(P, 'originX', 0),
          cy: num(P, 'originY', 0),
          spin: raw * 360 * num(P, 'spin', 0),
          blades: Math.max(3, Math.round(num(P, 'blades', 6)))
        };
        state.logo.scale = lerp(num(P, 'fromScale', 1), 1, open);
        state.logo.rotate = lerp(num(P, 'fromRotate', 0), 0, open);
        state.logo.glow = num(P, 'glow', 0);
        state.logo.glowColor = str(P, 'glowColor', null);
        break;
      }

      // ─── CONFETTI — celebratory burst with gravity and spin ───────
      case 'confetti': {
        var cc = Math.max(1, Math.round(num(P, 'count', 40)));
        var burstAt = num(P, 'burstAt', 0.18);
        var cLife = num(P, 'life', 0.7);
        var grav = num(P, 'gravity', 260);
        var speed = num(P, 'velocity', 200);
        var palette = [
          str(P, 'colorA', '#8b5cf6'), str(P, 'colorB', '#22d3ee'),
          str(P, 'colorC', '#fcd34d'), str(P, 'colorD', '#f472b6')
        ];
        for (var ci = 0; ci < cc; ci++) {
          var ct = (t - burstAt) / cLife;
          if (ct < 0 || ct > 1) continue;
          var a0 = hash01(ci * 1.77) * Math.PI * 2;
          var v = speed * (0.45 + hash01(ci * 3.11) * 0.55);
          // Ballistic: constant horizontal, gravity-accelerated vertical.
          var cxp = Math.cos(a0) * v * ct;
          var cyp = Math.sin(a0) * v * ct + 0.5 * grav * ct * ct;
          state.decor.push({
            type: 'chip', z: 'above',
            x: cxp, y: cyp,
            w: num(P, 'size', 7) * (0.6 + hash01(ci * 6.5) * 0.8),
            h: num(P, 'size', 7) * (0.3 + hash01(ci * 8.2) * 0.5),
            rotate: hash01(ci * 4.4) * 360 + ct * 360 * num(P, 'spin', 3) * (hash01(ci * 2.2) > 0.5 ? 1 : -1),
            color: palette[ci % palette.length],
            opacity: (1 - Math.pow(ct, 2)) * num(P, 'opacity', 1),
            round: str(P, 'shape', 'rect') === 'circle'
          });
        }
        var pop = EASE.backOut(seg(t, 0, burstAt));
        state.logo.scale = lerp(num(P, 'fromScale', 0.6), 1, pop);
        state.logo.opacity = clamp01(seg(t, 0, burstAt * 0.7)) * (1 - seg(t, num(P, 'outStart', 0.92), 1));
        state.logo.glow = num(P, 'glow', 0);
        break;
      }

      default:
        break;
    }

    return state;
  }

  /**
   * Sequential, length-weighted stroke writing with a nib riding the tip.
   */
  function applyHandwrite(state, t, raw, P, svgPaths) {
    var count = svgPaths.length;
    if (!count) { state.logo.opacity = clamp01(seg(t, 0.2, 0.4)); return; }

    var writeStart = num(P, 'writeStart', 0.02);
    var writeEnd = num(P, 'writeEnd', 0.72);
    var gap = clamp01(num(P, 'strokeGap', 0.12));   // pause between strokes
    var holdEnd = num(P, 'holdEnd', 0.9);
    var fadeEnd = num(P, 'fadeEnd', 1);
    var nib = num(P, 'nibSize', 4);
    var glow = num(P, 'glow', 0);
    var widthMul = num(P, 'strokeScale', 1);
    var colorMode = str(P, 'colorMode', 'source');
    var inkColor = str(P, 'color', '#f8fafc');
    var pressure = num(P, 'pressure', 0);

    // Weight each stroke by its own length so long curves take longer.
    var total = 0, i;
    for (i = 0; i < count; i++) total += (svgPaths[i] && svgPaths[i].length) || 1;
    if (total <= 0) total = 1;

    var span = Math.max(0.01, writeEnd - writeStart);
    var gapTotal = gap * span * (count > 1 ? (count - 1) / count : 0);
    var drawTotal = span - gapTotal;

    var cursor = writeStart;
    for (i = 0; i < count; i++) {
      var pd = svgPaths[i];
      if (!pd || !pd.d) continue;
      var len = pd.length || 1000;
      var share = (len / total) * drawTotal;
      var s0 = cursor;
      var s1 = cursor + share;
      cursor = s1 + (count > 1 ? gapTotal / (count - 1) : 0);

      // Ease within each stroke: a hand accelerates out of a start and slows
      // into a stop, so linear here would read mechanical.
      var dp = EASE.easeInOut(seg(t, s0, s1));
      if (dp <= 0) continue;

      var op = 1;
      if (t > holdEnd) op = 1 - seg(t, holdEnd, fadeEnd);
      if (op <= 0.001) continue;

      var color = colorMode === 'custom' ? inkColor : (pd.color || inkColor);
      // Pressure: the stroke swells through the middle of its travel.
      var swell = pressure > 0 ? 1 + Math.sin(dp * Math.PI) * pressure : 1;

      state.paths.push({
        d: pd.d,
        length: len,
        color: color,
        strokeWidth: (parseFloat(pd.strokeWidth) || 2) * widthMul * swell,
        opacity: op,
        dash: [dp * len, len],
        dashOffset: 0,
        glow: glow,
        glowLayers: Math.max(1, Math.round(num(P, 'glowLayers', 1))),
        glowColor: str(P, 'glowColor', null),
        lineCap: str(P, 'lineCap', 'round'),
        drawProgress: dp,
        matrix: pd.matrix || null
      });

      // The nib only exists while this stroke is actually being written.
      if (nib > 0 && dp > 0.001 && dp < 0.999) {
        state.decor.push({
          type: 'pathHead', z: 'above',
          d: pd.d, at: dp, length: len,
          radius: nib,
          color: str(P, 'nibColor', color),
          opacity: op,
          glow: glow || nib,
          matrix: pd.matrix || null
        });
      }
    }

    // The filled logo settles in once the writing is done.
    if (bool(P, 'revealLogo', true)) {
      var lStart = num(P, 'logoFadeStart', 0.74);
      var lEnd = num(P, 'logoFadeEnd', 0.88);
      state.logo.opacity = clamp01(seg(t, lStart, lEnd)) * (1 - seg(t, holdEnd, fadeEnd));
    } else {
      state.logo.opacity = 0;
    }
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

      // Lottie-style trim path: an independently addressable window on the
      // stroke, applied on top of whatever the mode computed. trimOffset
      // rotates that window around the path without changing its length.
      var trimStart = clamp01(num(P, 'trimStart', 0));
      var trimEnd = clamp01(num(P, 'trimEnd', 1));
      var trimOffset = num(P, 'trimOffset', 0);
      var trimSpin = num(P, 'trimSpin', 0);
      var hasTrim = trimStart > 0 || trimEnd < 1 || trimOffset !== 0 || trimSpin !== 0;

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

      // Trim overrides the mode's dash window entirely — it is a more explicit
      // control and the two would otherwise fight over the same dash array.
      if (hasTrim) {
        var span = Math.max(0, trimEnd - trimStart) * dp;
        var start = trimStart + trimOffset + raw * trimSpin;
        dash = [span * len, len];
        dashOffset = -start * len;
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
        glowLayers: Math.max(1, Math.round(num(P, 'glowLayers', 1))),
        glowColor: str(P, 'glowColor', null),
        lineCap: lineCap,
        drawProgress: dp,
        matrix: pd.matrix || null
      });

      // A bright head-dot riding the leading edge of the stroke.
      if (num(P, 'headDot', 0) > 0 && dp > 0 && dp < 1 && mode === 'trace') {
        state.decor.push({
          type: 'pathHead', z: 'above',
          d: pd.d, at: dp, length: len,
          radius: num(P, 'headDot', 0),
          color: str(P, 'headColor', color),
          opacity: op,
          glow: glow || num(P, 'headDot', 0) * 2,
          matrix: pd.matrix || null
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
      if (L.skewX || L.skewY) {
        ctx.transform(1, Math.tan(((L.skewY || 0) * Math.PI) / 180),
                      Math.tan(((L.skewX || 0) * Math.PI) / 180), 1, 0, 0);
      }
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
        // A dim copy underneath, so a partial reveal still reads as the whole
        // shape rather than a disconnected fragment.
        if (L.ghost > 0) {
          ctx.save();
          ctx.globalAlpha = clamp01(L.opacity) * L.ghost;
          ctx.drawImage(logoImg, -imgW / 2, -imgH / 2, imgW, imgH);
          ctx.restore();
        }

        if (L.streak) {
          drawStreak(ctx, logoImg, imgW, imgH, L.streak);
        } else if (L.decompose) {
          drawDecomposed(ctx, logoImg, imgW, imgH, L.decompose);
        } else if (L.warp) {
          drawWarped(ctx, logoImg, imgW, imgH, L.warp);
        } else {
          ctx.drawImage(logoImg, -imgW / 2, -imgH / 2, imgW, imgH);
        }

        // Fills are masked by the artwork's alpha, so colour pours into the
        // mark instead of sitting in a box behind it.
        if (L.fill) drawFill(ctx, L.fill, imgW, imgH);
        // The shine is composited with source-atop so it only lands on the
        // artwork's own pixels — that containment is what makes it read as a
        // reflection in the surface rather than a bar drawn over the top.
        if (L.shine && L.shine.active && L.shine.intensity > 0) {
          drawShine(ctx, L.shine, imgW, imgH);
        }
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

      // The path's own local→viewport matrix. This carries every ancestor <g>
      // transform plus the viewBox scale, so a path authored in a transformed
      // group or a viewBox that doesn't match width/height still lands exactly
      // on top of the rasterised logo.
      var mScale = 1;
      if (p.matrix) {
        var m = p.matrix;
        ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        mScale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
      }

      ctx.globalAlpha = clamp01(p.opacity);
      ctx.strokeStyle = p.color;
      ctx.lineCap = p.lineCap || 'round';
      ctx.lineJoin = 'round';
      if (p.dash) {
        ctx.setLineDash(p.dash);
        ctx.lineDashOffset = p.dashOffset || 0;
      }

      var path2d = null;
      try { path2d = new Path2D(p.d); } catch (e) { path2d = null; }

      if (path2d) {
        // Layered glow: successive passes, each wider and more transparent,
        // build a falloff that a single shadowBlur cannot — this is what gives
        // neon strokes their bloom instead of a flat halo.
        var layers = p.glow > 0 ? (p.glowLayers || 1) : 1;
        var glowCol = p.glowColor || p.color;
        for (var g = layers; g >= 1; g--) {
          if (g > 1) {
            var f = g / layers;
            ctx.globalAlpha = clamp01(p.opacity) * 0.22 * f;
            ctx.lineWidth = p.strokeWidth * (1 + f * 2.2);
            ctx.strokeStyle = glowCol;
            ctx.shadowBlur = (p.glow * f * totalScale * mScale);
            ctx.shadowColor = glowCol;
          } else {
            ctx.globalAlpha = clamp01(p.opacity);
            ctx.lineWidth = p.strokeWidth;
            ctx.strokeStyle = p.color;
            ctx.shadowBlur = p.glow > 0 ? p.glow * totalScale * mScale * 0.6 : 0;
            ctx.shadowColor = glowCol;
          }
          ctx.stroke(path2d);
        }
      }
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

  /**
   * Draws the logo as a stack of thin slices, each displaced independently.
   * Canvas 2D has no mesh warp, so slicing is how wave/liquid/glitch get real
   * geometric distortion instead of a whole-image transform.
   *
   * Slices overlap by 1px (`bleed`) because adjacent drawImage calls on
   * fractional offsets otherwise leave hairline seams.
   */
  function drawWarped(ctx, img, imgW, imgH, warp) {
    var slices = Math.max(2, warp.slices | 0);
    var vertical = warp.axis === 'vertical';
    var bleed = 1;

    if (warp.mode === 'glitch') {
      var sliceH = imgH / slices;
      for (var i = 0; i < slices; i++) {
        var sy = i * sliceH;
        var r = hash01(warp.seed * 13.7 + i * 7.3);
        // Only some slices move; a uniform shear reads as a skew, not a glitch.
        var dx = r > 0.55 ? (hash01(warp.seed * 3.1 + i) - 0.5) * 2 * warp.amplitude : 0;
        var h = Math.min(sliceH + bleed, imgH - sy);

        if (warp.chroma > 0 && dx !== 0) {
          // Cheap chromatic fringe: additive cyan/red copies either side.
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.5;
          ctx.drawImage(img, 0, sy, imgW, h,
            -imgW / 2 + dx - warp.chroma, -imgH / 2 + sy, imgW, h);
          ctx.drawImage(img, 0, sy, imgW, h,
            -imgW / 2 + dx + warp.chroma, -imgH / 2 + sy, imgW, h);
          ctx.restore();
        }
        ctx.drawImage(img, 0, sy, imgW, h, -imgW / 2 + dx, -imgH / 2 + sy, imgW, h);
      }
      return;
    }

    // Wave / radial ripple.
    var n = slices;
    if (warp.axis === 'radial') {
      var sliceHr = imgH / n;
      for (var j = 0; j < n; j++) {
        var syr = j * sliceHr;
        var u = j / (n - 1) - 0.5;                  // -0.5 .. 0.5 from centre
        var amp = warp.amplitude * Math.cos(u * Math.PI);
        var dxr = Math.sin(u * Math.PI * 2 * warp.frequency + warp.phase) * amp;
        var hr = Math.min(sliceHr + bleed, imgH - syr);
        ctx.drawImage(img, 0, syr, imgW, hr, -imgW / 2 + dxr, -imgH / 2 + syr, imgW, hr);
      }
      return;
    }

    if (vertical) {
      var sliceW = imgW / n;
      for (var k = 0; k < n; k++) {
        var sx = k * sliceW;
        var uk = k / (n - 1);
        var dy = Math.sin(uk * Math.PI * 2 * warp.frequency + warp.phase) * warp.amplitude;
        var dxc = warp.crossAmplitude
          ? Math.cos(uk * Math.PI * 2 * warp.crossFrequency + warp.phase * 0.6) * warp.crossAmplitude
          : 0;
        var w = Math.min(sliceW + bleed, imgW - sx);
        ctx.drawImage(img, sx, 0, w, imgH, -imgW / 2 + sx + dxc, -imgH / 2 + dy, w, imgH);
      }
      return;
    }

    var sliceH2 = imgH / n;
    for (var q = 0; q < n; q++) {
      var sy2 = q * sliceH2;
      var uq = q / (n - 1);
      var dx2 = Math.sin(uq * Math.PI * 2 * warp.frequency + warp.phase) * warp.amplitude;
      var dy2 = warp.crossAmplitude
        ? Math.cos(uq * Math.PI * 2 * warp.crossFrequency + warp.phase * 0.6) * warp.crossAmplitude
        : 0;
      var h2 = Math.min(sliceH2 + bleed, imgH - sy2);
      ctx.drawImage(img, 0, sy2, imgW, h2, -imgW / 2 + dx2, -imgH / 2 + sy2 + dy2, imgW, h2);
    }
  }

  /**
   * Colour poured into the artwork's own alpha via 'source-atop'.
   * Liquid uses two offset sine waves for the surface; a single sine reads as
   * a moving straight line rather than a fluid.
   */
  function drawFill(ctx, fill, imgW, imgH) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';

    if (fill.type === 'liquid') {
      var top = imgH / 2 - fill.level * imgH;   // surface y, in logo space
      ctx.beginPath();
      ctx.moveTo(-imgW / 2, imgH / 2);
      var stepsL = 64;
      for (var i = 0; i <= stepsL; i++) {
        var u = i / stepsL;
        var x = -imgW / 2 + u * imgW;
        var y = top
          + Math.sin(u * Math.PI * 2 * fill.freq + fill.phase) * fill.amp
          + Math.sin(u * Math.PI * 2 * fill.freq2 - fill.phase * 1.4) * fill.amp2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(imgW / 2, imgH / 2);
      ctx.closePath();
      ctx.fillStyle = fill.color;
      ctx.fill();
      ctx.restore();
      return;
    }

    // Gradient: the stops travel, so colour appears to flow through the mark.
    var diag = Math.sqrt(imgW * imgW + imgH * imgH);
    ctx.rotate((fill.angle * Math.PI) / 180);
    var g = ctx.createLinearGradient(-diag / 2, 0, diag / 2, 0);
    var cols = fill.colors;
    var shift = fill.pos % 1;
    for (var k = 0; k <= cols.length; k++) {
      var stop = (k / cols.length + shift) % 1;
      g.addColorStop(clamp01(stop), cols[k % cols.length]);
    }
    // Anchor both ends so createLinearGradient never rejects an unsorted stop.
    g.addColorStop(0, cols[Math.floor(shift * cols.length) % cols.length]);
    g.addColorStop(1, cols[Math.floor(shift * cols.length) % cols.length]);
    ctx.globalAlpha = clamp01(fill.opacity);
    ctx.fillStyle = g;
    ctx.fillRect(-diag, -diag, diag * 2, diag * 2);
    ctx.restore();
  }

  /** Radial zoom streak: stacked scaled copies fading outward. */
  function drawStreak(ctx, img, imgW, imgH, streak) {
    var n = streak.samples;
    if (streak.distance <= 0.001) {
      ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
      return;
    }
    ctx.save();
    for (var i = n - 1; i >= 0; i--) {
      var f = i / (n - 1 || 1);
      var s = 1 + f * streak.distance;
      ctx.globalAlpha = (i === 0 ? 1 : streak.alpha * (1 - f) / n * 2.2);
      ctx.drawImage(img, (-imgW / 2) * s, (-imgH / 2) * s, imgW * s, imgH * s);
    }
    ctx.restore();
  }

  // Offscreen buffer reused by the pixelate path, so we are not allocating a
  // canvas every frame.
  var _buf = null, _bufCtx = null;
  function scratch(w, h) {
    if (!_buf) {
      _buf = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(w, h)
        : (typeof document !== 'undefined' ? document.createElement('canvas') : null);
      if (!_buf) return null;
      _bufCtx = _buf.getContext('2d');
    }
    if (_buf.width !== w || _buf.height !== h) { _buf.width = w; _buf.height = h; }
    _bufCtx.clearRect(0, 0, w, h);
    return _bufCtx;
  }

  /** Shatter / pixelate / band reveals. */
  function drawDecomposed(ctx, img, imgW, imgH, dec) {
    if (dec.mode === 'pixelate') {
      // Quantise to discrete resolutions so it steps rather than slides.
      var q = Math.round((1 - dec.amount) * dec.steps) / dec.steps;
      var blocks = Math.round(lerp(dec.minBlocks, dec.maxBlocks, q));
      if (dec.amount <= 0.001 || blocks >= dec.maxBlocks) {
        ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
        return;
      }
      var bw = Math.max(1, blocks);
      var bh = Math.max(1, Math.round(blocks * (imgH / imgW)));
      var bctx = scratch(bw, bh);
      if (!bctx) { ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH); return; }
      bctx.imageSmoothingEnabled = true;
      bctx.drawImage(img, 0, 0, bw, bh);
      var prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;   // keeps the blocks hard-edged
      ctx.drawImage(_buf, 0, 0, bw, bh, -imgW / 2, -imgH / 2, imgW, imgH);
      ctx.imageSmoothingEnabled = prev;
      return;
    }

    if (dec.mode === 'bands') {
      var n = dec.count;
      var vertical = dec.axis === 'vertical';
      for (var i = 0; i < n; i++) {
        var idx = dec.direction === 'reverse' ? n - 1 - i
                : dec.direction === 'centre' ? Math.abs(i - (n - 1) / 2) / ((n - 1) / 2) * (n - 1)
                : i;
        // Overlapping windows so bands cross-fade instead of popping.
        var w0 = (idx / n) * (1 - dec.overlap);
        var w1 = w0 + (1 / n) + dec.overlap * (1 - 1 / n);
        var bp = clamp01((dec.progress - w0) / Math.max(0.0001, w1 - w0)) * (1 - dec.exit);
        if (bp <= 0.001) continue;

        ctx.save();
        ctx.beginPath();
        if (vertical) {
          var bwid = imgW / n;
          ctx.rect(-imgW / 2 + i * bwid, -imgH / 2, bwid + 0.6, imgH);
        } else {
          var bhei = imgH / n;
          ctx.rect(-imgW / 2, -imgH / 2 + i * bhei, imgW, bhei + 0.6);
        }
        ctx.clip();
        ctx.globalAlpha = bp;
        var off = (1 - bp) * dec.slide;
        ctx.drawImage(img,
          -imgW / 2 + (vertical ? 0 : off),
          -imgH / 2 + (vertical ? off : 0),
          imgW, imgH);
        ctx.restore();
      }
      return;
    }

    // Shatter: a grid of tiles pushed away from the centre.
    var cols = dec.cols, rows = dec.rows;
    var tw = imgW / cols, th = imgH / rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var id = r * cols + c;
        // Stagger by a per-tile offset so they do not all move as one sheet.
        var lag = dec.stagger * hash01(id * 2.71 + dec.seed);
        var d = clamp01((dec.disperse - lag) / Math.max(0.0001, 1 - dec.stagger));
        if (d >= 0.999) continue;

        var sx = c * tw, sy = r * th;
        var px = -imgW / 2 + sx, py = -imgH / 2 + sy;
        var ang, dist = d * dec.distance;
        if (dec.origin === 'radial') {
          ang = Math.atan2((sy + th / 2) - imgH / 2, (sx + tw / 2) - imgW / 2);
        } else {
          ang = hash01(id * 5.31 + dec.seed) * Math.PI * 2;
        }
        var dx = Math.cos(ang) * dist;
        var dy = Math.sin(ang) * dist;
        var rot = (hash01(id * 9.7 + dec.seed) - 0.5) * 2 * dec.spin * d;

        ctx.save();
        ctx.translate(px + tw / 2 + dx, py + th / 2 + dy);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.globalAlpha = 1 - d * dec.fade;
        // +0.6 overlap hides seams between adjacent tiles.
        ctx.drawImage(img, sx, sy, tw, th, -tw / 2, -th / 2, tw + 0.6, th + 0.6);
        ctx.restore();
      }
    }
  }

  /**
   * A specular band composited with 'source-atop', so it is masked by the
   * artwork's own alpha and never paints on empty background.
   */
  function drawShine(ctx, shine, imgW, imgH) {
    var diag = Math.sqrt(imgW * imgW + imgH * imgH);
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.rotate((shine.angle * Math.PI) / 180);

    var band = Math.max(2, shine.width * diag);
    var travel = (shine.pos * (diag + band * 2)) - diag / 2 - band;
    var grad = ctx.createLinearGradient(travel, 0, travel + band, 0);
    var soft = clamp01(shine.softness);
    grad.addColorStop(0, withAlpha(shine.color, 0));
    grad.addColorStop(0.5 - 0.28 * soft, withAlpha(shine.color, shine.intensity * 0.35));
    grad.addColorStop(0.5, withAlpha(shine.color, shine.intensity));
    grad.addColorStop(0.5 + 0.28 * soft, withAlpha(shine.color, shine.intensity * 0.35));
    grad.addColorStop(1, withAlpha(shine.color, 0));

    ctx.fillStyle = grad;
    ctx.fillRect(-diag, -diag, diag * 2, diag * 2);
    ctx.restore();
  }

  function applyWipeClip(ctx, clip, imgW, imgH) {
    var a = clamp01(clip.amount);

    // Iris family: circular, shaped or bladed apertures opening from a point.
    if (clip.type === 'circle' || clip.type === 'diamond' || clip.type === 'blades') {
      var maxR = Math.sqrt(imgW * imgW + imgH * imgH) * 0.62;
      var r = a * maxR;
      var ox = (clip.cx || 0) * imgW * 0.5;
      var oy = (clip.cy || 0) * imgH * 0.5;
      ctx.beginPath();
      if (clip.type === 'circle') {
        ctx.arc(ox, oy, Math.max(0, r), 0, Math.PI * 2);
      } else if (clip.type === 'diamond') {
        ctx.moveTo(ox, oy - r);
        ctx.lineTo(ox + r, oy);
        ctx.lineTo(ox, oy + r);
        ctx.lineTo(ox - r, oy);
        ctx.closePath();
      } else {
        // A camera-shutter aperture: n blades rotating as they open.
        var n = clip.blades || 6;
        var spin = ((clip.spin || 0) * Math.PI) / 180;
        for (var i = 0; i <= n; i++) {
          var ang = spin + (i / n) * Math.PI * 2;
          var px = ox + Math.cos(ang) * r;
          var py = oy + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
      ctx.clip();
      return;
    }

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
        // squashY flattens a dot into a contact shadow ellipse.
        if (d.squashY) ctx.scale(1, d.squashY);
        ctx.globalAlpha = clamp01(d.opacity);
        ctx.fillStyle = d.color;
        if (d.glow > 0) { ctx.shadowBlur = d.glow * baseScale; ctx.shadowColor = d.color; }
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.3, d.radius * baseScale), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (d.type === 'chip') {
        // A confetti flake: a small rotating rectangle or disc.
        ctx.save();
        ctx.translate(cx + d.x * baseScale, cy + d.y * baseScale);
        ctx.rotate((d.rotate * Math.PI) / 180);
        ctx.globalAlpha = clamp01(d.opacity);
        ctx.fillStyle = d.color;
        var cw = Math.max(0.5, d.w * baseScale);
        var ch = Math.max(0.5, d.h * baseScale);
        if (d.round) {
          ctx.beginPath();
          ctx.ellipse(0, 0, cw / 2, ch / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
        }
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
        // Same local→viewport matrix the stroke uses, or the dot rides a
        // differently-positioned copy of the path.
        if (d.matrix) {
          ctx.transform(d.matrix.a, d.matrix.b, d.matrix.c, d.matrix.d, d.matrix.e, d.matrix.f);
        }
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
    makeSpring: makeSpring,
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
