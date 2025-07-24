const withPWA = require("next-pwa");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // This is a top-level Next.js config
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Other Next.js configurations can go here
};

// Wrap your nextConfig with withPWA
module.exports = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  // disable: process.env.NODE_ENV === "development",
})(nextConfig); // Pass your nextConfig into the withPWA higher-order function



export default nextConfig;
