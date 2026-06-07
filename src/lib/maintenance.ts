/**
 * Maintenance mode — single source of truth.
 *
 * Engage with env: MAINTENANCE_MODE=1 (or "true"). Disengage by removing or 0.
 *
 * Bypass: pass ?bypass=<MAINTENANCE_BYPASS_TOKEN> in the URL once; the response
 * sets a cookie so subsequent navigation works without the query param. Taona
 * uses this to preview the live site during sweep without flipping the flag.
 *
 * Scope:
 *   - Next.js HTML routes for cthalaal.co.za + youngatheart.co.za go dark.
 *   - /api/webhooks/*, /api/whatsapp/webhook, /api/payments/* still accept
 *     POSTs so Meta/Yoco/WooCommerce don't lose inbound during maintenance.
 *   - /maintenance, /_next/*, static assets, /api/health stay open.
 *   - The WordPress/FooEvents ticket store at tickets.youngatheart.co.za is
 *     a different origin — not affected by this file. Doctrine Laws 3 + 4.
 *
 * The WhatsApp bot has its own in-route maintenance branch (see
 * src/app/api/whatsapp/webhook/route.ts) so STOP/START + webhook 200 are
 * always honored even during maintenance.
 */

export const MAINTENANCE_COOKIE = 'cth_maintenance_bypass'

export function isMaintenanceEnabled(): boolean {
  const v = (process.env.MAINTENANCE_MODE || '').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}

export function bypassTokenFromEnv(): string | null {
  const t = (process.env.MAINTENANCE_BYPASS_TOKEN || '').trim()
  return t || null
}

export function isPathAlwaysOpen(pathname: string): boolean {
  // Routes that MUST stay open even during maintenance.
  if (pathname === '/maintenance') return true
  if (pathname === '/api/health') return true
  if (pathname.startsWith('/_next/')) return true
  if (pathname.startsWith('/static/')) return true
  if (pathname === '/favicon.ico') return true
  if (pathname === '/robots.txt') return true
  if (pathname === '/sitemap.xml') return true
  // Inbound webhooks must still land — losing data is worse than serving them.
  if (pathname.startsWith('/api/whatsapp/webhook')) return true
  if (pathname.startsWith('/api/payments/')) return true
  if (pathname.startsWith('/api/webhooks/')) return true
  return false
}
