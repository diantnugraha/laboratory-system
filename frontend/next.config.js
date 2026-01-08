const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Set Turbopack root to current directory to avoid workspace root detection issues
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
