import path from 'path';
import fs from 'fs';

/**
 * Launches a headless browser for the export routes.
 *
 * The bundled @sparticuz/chromium build only exists to satisfy serverless size
 * and glibc constraints; it is not a general "production" browser. Selecting it
 * on NODE_ENV === 'production' — as this used to — means any self-hosted or
 * containerised deployment, and even a local `next start`, fails to launch with
 * a bare ENOENT. So we detect the actual serverless platform, and fall back to
 * the serverless build only if a normal launch genuinely fails.
 */
const IS_SERVERLESS = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY
);

async function launchServerless() {
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteerCore = (await import('puppeteer-core')).default;
  chromium.setGraphicsMode = false;
  return puppeteerCore.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}

async function launchLocal() {
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
}

export async function getBrowser() {
  if (IS_SERVERLESS) return launchServerless();
  try {
    return await launchLocal();
  } catch (localError) {
    // A self-hosted image may ship the serverless binary and no full Chrome.
    console.warn('[export] Local Chrome unavailable, trying bundled Chromium:', localError.message);
    return launchServerless();
  }
}

/** Resolves the ffmpeg-static binary, coping with Vercel's rewritten paths. */
export function getFFmpegPath(ffmpegStatic) {
  if (!ffmpegStatic) return 'ffmpeg';
  let p = ffmpegStatic;
  // turbopackIgnore keeps the bundler from trying to statically trace these
  // runtime paths, which otherwise pulls the entire project into the NFT list.
  if (process.env.VERCEL) {
    const vPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    try { if (fs.existsSync(vPath)) p = vPath; } catch {}
  }
  if (typeof p === 'string' && p.startsWith('\\ROOT\\')) {
    p = path.join(/*turbopackIgnore: true*/ process.cwd(), p.replace('\\ROOT\\', ''));
  }
  try {
    if (fs.existsSync(p)) fs.chmodSync(p, 0o755);
  } catch {}
  return p;
}
