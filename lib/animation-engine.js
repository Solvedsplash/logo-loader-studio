/**
 * Shared Animation Engine
 * This logic is used by both the browser preview (render/page.js) 
 * and the Puppeteer export (api/export/route.js).
 */

export function renderFrame(frameMs, elements, animation) {
  const { logo, paths, particles } = elements;
  if (!logo) return;

  const DURATION = animation.duration;
  const FAMILY = animation.family;
  const vars = animation.vars;

  const t = (frameMs % DURATION) / DURATION;

  const AMP_Y = parseFloat(vars['--amp-y']) || 0;
  const AMP_X = parseFloat(vars['--amp-x']) || 0;
  const SCALE_MIN = parseFloat(vars['--scale-min']) || 1;
  const SCALE_MAX = parseFloat(vars['--scale-max']) || 1;
  const FADE_MIN = parseFloat(vars['--fade-min']) || 0;
  const ROTATE_DEG = parseFloat(vars['--rotate-deg']) || 0;
  const BLUR_MAX = parseFloat(vars['--blur-max']) || 0;
  const PARTICLE_OFFSET = parseFloat(vars['--particle-offset']) || 0;
  const PARTICLE_SIZE = parseFloat(vars['--particle-size']) || 4;
  const PARTICLE_OPACITY = parseFloat(vars['--particle-opacity']) || 0.8;
  const DRAW_WIDTH = parseFloat(vars['--draw-width']) || 1.5;

  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

  let transform = 'none';
  let opacity = 1;
  let filter = 'none';

  switch (FAMILY) {
    case 'notion-fade':
    case 'fade-in-out':
      opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
      break;

    case 'linear-breathe': {
      const s = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
      transform = `scale(${s})`;
      opacity = t < 0.5 ? lerp(0.94, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
      break;
    }

    case 'vercel-float': {
      const y = t < 0.5 ? lerp(AMP_Y * 0.8, -AMP_Y, t * 2) : lerp(-AMP_Y, AMP_Y * 0.8, (t - 0.5) * 2);
      transform = `translateY(${y}px)`;
      opacity = t < 0.5 ? lerp(0.92, 1, t * 2) : lerp(1, 0.92, (t - 0.5) * 2);
      break;
    }

    case 'stripe-slide': {
      const y = t < 0.5 ? lerp(AMP_Y, 0, t * 2) : lerp(0, -AMP_Y, (t - 0.5) * 2);
      transform = `translateY(${y}px)`;
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;
    }

    case 'github-zoom': {
      const s = t < 0.5 ? lerp(SCALE_MIN - 0.06, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
      transform = `scale(${s})`;
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;
    }

    case 'framer-blur': {
      const b = t < 0.5 ? lerp(0, BLUR_MAX, t * 2) : lerp(BLUR_MAX, 0, (t - 0.5) * 2);
      filter = `blur(${b}px)`;
      opacity = t < 0.5 ? lerp(1, FADE_MIN, t * 2) : lerp(FADE_MIN, 1, (t - 0.5) * 2);
      break;
    }

    case 'figma-tilt': {
      const r = t < 0.5 ? lerp(-ROTATE_DEG, ROTATE_DEG, t * 2) : lerp(ROTATE_DEG, -ROTATE_DEG, (t - 0.5) * 2);
      const s = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
      transform = `rotate(${r}deg) scale(${s})`;
      opacity = t < 0.5 ? lerp(0.95, 1, t * 2) : lerp(1, 0.95, (t - 0.5) * 2);
      break;
    }

    case 'slack-spin':
      transform = `rotate(${ROTATE_DEG * 8 * t}deg)`;
      opacity = t < 0.5 ? lerp(0.9, 1, t * 2) : lerp(1, 0.9, (t - 0.5) * 2);
      break;

    case 'airtable-drift': {
      const x = t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
      transform = `translateX(${x}px)`;
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;
    }

    case 'intercom-pop': {
      const s = t < 0.2 ? lerp(SCALE_MIN, SCALE_MAX, t / 0.2)
        : t < 0.6 ? lerp(SCALE_MAX, (SCALE_MIN + SCALE_MAX) / 2, (t - 0.2) / 0.4)
        : lerp((SCALE_MIN + SCALE_MAX) / 2, SCALE_MIN, (t - 0.6) / 0.4);
      transform = `scale(${s})`;
      opacity = t < 0.2 ? lerp(0.88, 1, t / 0.2)
        : t < 0.6 ? lerp(1, 0.95, (t - 0.2) / 0.4)
        : lerp(0.95, 0.88, (t - 0.6) / 0.4);
      break;
    }

    case 'dropbox-reveal': {
      const y = t < 0.6 ? lerp(AMP_Y * 0.8, 0, t / 0.6) : lerp(0, -AMP_Y * 0.35, (t - 0.6) / 0.4);
      const s = t < 0.6 ? lerp(SCALE_MIN, 1, t / 0.6) : lerp(1, 1.01, (t - 0.6) / 0.4);
      transform = `translateY(${y}px) scale(${s})`;
      opacity = t < 0.35 ? lerp(0, 0.8, t / 0.35)
        : t < 0.6 ? lerp(0.8, 1, (t - 0.35) / 0.25)
        : lerp(1, 0.9, (t - 0.6) / 0.4);
      break;
    }

    case 'asana-sweep': {
      const x = t < 0.5 ? lerp(-AMP_X, 0, t * 2) : lerp(0, AMP_X, (t - 0.5) * 2);
      const s = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
      transform = `translateX(${x}px) scale(${s})`;
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;
    }

    case 'shopify-soft-bounce': {
      const y = t < 0.22 ? lerp(0, -AMP_Y, t / 0.22)
        : t < 0.42 ? lerp(-AMP_Y, -AMP_Y * 0.3, (t - 0.22) / 0.2)
        : t < 0.7 ? lerp(-AMP_Y * 0.3, -AMP_Y * 0.6, (t - 0.42) / 0.28)
        : lerp(-AMP_Y * 0.6, 0, (t - 0.7) / 0.3);
      const s = t < 0.22 ? lerp(SCALE_MIN, SCALE_MAX, t / 0.22) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.22) / 0.78);
      transform = `translateY(${y}px) scale(${s})`;
      opacity = t < 0.22 ? lerp(0.9, 1, t / 0.22) : lerp(1, 0.9, (t - 0.22) / 0.78);
      break;
    }

    case 'monday-blink': {
      const inBlink = (t > 0.18 && t < 0.28) || (t > 0.48 && t < 0.58);
      opacity = inBlink ? FADE_MIN : 1;
      transform = `scale(${inBlink ? SCALE_MIN : 1})`;
      break;
    }

    case 'loom-settle': {
      const y = t < 0.5 ? lerp(AMP_Y, -AMP_Y * 0.5, t * 2)
        : t < 0.72 ? lerp(-AMP_Y * 0.5, AMP_Y * 0.15, (t - 0.5) / 0.22)
        : lerp(AMP_Y * 0.15, 0, (t - 0.72) / 0.28);
      const s = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2)
        : t < 0.72 ? lerp(SCALE_MAX, 0.99, (t - 0.5) / 0.22)
        : lerp(0.99, 1, (t - 0.72) / 0.28);
      transform = `translateY(${y}px) scale(${s})`;
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, 0.94, (t - 0.5) * 2);
      break;
    }

    case 'canva-glide': {
      const x = t < 0.5 ? lerp(-AMP_X * 0.8, 0, t * 2) : lerp(0, AMP_X * 0.8, (t - 0.5) * 2);
      const y = t < 0.5 ? lerp(AMP_Y * 0.4, 0, t * 2) : lerp(0, -AMP_Y * 0.4, (t - 0.5) * 2);
      const s = t < 0.5 ? lerp(SCALE_MIN, 1, t * 2) : lerp(1, SCALE_MAX, (t - 0.5) * 2);
      transform = `translate(${x}px,${y}px) scale(${s})`;
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t * 2) : lerp(1, FADE_MIN, (t - 0.5) * 2);
      break;
    }

    case 'scale-pulse': {
      const s = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t * 2) : lerp(SCALE_MAX, SCALE_MIN, (t - 0.5) * 2);
      transform = `scale(${s})`;
      opacity = t < 0.5 ? lerp(0.86, 1, t * 2) : lerp(1, 0.86, (t - 0.5) * 2);
      break;
    }

    case 'path-draw': {
      if (t < 0.35) opacity = 0;
      else if (t < 0.60) opacity = lerp(0, 1, (t - 0.35) / 0.25);
      else if (t < 0.85) opacity = 1;
      else if (t < 0.95) opacity = lerp(1, 0, (t - 0.85) / 0.10);
      else opacity = 0;
      
      if (paths) {
        paths.forEach(path => {
          const len = path._pathLen || (path.getTotalLength ? path.getTotalLength() : 1000);
          let pOpacity = 0, dashOff = len;
          if (t < 0.05) { pOpacity = lerp(0, 1, t / 0.05); dashOff = len; }
          else if (t < 0.50) { pOpacity = 1; dashOff = lerp(len, 0, (t - 0.05) / 0.45); }
          else if (t < 0.65) { pOpacity = 1; dashOff = 0; }
          else if (t < 0.70) { pOpacity = lerp(1, 0, (t - 0.65) / 0.05); dashOff = 0; }
          else { pOpacity = 0; dashOff = 0; }
          path.style.strokeDashoffset = `${dashOff}px`;
          path.style.opacity = pOpacity;
        });
      }
      break;
    }

    case 'particle-burst': {
      opacity = t < 0.5 ? lerp(0.9, 1, t * 2) : lerp(1, 0.9, (t - 0.5) * 2);
      if (particles) {
        const offsets = [
          { dx: PARTICLE_OFFSET * 1, dy: PARTICLE_OFFSET * -0.4, delay: 0.00 },
          { dx: PARTICLE_OFFSET * 0.45, dy: PARTICLE_OFFSET * -1, delay: 0.04 },
          { dx: PARTICLE_OFFSET * -0.75, dy: PARTICLE_OFFSET * -0.8, delay: 0.08 },
          { dx: PARTICLE_OFFSET * 0.95, dy: PARTICLE_OFFSET * 0.75, delay: 0.12 },
          { dx: PARTICLE_OFFSET * -0.5, dy: PARTICLE_OFFSET * 1, delay: 0.16 },
          { dx: PARTICLE_OFFSET * -1, dy: PARTICLE_OFFSET * 0.15, delay: 0.20 }
        ];
        particles.forEach((el, i) => {
          if (!el) return;
          const off = offsets[i] || { dx: 0, dy: 0, delay: 0 };
          const pt = Math.max(0, (t - off.delay) / (1 - off.delay));
          if (pt < 0.2) {
            el.style.opacity = lerp(0, 1, pt / 0.2);
            el.style.transform = `translate(-50%,-50%) scale(${lerp(0.5, 1, pt / 0.2)})`;
          } else if (pt < 0.75) {
            const r = lerp(0, 1, (pt - 0.2) / 0.55);
            el.style.opacity = lerp(1, 0.65, r);
            el.style.transform = `translate(calc(-50% + ${lerp(0, off.dx, r)}px),calc(-50% + ${lerp(0, off.dy, r)}px)) scale(1)`;
          } else {
            const r2 = lerp(0, 1, (pt - 0.75) / 0.25);
            el.style.opacity = lerp(0.65, 0, r2);
            el.style.transform = `translate(calc(-50% + ${off.dx}px),calc(-50% + ${off.dy}px)) scale(${lerp(1, 0.8, r2)})`;
          }
        });
      }
      break;
    }
  }

  logo.style.transform = transform;
  logo.style.opacity = opacity;
  logo.style.filter = filter;
}
