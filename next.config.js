/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile ESM packages and lib files through webpack
  transpilePackages: ['webm-muxer', 'gifenc'],
};

module.exports = nextConfig;
