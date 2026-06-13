import type { NextConfig } from "next";

// Security headers applied to ALL routes. HSTS preload requires HTTPS-only
// delivery (Vercel terminates TLS). Permissions-Policy locks down camera,
// microphone, geolocation since this site never needs them. Frame-deny + nosniff
// + strict-origin-when-cross-origin are the OWASP baseline.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // Legacy static portal page is gone, send any old link to the real login.
    return [
      { source: '/exhibitor.html', destination: '/exhibitor/login', permanent: true },
    ];
  },
};

export default nextConfig;
