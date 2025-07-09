import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = withPWA({
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  },
});

export default nextConfig;
