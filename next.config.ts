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
  // CSP shipped in Report-Only mode first so prod doesn't break on a missed
  // origin. Browser logs violations, page still renders. Promote to the
  // enforcing header (`Content-Security-Policy`) after a clean sprint of
  // violation reports. connect-src covers: self, Supabase REST/Realtime,
  // Anthropic API, Resend webhook origins, Vercel telemetry. img-src 'self'
  // + data: + Unsplash (mirrors next.config remotePatterns). frame-ancestors
  // 'none' double-locks X-Frame-Options.
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.resend.com https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
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
      // Legacy vendor-ops workspace was renamed to allocation. 301 so any
      // bookmarks/links in older docs/emails land on the live map. The
      // vendor-ops page files remain on disk for one sprint as a safety net.
      { source: '/admin/vendor-ops', destination: '/admin/allocation', permanent: true },
      { source: '/admin/vendor-ops/:path*', destination: '/admin/allocation', permanent: true },
    ];
  },
};

export default nextConfig;
