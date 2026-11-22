import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const config = { distDir: '.next-v2', devIndicators: false };

export default function nextConfig(phase) {
  return phase === PHASE_DEVELOPMENT_SERVER ? { ...config, distDir: '.next-dev' } : config;
}
