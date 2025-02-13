/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true', // Enable the analyzer based on the environment variable
});

const nextConfig = {
  output: 'export',  // It tells Next.js to export my app as static files
  basePath: '/Path-Finding-Visualizer',  // Base path for my deployment
  assetPrefix: '/Path-Finding-Visualizer/',
  images: {
    unoptimized: true,  // Disable Next.js image optimization for static export
  },
};

module.exports = withBundleAnalyzer(nextConfig);  // Wrap your existing config with the analyzer
