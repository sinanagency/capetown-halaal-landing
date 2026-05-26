import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    // Legacy static portal page is gone — send any old link to the real login.
    return [
      { source: '/exhibitor.html', destination: '/exhibitor/login', permanent: true },
    ];
  },
};

export default nextConfig;
