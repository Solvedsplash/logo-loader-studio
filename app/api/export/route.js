import puppeteer from 'puppeteer';
import GIFEncoder from 'gif-encoder-2';
import { PNG } from 'pngjs';
import { NextResponse } from 'next/server';
import { ANIMATIONS } from '../../animations';

function buildHtml(animation, svgText) {
  const isPathDraw = animation.family === 'path-draw';
  const isParticleBurst = animation.family === 'particle-burst';
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;

  const cssVars = Object.entries(animation.vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:420px;height:420px;overflow:hidden;background:transparent}
.stage{width:420px;height:420px;display:grid;place-items:center;background:transparent}
.logo-stage{position:relative;width:128px;height:128px;display:flex;align-items:center;justify-content:center}
.logo{
  ${cssVars};
  --duration:${animation.duration}ms;
  width:110px;height:110px;object-fit:contain;
  animation-duration:${animation.duration}ms;
  animation-timing-function:${animation.easing};
  animation-iteration-count:infinite;
  transform-origin:center;
  position:absolute;inset:0;z-index:2;
}
.motion-notion-fade{animation-name:kf-fade}
.motion-linear-breathe{animation-name:kf-breathe}
.motion-vercel-float{animation-name:kf-float}
.motion-stripe-slide{animation-name:kf-slide}
.motion-github-zoom{animation-name:kf-zoom}
.motion-framer-blur{animation-name:kf-blur}
.motion-figma-tilt{animation-name:kf-tilt}
.motion-slack-spin{animation-name:kf-rotate}
.motion-airtable-drift{animation-name:kf-drift}
.motion-intercom-pop{animation-name:kf-pop}
.motion-dropbox-reveal{animation-name:kf-reveal}
.motion-asana-sweep{animation-name:kf-sweep}
.motion-shopify-soft-bounce{animation-name:kf-soft-bounce}
.motion-monday-blink{animation-name:kf-blink}
.motion-loom-settle{animation-name:kf-settle}
.motion-canva-glide{animation-name:kf-glide}
.motion-path-draw{animation-name:kf-logo-reveal}
.motion-particle-burst{animation-name:kf-subtle-fade}
.motion-scale-pulse{animation-name:kf-scale-pulse}
.motion-fade-in-out{animation-name:kf-fade}
.is-path-draw .logo{opacity:0}
.drawn-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
.drawn-layer svg{width:100%;height:100%;display:block}
.drawn-layer svg path,.drawn-layer svg rect,.drawn-layer svg circle,.drawn-layer svg ellipse,.drawn-layer svg line,.drawn-layer svg polyline,.drawn-layer svg polygon{
  fill:none !important;
  stroke:var(--computed-color,rgba(145,246,255,0.9)) !important;
  stroke-width:var(--computed-stroke-width,var(--draw-width,1.5px)) !important;
  stroke-linecap:round !important;stroke-linejoin:round !important;
  stroke-dasharray:var(--path-len,1000px) !important;
  stroke-dashoffset:var(--path-len,1000px);
}
.motion-path-draw~.drawn-layer svg path,.motion-path-draw~.drawn-layer svg rect,.motion-path-draw~.drawn-layer svg circle,.motion-path-draw~.drawn-layer svg ellipse,.motion-path-draw~.drawn-layer svg line,.motion-path-draw~.drawn-layer svg polyline,.motion-path-draw~.drawn-layer svg polygon{
  animation:draw-real ${animation.duration}ms ease-in-out infinite;
}
@keyframes draw-real{
  0%{stroke-dashoffset:var(--path-len,1000px);opacity:0}
  5%{opacity:1}
  50%{stroke-dashoffset:0;opacity:1}
  65%{stroke-dashoffset:0;opacity:1}
  70%,100%{stroke-dashoffset:0;opacity:0}
}
@keyframes kf-logo-reveal{
  0%,35%{opacity:0;transform:scale(1)}
  60%,85%{opacity:1;transform:scale(1)}
  95%,100%{opacity:0;transform:scale(1)}
}
.particles{position:absolute;inset:0;pointer-events:none;z-index:3;opacity:0}
.particle{position:absolute;left:50%;top:50%;width:var(--particle-size,4px);height:var(--particle-size,4px);border-radius:999px;background:rgba(145,246,255,var(--particle-opacity,0.7));box-shadow:0 0 12px rgba(145,246,255,0.7);transform:translate(-50%,-50%)}
.p1{--dx:calc(var(--particle-offset,32px)*1);--dy:calc(var(--particle-offset,32px)*-0.4)}
.p2{--dx:calc(var(--particle-offset,32px)*0.45);--dy:calc(var(--particle-offset,32px)*-1)}
.p3{--dx:calc(var(--particle-offset,32px)*-0.75);--dy:calc(var(--particle-offset,32px)*-0.8)}
.p4{--dx:calc(var(--particle-offset,32px)*0.95);--dy:calc(var(--particle-offset,32px)*0.75)}
.p5{--dx:calc(var(--particle-offset,32px)*-0.5);--dy:calc(var(--particle-offset,32px)*1)}
.p6{--dx:calc(var(--particle-offset,32px)*-1);--dy:calc(var(--particle-offset,32px)*0.15)}
.motion-particle-burst~.particles{opacity:1}
.motion-particle-burst~.particles .particle{animation:kf-particle-burst ${animation.duration}ms ease-out infinite}
.motion-particle-burst~.particles .p2{animation-delay:120ms}
.motion-particle-burst~.particles .p3{animation-delay:220ms}
.motion-particle-burst~.particles .p4{animation-delay:320ms}
.motion-particle-burst~.particles .p5{animation-delay:420ms}
.motion-particle-burst~.particles .p6{animation-delay:520ms}
@keyframes kf-fade{0%{opacity:1}50%{opacity:var(--fade-min)}100%{opacity:1}}
@keyframes kf-subtle-fade{0%,100%{opacity:0.9}50%{opacity:1}}
@keyframes kf-scale-pulse{0%{transform:scale(var(--scale-min));opacity:0.86}50%{transform:scale(var(--scale-max));opacity:1}100%{transform:scale(var(--scale-min));opacity:0.86}}
@keyframes kf-particle-burst{
  0%{transform:translate(-50%,-50%) scale(0.5);opacity:0}
  20%{opacity:1}
  75%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1);opacity:0.65}
  100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(0.8);opacity:0}
}
@keyframes kf-breathe{0%{transform:scale(var(--scale-min));opacity:0.94}50%{transform:scale(var(--scale-max));opacity:1}100%{transform:scale(var(--scale-min));opacity:0.94}}
@keyframes kf-float{0%{transform:translateY(calc(var(--amp-y)*0.8));opacity:0.92}50%{transform:translateY(calc(var(--amp-y)*-1));opacity:1}100%{transform:translateY(calc(var(--amp-y)*0.8));opacity:0.92}}
@keyframes kf-slide{0%{transform:translateY(var(--amp-y));opacity:var(--fade-min)}50%{transform:translateY(0px);opacity:1}100%{transform:translateY(calc(var(--amp-y)*-1));opacity:var(--fade-min)}}
@keyframes kf-zoom{0%{transform:scale(calc(var(--scale-min) - 0.06));opacity:var(--fade-min)}50%{transform:scale(1);opacity:1}100%{transform:scale(var(--scale-max));opacity:var(--fade-min)}}
@keyframes kf-blur{0%{filter:blur(0px);opacity:1}50%{filter:blur(var(--blur-max));opacity:var(--fade-min)}100%{filter:blur(0px);opacity:1}}
@keyframes kf-tilt{0%{transform:rotate(calc(var(--rotate-deg)*-1)) scale(var(--scale-min));opacity:0.95}50%{transform:rotate(var(--rotate-deg)) scale(var(--scale-max));opacity:1}100%{transform:rotate(calc(var(--rotate-deg)*-1)) scale(var(--scale-min));opacity:0.95}}
@keyframes kf-rotate{0%{transform:rotate(0deg);opacity:0.9}50%{transform:rotate(calc(var(--rotate-deg)*4));opacity:1}100%{transform:rotate(calc(var(--rotate-deg)*8));opacity:0.9}}
@keyframes kf-drift{0%{transform:translateX(calc(var(--amp-x)*-1));opacity:var(--fade-min)}50%{transform:translateX(0px);opacity:1}100%{transform:translateX(var(--amp-x));opacity:var(--fade-min)}}
@keyframes kf-pop{0%{transform:scale(var(--scale-min));opacity:0.88}20%{transform:scale(var(--scale-max));opacity:1}60%{transform:scale(calc((var(--scale-min) + var(--scale-max))/2));opacity:0.95}100%{transform:scale(var(--scale-min));opacity:0.88}}
@keyframes kf-reveal{0%{transform:translateY(calc(var(--amp-y)*0.8)) scale(var(--scale-min));opacity:0}35%{opacity:0.8}60%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(calc(var(--amp-y)*-0.35)) scale(1.01);opacity:0.9}}
@keyframes kf-sweep{0%{transform:translateX(calc(var(--amp-x)*-1)) scale(var(--scale-min));opacity:var(--fade-min)}50%{transform:translateX(0) scale(1);opacity:1}100%{transform:translateX(var(--amp-x)) scale(var(--scale-max));opacity:var(--fade-min)}}
@keyframes kf-soft-bounce{0%{transform:translateY(0) scale(var(--scale-min));opacity:0.9}22%{transform:translateY(calc(var(--amp-y)*-1)) scale(var(--scale-max));opacity:1}42%{transform:translateY(calc(var(--amp-y)*-0.3)) scale(1)}70%{transform:translateY(calc(var(--amp-y)*-0.6)) scale(calc(var(--scale-max) - 0.02))}100%{transform:translateY(0) scale(var(--scale-min));opacity:0.9}}
@keyframes kf-blink{0%,28%,58%,100%{opacity:1;transform:scale(1)}18%,48%{opacity:var(--fade-min);transform:scale(var(--scale-min))}}
@keyframes kf-settle{0%{transform:translateY(var(--amp-y)) scale(var(--scale-min));opacity:var(--fade-min)}50%{transform:translateY(calc(var(--amp-y)*-0.5)) scale(var(--scale-max));opacity:1}72%{transform:translateY(calc(var(--amp-y)*0.15)) scale(0.99)}100%{transform:translateY(0) scale(1);opacity:0.94}}
@keyframes kf-glide{0%{transform:translate(calc(var(--amp-x)*-0.8),calc(var(--amp-y)*0.4)) scale(var(--scale-min));opacity:var(--fade-min)}50%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(calc(var(--amp-x)*0.8),calc(var(--amp-y)*-0.4)) scale(var(--scale-max));opacity:var(--fade-min)}}
</style>
</head>
<body>
<div class="stage">
  <div class="logo-stage ${isPathDraw ? 'is-path-draw' : ''}">
    <img id="logo" class="logo motion-${animation.family}" src="${dataUrl}" alt="logo"/>
    ${isPathDraw ? `<div class="drawn-layer" id="drawn-layer">${svgText}</div>` : ''}
  </div>
  ${isParticleBurst ? `<div class="particles">
    <span class="particle p1"></span><span class="particle p2"></span>
    <span class="particle p3"></span><span class="particle p4"></span>
    <span class="particle p5"></span><span class="particle p6"></span>
  </div>` : ''}
</div>
<script>
  // Measure real path lengths after SVG is rendered
  if (${isPathDraw}) {
    const layer = document.getElementById('drawn-layer');
    if (layer) {
      layer.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon').forEach(shape => {
        try {
          const len = shape.getTotalLength ? shape.getTotalLength() : 1000;
          shape.style.setProperty('--path-len', len + 'px');
          let color = shape.getAttribute('stroke');
          if (!color || color === 'none') color = shape.getAttribute('fill');
          if (!color || color === 'none') color = 'rgba(145,246,255,0.9)';
          shape.style.setProperty('--computed-color', color);
          const sw = shape.getAttribute('stroke-width');
          if (sw) shape.style.setProperty('--computed-stroke-width', sw + 'px');
        } catch(e){}
      });
    }
  }
  window.animationReady = true;
</script>
</body>
</html>`;
}

export async function POST(req) {
  let browser = null;
  try {
    const { animId, logoSvgText, logoSrc, duration, fps } = await req.json();
    const targetFps = fps || 30;
    const svgText = logoSvgText || '';

    const animation = ANIMATIONS.find(a => a.id === animId) ?? ANIMATIONS[0];
    const html = buildHtml(animation, svgText);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 420, height: 420, deviceScaleFactor: 1 }
    });

    const page = await browser.newPage();

    // Use setContent — completely bypasses Next.js, zero chrome
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Wait for inline script to fire and SVG to render
    await page.waitForFunction('window.animationReady === true', { timeout: 5000 });

    // Wait for first animation cycle to actually start painting
    await new Promise(r => setTimeout(r, 200));

    const safeDuration = Number(duration) + 200;
    const frameCount = Math.ceil(safeDuration / (1000 / targetFps));
    const buffers = [];

    const captureStart = Date.now();
    for (let i = 0; i < frameCount; i++) {
      const expected = captureStart + i * (1000 / targetFps);
      const delay = expected - Date.now();
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
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
    encoder.setDelay(Math.round(1000 / targetFps));
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
