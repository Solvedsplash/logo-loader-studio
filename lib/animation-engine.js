/**
 * Shared Animation Engine (v2.0 - Canvas Edition)
 * This logic is used by both the browser preview and the Puppeteer export.
 * It synthesizes frames mathematically on a 2D Canvas context.
 */

export function renderFrame(ctx, progress, logoImg, animation, svgPaths = []) {
  // --- INJECTED HELPERS (Self-contained for Puppeteer) ---
  const cubicBezier = (x1, y1, x2, y2) => {
    if (!(0 <= x1 && x1 <= 1 && 0 <= x2 && x2 <= 1)) return t => t;
    if (x1 === y1 && x2 === y2) return t => t;
    const sampleValues = new Float32Array(11);
    for (let i = 0; i < 11; ++i) sampleValues[i] = (((1.0 - 3.0 * x2 + 3.0 * x1) * (i * 0.1) + (3.0 * x2 - 6.0 * x1)) * (i * 0.1) + (3.0 * x1)) * (i * 0.1);
    function getTForX(aX) {
      let intervalStart = 0.0, currentSample = 1;
      for (; currentSample !== 10 && sampleValues[currentSample] <= aX; ++currentSample) intervalStart += 0.1;
      --currentSample;
      let guessForT = intervalStart + (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]) * 0.1;
      for (let i = 0; i < 4; ++i) {
        const slope = 3.0 * (1.0 - 3.0 * x2 + 3.0 * x1) * guessForT * guessForT + 2.0 * (3.0 * x2 - 6.0 * x1) * guessForT + (3.0 * x1);
        if (slope === 0) return guessForT;
        guessForT -= ((((1.0 - 3.0 * x2 + 3.0 * x1) * guessForT + (3.0 * x2 - 6.0 * x1)) * guessForT + (3.0 * x1)) * guessForT - aX) / slope;
      }
      return guessForT;
    }
    return x => x === 0 || x === 1 ? x : (((1.0 - 3.0 * y2 + 3.0 * y1) * getTForX(x) + (3.0 * y2 - 6.0 * y1)) * getTForX(x) + (3.0 * y1)) * getTForX(x);
  };

  const EASING_MAP = {
    'linear': [0, 0, 1, 1],
    'ease': [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
  };

  const getEasingFn = (easingStr) => {
    if (!easingStr) return t => t;
    if (EASING_MAP[easingStr]) return cubicBezier(...EASING_MAP[easingStr]);
    const match = easingStr.match(/cubic-bezier\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
    if (match) return cubicBezier(...match.slice(1, 5).map(Number));
    return t => t;
  };

  const EASE = {
    easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    cubicBezier: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    pop: t => 1 - Math.pow(1 - t, 3),
    bounce: t => {
      const n1 = 7.5625, d1 = 2.75;
      let _t = t;
      if (_t < 1 / d1) return n1 * _t * _t;
      if (_t < 2 / d1) return n1 * (_t -= 1.5 / d1) * _t + 0.75;
      if (_t < 2.5 / d1) return n1 * (_t -= 2.25 / d1) * _t + 0.9375;
      return n1 * (_t -= 2.625 / d1) * _t + 0.984375;
    },
    backOut: t => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  // --- END HELPERS ---

  if (!ctx || !logoImg) return;

  const { width, height } = ctx.canvas;
  
  // High-Quality Matting: If a background color is provided, draw it first for smooth alpha blending
  if (animation.backgroundColor) {
    ctx.fillStyle = animation.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  const globalEase = getEasingFn(animation.easing);
  const t = Math.max(0, Math.min(1, globalEase(progress)));

  const FAMILY = animation.family;
  const vars = animation.vars;

  // Extract variables
  const AMP_Y = parseFloat(vars['--amp-y']) || 0;
  const AMP_X = parseFloat(vars['--amp-x']) || 0;
  const SCALE_MIN = parseFloat(vars['--scale-min']) || 1;
  const SCALE_MAX = parseFloat(vars['--scale-max']) || 1;
  const FADE_MIN = parseFloat(vars['--fade-min']) || 0;
  const ROTATE_DEG = parseFloat(vars['--rotate-deg']) || 0;
  const BLUR_MAX = parseFloat(vars['--blur-max']) || 0;
  const PARTICLE_OFFSET = parseFloat(vars['--particle-offset']) || 0;

  // Initial State
  let tx = width / 2;
  let ty = height / 2;
  let scale = 1;
  let rotate = 0;
  let opacity = 1;
  let blur = 0;

  switch (FAMILY) {
    case 'notion-fade':
    case 'fade-in-out':
      opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
      break;

    case 'linear-breathe':
      scale = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
      opacity = t < 0.5 ? lerp(0.94, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
      break;

    case 'vercel-float': {
      const y = t < 0.5 ? lerp(AMP_Y * 0.8, -AMP_Y, t * 2) : lerp(-AMP_Y, AMP_Y * 0.8, (t - 0.5) * 2);
      ty += y;
      opacity = t < 0.5 ? lerp(0.92, 1, t * 2) : lerp(1, 0.92, (t - 0.5) * 2);
      break;
    }

    case 'stripe-slide': {
      const y = t < 0.5 ? lerp(AMP_Y, 0, t * 2) : lerp(0, -AMP_Y, (t - 0.5) * 2);
      ty += y;
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;
    }

    case 'github-zoom':
      scale = t < 0.5 ? lerp(SCALE_MIN - 0.06, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;

    case 'framer-blur':
      blur = t < 0.5 ? lerp(0, BLUR_MAX, t * 2) : lerp(BLUR_MAX, 0, (t - 0.5) * 2);
      opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
      break;

    case 'figma-tilt':
      rotate = t < 0.5 ? lerp(-ROTATE_DEG, ROTATE_DEG, t * 2) : lerp(ROTATE_DEG, -ROTATE_DEG, (t - 0.5) * 2);
      scale = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
      opacity = t < 0.5 ? lerp(0.95, 1, t * 2) : lerp(1, 0.95, (t - 0.5) * 2);
      break;

    case 'slack-spin':
      rotate = ROTATE_DEG * 8 * t;
      opacity = t < 0.5 ? lerp(0.9, 1, t * 2) : lerp(1, 0.9, (t - 0.5) * 2);
      break;

    case 'airtable-drift':
      tx += t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;

    case 'intercom-pop': {
      const et = EASE.pop(t);
      scale = et < 0.2 ? lerp(SCALE_MIN, SCALE_MAX, et / 0.2)
        : et < 0.6 ? lerp(SCALE_MAX, (SCALE_MIN + SCALE_MAX) / 2, (et - 0.2) / 0.4)
        : lerp((SCALE_MIN + SCALE_MAX) / 2, SCALE_MIN, (et - 0.6) / 0.4);
      opacity = et < 0.2 ? lerp(0.88, 1, et / 0.2)
        : et < 0.6 ? lerp(1, 0.95, (et - 0.2) / 0.4)
        : lerp(0.95, 0.88, (et - 0.6) / 0.4);
      break;
    }

    case 'dropbox-reveal': {
      ty += t < 0.6 ? lerp(AMP_Y * 0.8, 0, t / 0.6) : lerp(0, -AMP_Y * 0.35, (t - 0.6) / 0.4);
      scale = t < 0.6 ? lerp(SCALE_MIN, 1, t / 0.6) : lerp(1, 1.01, (t - 0.6) / 0.4);
      opacity = t < 0.35 ? lerp(0, 0.8, t / 0.35)
        : t < 0.6 ? lerp(0.8, 1, (t - 0.35) / 0.25)
        : lerp(1, 0.9, (t - 0.6) / 0.4);
      break;
    }

    case 'asana-sweep':
      tx += t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
      scale = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;

    case 'shopify-soft-bounce':
      ty += t < 0.22 ? lerp(0, -AMP_Y, t / 0.22)
        : t < 0.42 ? lerp(-AMP_Y, -AMP_Y * 0.3, (t - 0.22) / 0.2)
        : t < 0.7 ? lerp(-AMP_Y * 0.3, -AMP_Y * 0.6, (t - 0.42) / 0.28)
        : lerp(-AMP_Y * 0.6, 0, (t - 0.7) / 0.3);
      scale = t < 0.22 ? lerp(SCALE_MIN, SCALE_MAX, EASE.bounce(t)) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.22) / 0.78);
      opacity = t < 0.22 ? lerp(0.9, 1, t / 0.22) : lerp(1, 0.9, (t - 0.22) / 0.78);
      break;

    case 'monday-blink':
      opacity = (t > 0.18 && t < 0.28) || (t > 0.48 && t < 0.58) ? FADE_MIN : 1;
      scale = opacity === FADE_MIN ? SCALE_MIN : 1;
      break;

    case 'loom-settle': {
      ty += t < 0.5 ? lerp(AMP_Y, -AMP_Y * 0.5, t * 2)
        : t < 0.72 ? lerp(-AMP_Y * 0.5, AMP_Y * 0.15, (t - 0.5) / 0.22)
        : lerp(AMP_Y * 0.15, 0, (t - 0.72) / 0.28);
      scale = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2)
        : t < 0.72 ? lerp(SCALE_MAX, 0.99, (t - 0.5) / 0.22)
        : lerp(0.99, 1, (t - 0.72) / 0.28);
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
      break;
    }

    case 'canva-glide': {
      tx += t < 0.5 ? lerp(-AMP_X * 0.8, 0, t * 2) : lerp(0, AMP_X * 0.8, (t - 0.5) / 0.5);
      ty += t < 0.5 ? lerp(AMP_Y * 0.4, 0, t * 2) : lerp(0, -AMP_Y * 0.4, (t - 0.5) / 0.5);
      scale = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) / 0.5);
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) / 0.5);
      break;
    }

    case 'scale-pulse':
      scale = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
      opacity = t < 0.5 ? lerp(0.86, 1, t * 2) : lerp(1, 0.86, (t - 0.5) * 2);
      break;

    case 'path-draw': {
      if (t < 0.35) opacity = 0;
      else if (t < 0.60) opacity = lerp(0, 1, (t - 0.35) / 0.25);
      else if (t < 0.85) opacity = 1;
      else if (t < 0.95) opacity = lerp(1, 0, (t - 0.85) / 0.10);
      else opacity = 0;
      break;
    }
    case 'pro-morph': {
      // Liquid Morph Phase Management
      // 0.0 - 0.4: Logo to Circle
      // 0.4 - 0.7: Liquid Pulse
      // 0.7 - 1.0: Circle to Logo
      
      const morphT = progress; // Global progress
      
      if (morphT < 0.4) {
        const r = morphT / 0.4;
        scale = lerp(1, 0.4, EASE.easeInOut(r));
        blur = lerp(0, 14, EASE.easeInOut(r));
        opacity = 1;
      } else if (morphT > 0.7) {
        const r = (morphT - 0.7) / 0.3;
        scale = EASE.backOut(r);
        blur = lerp(14, 0, EASE.easeInOut(r));
        opacity = 1;
      } else {
        scale = 0.4;
        blur = 14;
        opacity = 1;
      }
      
      // High-End Liquid Filter (Metaball Technique)
      if (blur > 0) {
        ctx.filter = `blur(${blur}px) contrast(30)`;
      }
      break;
    }
  }

  const baseScale = width / 440; // Reference scale based on preview physical width
  const targetSize = 220; // Standard studio logo size in logical pixels
  const imgW = logoImg.width || targetSize;
  const imgH = logoImg.height || targetSize;
  const fitScale = targetSize / Math.max(imgW, imgH);
  const totalScale = scale * baseScale * fitScale;
  
  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(totalScale, totalScale);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.globalAlpha = opacity;
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  
  ctx.drawImage(logoImg, -imgW / 2, -imgH / 2, imgW, imgH);
  ctx.restore();

  // Draw Path Overlays (Deterministic Trim Path)
  if (FAMILY === 'path-draw' && svgPaths.length > 0) {
    svgPaths.forEach(pathData => {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(totalScale, totalScale);
      ctx.translate(-imgW / 2, -imgH / 2); 
      
      const p = new Path2D(pathData.d);
      const len = pathData.length;
      let pOpacity = 0, drawProgress = 0;

      // Professional multi-stage timeline for path drawing
      if (t < 0.05) { 
        pOpacity = lerp(0, 1, t / 0.05); 
        drawProgress = 0; 
      } else if (t < 0.50) { 
        pOpacity = 1; 
        drawProgress = EASE.easeInOut((t - 0.05) / 0.45); 
      } else if (t < 0.65) { 
        pOpacity = 1; 
        drawProgress = 1; 
      } else if (t < 0.70) { 
        pOpacity = lerp(1, 0, (t - 0.65) / 0.05); 
        drawProgress = 1; 
      }
      
      if (pOpacity > 0) {
        ctx.globalAlpha = pOpacity;
        ctx.strokeStyle = pathData.color || '#91f6ff';
        ctx.lineWidth = (parseFloat(pathData.strokeWidth) || 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Exact Trim Path Implementation
        // dashArray = [visibleLength, totalLength]
        // offset = 0
        const visibleLen = drawProgress * len;
        ctx.setLineDash([visibleLen, len]);
        ctx.lineDashOffset = 0;
        
        ctx.stroke(p);
      }
      ctx.restore();
    });
  }

  if (FAMILY === 'particle-burst') {
    const offsets = [
      { dx: PARTICLE_OFFSET * 1 * baseScale, dy: PARTICLE_OFFSET * -0.4 * baseScale, delay: 0.00 },
      { dx: PARTICLE_OFFSET * 0.45 * baseScale, dy: PARTICLE_OFFSET * -1 * baseScale, delay: 0.04 },
      { dx: PARTICLE_OFFSET * -0.75 * baseScale, dy: PARTICLE_OFFSET * -0.8 * baseScale, delay: 0.08 },
      { dx: PARTICLE_OFFSET * 0.95 * baseScale, dy: PARTICLE_OFFSET * 0.75 * baseScale, delay: 0.12 },
      { dx: PARTICLE_OFFSET * -0.5 * baseScale, dy: PARTICLE_OFFSET * 1 * baseScale, delay: 0.16 },
      { dx: PARTICLE_OFFSET * -1 * baseScale, dy: PARTICLE_OFFSET * 0.15 * baseScale, delay: 0.20 }
    ];
    offsets.forEach((off, i) => {
      const pt = Math.max(0, (t - off.delay) / (1 - off.delay));
      let pX = width / 2, pY = height / 2, pScale = 0, pAlpha = 0;
      if (pt < 0.2) {
        pAlpha = lerp(0, 1, pt / 0.2);
        pScale = lerp(0.5, 1, pt / 0.2);
      } else if (pt < 0.75) {
        const r = (pt - 0.2) / 0.55;
        pAlpha = lerp(1, 0.65, r);
        pScale = 1;
        pX += lerp(0, off.dx, r);
        pY += lerp(0, off.dy, r);
      } else {
        const r2 = (pt - 0.75) / 0.25;
        pAlpha = lerp(0.65, 0, r2);
        pScale = lerp(1, 0.8, r2);
        pX += off.dx;
        pY += off.dy;
      }
      if (pAlpha > 0) {
        ctx.save();
        ctx.translate(pX, pY);
        ctx.scale(pScale * baseScale, pScale * baseScale);
        ctx.globalAlpha = pAlpha;
        ctx.fillStyle = '#91f6ff';
        ctx.shadowBlur = 10 * baseScale;
        ctx.shadowColor = 'rgba(145, 246, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  if (FAMILY === 'pro-morph') {
    const liquidStart = 0.25;
    const liquidEnd = 0.85;

    // Get dominant color from paths (or use default)
    const baseColor = svgPaths.length > 0 ? (svgPaths[0].color || '#91f6ff') : '#91f6ff';

    if (t > liquidStart && t < liquidEnd) {
      const lt = (t - liquidStart) / (liquidEnd - liquidStart);
      
      // Circle Pulsing / Breathing Logic
      const pulse = Math.sin(lt * Math.PI * 4) * 0.12;
      const cScale = (t > 0.4 && t < 0.75) 
        ? lerp(0.3, 1 + pulse, 1) 
        : t <= 0.4 
          ? lerp(0, 1, (t - liquidStart) / 0.15) 
          : lerp(1, 0, (t - 0.75) / 0.1);
      
      if (cScale > 0) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        // Match the Liquid filter if active
        const lBlur = (t < 0.4) ? lerp(0, 14, (t - liquidStart) / 0.15) 
                    : (t > 0.75) ? lerp(14, 0, (t-0.75)/0.1) 
                    : 14;
        
        if (lBlur > 0) ctx.filter = `blur(${lBlur}px) contrast(30)`;
        
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, 70 * baseScale * cScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
