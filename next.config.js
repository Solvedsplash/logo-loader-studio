/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['webm-muxer', 'gifenc'],
  outputFileTracingIncludes: {
    // The export routes read the engine files off disk at runtime and inject
    // them into Puppeteer, so they must be traced into the serverless bundle
    // even though nothing imports them on the server.
    '/api/**/*': [
      './node_modules/@sparticuz/chromium/bin/**/*',
      './node_modules/ffmpeg-static/**/*',
      './lib/core-engine.js',
      './lib/svg-paths.js',
    ],
  },
};

module.exports = nextConfig;
