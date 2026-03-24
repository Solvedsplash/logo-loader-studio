import puppeteer from 'puppeteer';
import GIFEncoder from 'gif-encoder-2';
import Jimp from 'jimp';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { animId, viewBox, logoHtml, logoSrc, duration } = await req.json();

    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 420, deviceScaleFactor: 1 });

    // Navigate to the render page
    await page.goto(`http://localhost:3000/render?anim=${animId}&viewBox=${viewBox}`, { waitUntil: 'networkidle0' });

    // Inject the data and start the animation
    await page.evaluate((html, src) => {
      window.loadLogoHtml(html, src);
    }, logoHtml, logoSrc);

    // Wait for the animation to initialize
    await page.waitForFunction('window.animationReady === true');

    const targetFps = 30;
    const safeDuration = Number(duration) + 200; // Add a small buffer to ensure the loop completes
    const frameCount = Math.floor(safeDuration / (1000 / targetFps));
    const buffers = [];

    // Burst capture screenshots attempting to match real-time
    const captureStart = Date.now();
    for (let i = 0; i < frameCount; i++) {
       const expectedTime = captureStart + (i * (1000 / targetFps));
       const delay = expectedTime - Date.now();
       if (delay > 0) {
           await new Promise(r => setTimeout(r, delay));
       }
       buffers.push(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 420, height: 420 } }));
    }

    await browser.close();

    // Prepare GIF Encoder
    const encoder = new GIFEncoder(420, 420);
    encoder.start();
    encoder.setRepeat(0); // infinite loop
    encoder.setDelay(1000 / targetFps);
    encoder.setQuality(10); 

    // Decode with Jimp and add to encoder sequentially
    for (const buffer of buffers) {
      const image = await Jimp.read(buffer);
      encoder.addFrame(image.bitmap.data);
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
    console.error("GIF export failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
