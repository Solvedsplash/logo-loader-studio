/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['webm-muxer', 'gifenc'],
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/@sparticuz/chromium/bin/**/*',
      './node_modules/ffmpeg-static/**/*',
      './lib/core-engine.js',
    ],
  },
};

module.exports = nextConfig;
