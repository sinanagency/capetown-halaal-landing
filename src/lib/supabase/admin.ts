import { createClient } from '@supabase/supabase-js'

// Admin client with service role key for server-side operations.
// cache:'no-store' on every read so App Router never serves stale portal data
// (Next.js patches fetch and caches by default — this bit the Nisria build).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (url, options = {}) =>
          fetch(url as RequestInfo, { ...options, cache: 'no-store' }),
      },
    }
  )
}
