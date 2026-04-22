import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';
import { ANIMATIONS } from '../../animations';
import { renderFrame } from '../../../lib/animation-engine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === 'production';

async function getBrowser() {
  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteerCore = (await import('puppeteer-core')).default;
    
    // Disable graphics mode for better serverless compatibility
    chromium.setGraphicsMode = false;
    
    // Explicitly point to a remote fallback if the bundled binary is missing
    const remoteUrl = `https://github.com/Sparticuz/chromium/releases/download/v${await chromium.version}/chromium-v${await chromium.version}-pack.tar`;
    
    return puppeteerCore.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(remoteUrl),
      headless: chromium.headless,
    });
  } else {
    const puppeteer = (await import('puppeteer')).default;
    return puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
  }
}

function getFFmpegPath() {
  if (!ffmpegStatic) return 'ffmpeg';
  
  // Vercel/Serverless: Absolute path check
  if (process.env.VERCEL) {
    const vPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    try {
      if (require('fs').existsSync(vPath)) return vPath;
    } catch {}
  }

  // Virtual root resolution
  if (typeof ffmpegStatic === 'string' && ffmpegStatic.startsWith('\\ROOT\\')) {
    return path.join(process.cwd(), ffmpegStatic.replace('\\ROOT\\', ''));
  }
  return ffmpegStatic;
}

const FFMPEG_BIN = getFFmpegPath();

export async function POST(req) {
  let browser;
  try {
    const { animId, logoData, logoSvgText, fps = 30, backgroundColor, quality = 18, size = 420 } = await req.json();
    const targetFps = Math.min(Number(fps) || 30, 60);
    const targetCrf = Math.max(4, Math.min(51, Number(quality) || 18));
    const targetSize = Math.max(100, Math.min(1200, Number(size) || 420));
    const animation = { ...(ANIMATIONS.find(a => a.id === animId) ?? ANIMATIONS[0]), backgroundColor };
    const frameCount = Math.ceil((animation.duration / 1000) * targetFps);
    const frameDelayMs = animation.duration / frameCount;

    console.log(`[Export] Starting session: ${animation.name} (${frameCount} frames) | Transparency: ${!backgroundColor} | Env: ${isVercel ? 'Vercel' : 'Local'}`);

    browser = await getBrowser();

    const page = await browser.newPage();
    await page.setViewport({ width: targetSize, height: targetSize, deviceScaleFactor: 2 });

    const isPathDraw = animation.family === 'path-draw';
    const isParticleBurst = animation.family === 'particle-burst';

    // Priority: logoData (Base64 from client) > logoSvgText
    const dataUrl = logoData || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvgText)}`;

    const bgStyle = backgroundColor ? `background:${backgroundColor} !important;` : 'background:transparent !important;';

    const html = `<!DOCTYPE html><html style="background:transparent;"><head><meta charset="utf-8"/><style>
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{width:${targetSize}px;height:${targetSize}px;overflow:hidden;background:transparent !important;}
      body{display:grid;place-items:center;${backgroundColor ? `background:${backgroundColor} !important;` : ''}}
      canvas{width:${targetSize}px;height:${targetSize}px;display:block;background:transparent !important;${backgroundColor ? `background:${backgroundColor} !important;` : ''}}
    </style></head><body>
      <canvas id="canvas" width="${targetSize * 2}" height="${targetSize * 2}"></canvas>
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Setup Canvas Engine in Puppeteer
    await page.evaluate(async (engineStr, logoSvgText, animConfig) => {
      window.__renderFrameFn = new Function('return ' + engineStr)();
      window.__animConfig = animConfig;
      
      const canvas = document.getElementById('canvas');
      window.__ctx = canvas.getContext('2d');
      
      // Load Logo Image
      const blob = new Blob([logoSvgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = url;
      });
      window.__logoImg = img;

      // Extract Path Data (Fixing InvalidStateError by rendering SVG)
      // We wrap the SVG in a hidden div to allow measurements like getTotalLength()
      const measureContainer = document.createElement('div');
      measureContainer.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden;top:-9999px;';
      measureContainer.innerHTML = logoSvgText;
      document.body.appendChild(measureContainer);

      const svgEl = measureContainer.querySelector('svg');
      const paths = svgEl.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
      
      window.__svgPathData = Array.from(paths).map(node => {
        let d = "";
        if (node.tagName === "path") d = node.getAttribute("d");
        else if (node.tagName === "rect") {
          const x = parseFloat(node.getAttribute("x") || 0), 
                y = parseFloat(node.getAttribute("y") || 0), 
                w = parseFloat(node.getAttribute("width")), 
                h = parseFloat(node.getAttribute("height"));
          d = `M${x} ${y}h${w}v${h}h-${w}z`;
        } else if (node.tagName === "circle") {
          const cx = parseFloat(node.getAttribute("cx")), 
                cy = parseFloat(node.getAttribute("cy")), 
                r = parseFloat(node.getAttribute("r"));
          d = `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 -${r * 2} 0`;
        }
        
        // Now getTotalLength() will work because it's part of the rendered document
        const length = node.getTotalLength ? node.getTotalLength() : 1000;
        
        return {
          d: d || node.getAttribute("d"),
          length,
          color: node.getAttribute("stroke") || node.getAttribute("fill") || "#91f6ff",
          strokeWidth: node.getAttribute("stroke-width") || "2"
        };
      }).filter(p => p.d);

      // Clean up measurement container
      document.body.removeChild(measureContainer);

    }, renderFrame.toString(), logoSvgText, animation);

    const ffmpeg = spawn(FFMPEG_BIN, [
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', String(targetFps),
      '-i', '-',
      '-c:v', 'libvpx-vp9',
      '-pix_fmt', 'yuva420p',
      '-auto-alt-ref', '0',
      '-b:v', '0',
      '-crf', String(targetCrf),
      '-deadline', 'good',
      '-cpu-used', '2',
      '-an',
      '-f', 'webm',
      '-'
    ]);

    const chunks = [];
    ffmpeg.stdout.on('data', c => chunks.push(c));
    let errLog = '';
    ffmpeg.stderr.on('data', d => errLog += d.toString());

    // ─── Render Loop (v2.0 Canvas Synthesis) ───────────────────────────────────
    for (let i = 0; i < frameCount; i++) {
      if (i % 20 === 0) console.log(`[Export] Frame ${i}/${frameCount}`);

      const progress = i / frameCount;
      
      await page.evaluate((p) => {
        window.__renderFrameFn(window.__ctx, p, window.__logoImg, window.__animConfig, window.__svgPathData);
      }, progress);

      // Extract frame buffer directly
      const buffer = await page.screenshot({
        type: 'png',
        omitBackground: true,
        clip: { x: 0, y: 0, width: targetSize, height: targetSize }
      });

      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.write(buffer);
      } else {
        throw new Error(`FFmpeg stdin closed prematurely: ${errLog}`);
      }
    }

    ffmpeg.stdin.end();

    const webmBuffer = await new Promise((resolve, reject) => {
      ffmpeg.on('close', code => {
        if (code === 0) resolve(Buffer.concat(chunks));
        else reject(new Error(`FFmpeg error (${code}): ${errLog}`));
      });
      ffmpeg.on('error', e => reject(e));
    });

    console.log(`[Export] Complete. Buffer: ${webmBuffer.length} bytes`);

    return new NextResponse(webmBuffer, {
      headers: {
        'Content-Type': 'video/webm',
        'Content-Disposition': `attachment; filename="loader.webm"`,
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('[Export] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}