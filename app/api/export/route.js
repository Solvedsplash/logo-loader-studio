import puppeteer from 'puppeteer';
import GIFEncoder from 'gif-encoder-2';
import { PNG } from 'pngjs';
import { NextResponse } from 'next/server';
import { ANIMATIONS } from '../../animations';

function buildHtml(animation, svgText) {
  const isPathDraw = animation.family === 'path-draw';
  const isParticleBurst = animation.family === 'particle-burst';
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  const vars = animation.vars;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:420px;height:420px;overflow:hidden;background:transparent}
.stage{width:420px;height:420px;display:grid;place-items:center}
.logo-stage{position:relative;width:128px;height:128px}
#logo{width:110px;height:110px;object-fit:contain;position:absolute;inset:0;transform-origin:center;z-index:2;}
.drawn-layer{position:absolute;inset:0;width:100%;height:100%;z-index:3;}
.drawn-layer svg{width:100%;height:100%;display:block;}
.drawn-layer svg path,.drawn-layer svg rect,.drawn-layer svg circle,.drawn-layer svg ellipse,.drawn-layer svg line,.drawn-layer svg polyline,.drawn-layer svg polygon{
  fill:none !important;stroke-linecap:round !important;stroke-linejoin:round !important;
}
.particles{position:absolute;inset:0;z-index:3;}
.particle{position:absolute;left:50%;top:50%;border-radius:999px;transform-origin:center;}
</style>
</head>
<body>
<div class="stage">
  <div class="logo-stage" id="stage">
    <img id="logo" src="${dataUrl}" alt="logo"/>
    ${isPathDraw ? `<div class="drawn-layer" id="drawn-layer">${svgText}</div>` : ''}
  </div>
  ${isParticleBurst ? `<div class="particles" id="particles">
    <span class="particle" id="p1"></span><span class="particle" id="p2"></span>
    <span class="particle" id="p3"></span><span class="particle" id="p4"></span>
    <span class="particle" id="p5"></span><span class="particle" id="p6"></span>
  </div>` : ''}
</div>
<script>
const FAMILY = '${animation.family}';
const DURATION = ${animation.duration};
const AMP_Y = ${parseFloat(vars['--amp-y'])};
const AMP_X = ${parseFloat(vars['--amp-x'])};
const SCALE_MIN = ${parseFloat(vars['--scale-min'])};
const SCALE_MAX = ${parseFloat(vars['--scale-max'])};
const FADE_MIN = ${parseFloat(vars['--fade-min'])};
const ROTATE_DEG = ${parseFloat(vars['--rotate-deg'])};
const BLUR_MAX = ${parseFloat(vars['--blur-max'])};
const PARTICLE_OFFSET = ${parseFloat(vars['--particle-offset'])};
const PARTICLE_SIZE = ${parseFloat(vars['--particle-size'])};
const PARTICLE_OPACITY = ${parseFloat(vars['--particle-opacity'])};
const DRAW_WIDTH = ${parseFloat(vars['--draw-width'])};

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

// Measure path lengths
if (FAMILY === 'path-draw') {
  const layer = document.getElementById('drawn-layer');
  if (layer) {
    layer.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon').forEach(el => {
      try {
        const len = el.getTotalLength ? el.getTotalLength() : 1000;
        el._pathLen = len;
        let color = el.getAttribute('stroke');
        if (!color || color === 'none') color = el.getAttribute('fill');
        if (!color || color === 'none') color = 'rgba(145,246,255,0.9)';
        el.style.stroke = color;
        const sw = el.getAttribute('stroke-width');
        el.style.strokeWidth = sw ? sw : (DRAW_WIDTH + 'px');
        el.style.strokeDasharray = len + 'px';
        el.style.strokeDashoffset = len + 'px';
      } catch(e) {}
    });
  }
}

// Setup particles
if (FAMILY === 'particle-burst') {
  const offsets = [
    {dx: PARTICLE_OFFSET*1,    dy: PARTICLE_OFFSET*-0.4},
    {dx: PARTICLE_OFFSET*0.45, dy: PARTICLE_OFFSET*-1},
    {dx: PARTICLE_OFFSET*-0.75,dy: PARTICLE_OFFSET*-0.8},
    {dx: PARTICLE_OFFSET*0.95, dy: PARTICLE_OFFSET*0.75},
    {dx: PARTICLE_OFFSET*-0.5, dy: PARTICLE_OFFSET*1},
    {dx: PARTICLE_OFFSET*-1,   dy: PARTICLE_OFFSET*0.15}
  ];
  ['p1','p2','p3','p4','p5','p6'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.width = el.style.height = PARTICLE_SIZE + 'px';
      el.style.background = 'rgba(145,246,255,' + PARTICLE_OPACITY + ')';
      el.style.boxShadow = '0 0 12px rgba(145,246,255,0.7)';
      el._dx = offsets[i].dx;
      el._dy = offsets[i].dy;
      el._delay = i * 0.04; // offset fractions for stagger
    }
  });
}

window.renderFrame = function(frameMs) {
  const t = (frameMs % DURATION) / DURATION; // 0-1 normalized progress
  const logo = document.getElementById('logo');

  let transform = 'none';
  let opacity = 1;
  let filter = 'none';

  switch(FAMILY) {
    case 'notion-fade':
    case 'fade-in-out':
      opacity = t < 0.5 ? lerp(1, FADE_MIN, t*2) : lerp(FADE_MIN, 1, (t-0.5)*2);
      break;
    case 'linear-breathe': {
      const s = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t*2) : lerp(SCALE_MAX, SCALE_MIN, (t-0.5)*2);
      transform = 'scale('+s+')';
      opacity = t < 0.5 ? lerp(0.94, 1, t*2) : lerp(1, 0.94, (t-0.5)*2);
      break;
    }
    case 'vercel-float': {
      const y = t < 0.5 ? lerp(AMP_Y*0.8, -AMP_Y, t*2) : lerp(-AMP_Y, AMP_Y*0.8, (t-0.5)*2);
      transform = 'translateY('+y+'px)';
      opacity = t < 0.5 ? lerp(0.92, 1, t*2) : lerp(1, 0.92, (t-0.5)*2);
      break;
    }
    case 'stripe-slide': {
      const y = t < 0.5 ? lerp(AMP_Y, 0, t*2) : lerp(0, -AMP_Y, (t-0.5)*2);
      transform = 'translateY('+y+'px)';
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t*2) : lerp(1, FADE_MIN, (t-0.5)*2);
      break;
    }
    case 'github-zoom': {
      const s = t < 0.5 ? lerp(SCALE_MIN-0.06, 1, t*2) : lerp(1, SCALE_MAX, (t-0.5)*2);
      transform = 'scale('+s+')';
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t*2) : lerp(1, FADE_MIN, (t-0.5)*2);
      break;
    }
    case 'framer-blur': {
      const b = t < 0.5 ? lerp(0, BLUR_MAX, t*2) : lerp(BLUR_MAX, 0, (t-0.5)*2);
      filter = 'blur('+b+'px)';
      opacity = t < 0.5 ? lerp(1, FADE_MIN, t*2) : lerp(FADE_MIN, 1, (t-0.5)*2);
      break;
    }
    case 'figma-tilt': {
      const r = t < 0.5 ? lerp(-ROTATE_DEG, ROTATE_DEG, t*2) : lerp(ROTATE_DEG, -ROTATE_DEG, (t-0.5)*2);
      const s = t < 0.5 ? lerp(SCALE_MIN, SCALE_MAX, t*2) : lerp(SCALE_MAX, SCALE_MIN, (t-0.5)*2);
      transform = 'rotate('+r+'deg) scale('+s+')';
      opacity = t < 0.5 ? lerp(0.95, 1, t*2) : lerp(1, 0.95, (t-0.5)*2);
      break;
    }
    case 'slack-spin':
      transform = 'rotate('+(ROTATE_DEG*8*t)+'deg)';
      opacity = t < 0.5 ? lerp(0.9, 1, t*2) : lerp(1, 0.9, (t-0.5)*2);
      break;
    case 'airtable-drift': {
      const x = t < 0.5 ? lerp(-AMP_X, 0, t*2) : lerp(0, AMP_X, (t-0.5)*2);
      transform = 'translateX('+x+'px)';
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t*2) : lerp(1, FADE_MIN, (t-0.5)*2);
      break;
    }
    case 'intercom-pop': {
      const s = t < 0.2 ? lerp(SCALE_MIN, SCALE_MAX, t/0.2) : t < 0.6 ? lerp(SCALE_MAX, (SCALE_MIN+SCALE_MAX)/2, (t-0.2)/0.4) : lerp((SCALE_MIN+SCALE_MAX)/2, SCALE_MIN, (t-0.6)/0.4);
      transform = 'scale('+s+')';
      opacity = t < 0.2 ? lerp(0.88, 1, t/0.2) : t < 0.6 ? lerp(1, 0.95, (t-0.2)/0.4) : lerp(0.95, 0.88, (t-0.6)/0.4);
      break;
    }
    case 'dropbox-reveal': {
      const y = t < 0.6 ? lerp(AMP_Y*0.8, 0, t/0.6) : lerp(0, -AMP_Y*0.35, (t-0.6)/0.4);
      const s = t < 0.6 ? lerp(SCALE_MIN, 1, t/0.6) : lerp(1, 1.01, (t-0.6)/0.4);
      transform = 'translateY('+y+'px) scale('+s+')';
      opacity = t < 0.35 ? lerp(0, 0.8, t/0.35) : t < 0.6 ? lerp(0.8, 1, (t-0.35)/0.25) : lerp(1, 0.9, (t-0.6)/0.4);
      break;
    }
    case 'asana-sweep': {
      const x = t < 0.5 ? lerp(-AMP_X, 0, t*2) : lerp(0, AMP_X, (t-0.5)*2);
      const s = t < 0.5 ? lerp(SCALE_MIN, 1, t*2) : lerp(1, SCALE_MAX, (t-0.5)*2);
      transform = 'translateX('+x+'px) scale('+s+')';
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t*2) : lerp(1, FADE_MIN, (t-0.5)*2);
      break;
    }
    case 'shopify-soft-bounce': {
      const y = t < 0.22 ? lerp(0,-AMP_Y, t/0.22) : t < 0.42 ? lerp(-AMP_Y,-AMP_Y*0.3,(t-0.22)/0.2) : t < 0.7 ? lerp(-AMP_Y*0.3,-AMP_Y*0.6,(t-0.42)/0.28) : lerp(-AMP_Y*0.6,0,(t-0.7)/0.3);
      const s = t < 0.22 ? lerp(SCALE_MIN, SCALE_MAX, t/0.22) : lerp(SCALE_MAX, SCALE_MIN, (t-0.22)/0.78);
      transform = 'translateY('+y+'px) scale('+s+')';
      opacity = t < 0.22 ? lerp(0.9, 1, t/0.22) : lerp(1, 0.9, (t-0.22)/0.78);
      break;
    }
    case 'monday-blink': {
      const inBlink = (t > 0.18 && t < 0.28) || (t > 0.48 && t < 0.58);
      opacity = inBlink ? FADE_MIN : 1;
      transform = 'scale('+(inBlink ? SCALE_MIN : 1)+')';
      break;
    }
    case 'loom-settle': {
      const y = t < 0.5 ? lerp(AMP_Y,-AMP_Y*0.5,t*2) : t < 0.72 ? lerp(-AMP_Y*0.5,AMP_Y*0.15,(t-0.5)/0.22) : lerp(AMP_Y*0.15,0,(t-0.72)/0.28);
      const s = t < 0.5 ? lerp(SCALE_MIN,SCALE_MAX,t*2) : t < 0.72 ? lerp(SCALE_MAX,0.99,(t-0.5)/0.22) : lerp(0.99,1,(t-0.72)/0.28);
      transform = 'translateY('+y+'px) scale('+s+')';
      opacity = t < 0.5 ? lerp(FADE_MIN, 1, t*2) : lerp(1, 0.94, (t-0.5)*2);
      break;
    }
    case 'canva-glide': {
      const x = t < 0.5 ? lerp(-AMP_X*0.8,0,t*2) : lerp(0,AMP_X*0.8,(t-0.5)*2);
      const y = t < 0.5 ? lerp(AMP_Y*0.4,0,t*2) : lerp(0,-AMP_Y*0.4,(t-0.5)*2);
      const s = t < 0.5 ? lerp(SCALE_MIN,1,t*2) : lerp(1,SCALE_MAX,(t-0.5)*2);
      transform = 'translate('+x+'px,'+y+'px) scale('+s+')';
      opacity = t < 0.5 ? lerp(FADE_MIN,1,t*2) : lerp(1,FADE_MIN,(t-0.5)*2);
      break;
    }
    case 'scale-pulse': {
      const s = t < 0.5 ? lerp(SCALE_MIN,SCALE_MAX,t*2) : lerp(SCALE_MAX,SCALE_MIN,(t-0.5)*2);
      transform = 'scale('+s+')';
      opacity = t < 0.5 ? lerp(0.86,1,t*2) : lerp(1,0.86,(t-0.5)*2);
      break;
    }
    case 'path-draw': {
      // Logo fill reveal: fades in 35%-60%, holds, fades out 95%-100%
      if (t < 0.35) opacity = 0;
      else if (t < 0.60) opacity = lerp(0,1,(t-0.35)/0.25);
      else if (t < 0.85) opacity = 1;
      else if (t < 0.95) opacity = lerp(1,0,(t-0.85)/0.10);
      else opacity = 0;

      // Path trace
      const paths = document.querySelectorAll('.drawn-layer svg path,.drawn-layer svg rect,.drawn-layer svg circle,.drawn-layer svg ellipse,.drawn-layer svg line,.drawn-layer svg polyline,.drawn-layer svg polygon');
      paths.forEach(path => {
        const len = path._pathLen || 1000;
        let pOpacity = 0, dashOff = len;
        if (t < 0.05) { pOpacity = lerp(0,1,t/0.05); dashOff = len; }
        else if (t < 0.50) { pOpacity = 1; dashOff = lerp(len,0,(t-0.05)/0.45); }
        else if (t < 0.65) { pOpacity = 1; dashOff = 0; }
        else if (t < 0.70) { pOpacity = lerp(1,0,(t-0.65)/0.05); dashOff = 0; }
        else { pOpacity = 0; dashOff = 0; }
        path.style.strokeDashoffset = dashOff + 'px';
        path.style.opacity = pOpacity;
      });
      break;
    }
    case 'particle-burst': {
      opacity = t < 0.5 ? lerp(0.9,1,t*2) : lerp(1,0.9,(t-0.5)*2);
      // Animate particles
      ['p1','p2','p3','p4','p5','p6'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const pt = Math.max(0, (t - el._delay) / (1 - el._delay));
        if (pt < 0.2) { el.style.opacity = lerp(0,1,pt/0.2); el.style.transform = 'translate(-50%,-50%) scale('+lerp(0.5,1,pt/0.2)+')'; }
        else if (pt < 0.75) { const r = lerp(0,1,(pt-0.2)/0.55); el.style.opacity = lerp(1,0.65,r); el.style.transform = 'translate(calc(-50% + '+lerp(0,el._dx,r)+'px), calc(-50% + '+lerp(0,el._dy,r)+'px)) scale(1)'; }
        else { const r2 = lerp(0,1,(pt-0.75)/0.25); el.style.opacity = lerp(0.65,0,r2); el.style.transform = 'translate(calc(-50% + '+el._dx+'px), calc(-50% + '+el._dy+'px)) scale('+lerp(1,0.8,r2)+')'; }
      });
      break;
    }
  }

  logo.style.transform = transform;
  logo.style.opacity = opacity;
  logo.style.filter = filter;
};

window.ready = true;
</script>
</body>
</html>`;
}

export async function POST(req) {
  let browser = null;
  try {
    const { animId, logoSvgText, logoSrc, fps } = await req.json();
    const targetFps = Number(fps) || 30;
    const svgText = logoSvgText || '';

    const animation = ANIMATIONS.find(a => a.id === animId) ?? ANIMATIONS[0];
    const animDuration = animation.duration;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling'],
      defaultViewport: { width: 420, height: 420, deviceScaleFactor: 1 }
    });

    const page = await browser.newPage();
    await page.setContent(buildHtml(animation, svgText), { waitUntil: 'domcontentloaded' });

    // Wait for setup script to run
    await page.waitForFunction('window.ready === true', { timeout: 5000 });

    // Let the page fully render the logo image
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

    const frameCount = Math.ceil((animDuration / 1000) * targetFps);
    const frameDelayMs = animDuration / frameCount;
    const buffers = [];

    for (let i = 0; i < frameCount; i++) {
      const frameTimeMs = i * frameDelayMs;

      // Render this frame in JS (no CSS animations involved)
      await page.evaluate((t) => {
        window.renderFrame(t);
      }, frameTimeMs);

      // Wait for paint
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

      buffers.push(await page.screenshot({
        type: 'png',
        omitBackground: true,
        clip: { x: 0, y: 0, width: 420, height: 420 }
      }));
    }

    await browser.close();
    browser = null;

    const encoder = new GIFEncoder(420, 420);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(Math.round(animDuration / frameCount));
    encoder.setQuality(5);

    for (const buffer of buffers) {
      const png = PNG.sync.read(buffer);
      encoder.addFrame(png.data);
    }

    encoder.finish();
    const gifBuffer = encoder.out.getData();

    return new NextResponse(gifBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': `attachment; filename="logo-loader-${animId}.gif"`
      }
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error('GIF export failed:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
