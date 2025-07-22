declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: Array<{
      urlPattern: RegExp;
      handler: string;
      options?: {
        cacheName: string;
        expiration?: {
          maxEntries: number;
          maxAgeSeconds: number;
        };
      };
    }>;
  }

  function withPWA(pwaConfig: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withPWA;
}