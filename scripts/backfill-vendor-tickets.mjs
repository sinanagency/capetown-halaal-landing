// Backfill: create vendor_tickets for each vendor_application and link
// existing wa_threads + support_inbox_threads.
//
// Usage: node scripts/backfill-vendor-tickets.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
//
// Safe to re-run — skips vendor_applications that already have a ticket.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
}

async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`SQL error ${res.status}: ${body}`)
  }
  return res.headers.get('content-type')?.includes('json') ? res.json() : res.text()
}

async function run() {
  console.log('=== Backfill vendor tickets ===')

  // 1. Fetch all vendor_applications that exist
  const apps = await sql(`vendor_applications?select=id,email,phone,status,business_name&order=created_at.asc`)
  console.log(`Found ${apps.length} vendor applications`)

  // 2. Get existing tickets to skip
  const existingTickets = await sql(`vendor_tickets?select=vendor_application_id`)
  const existingIds = new Set(existingTickets.map(t => t.vendor_application_id).filter(Boolean))
  console.log(`Existing tickets: ${existingIds.size}`)

  // 3. Create tickets for applications without one
  let created = 0
  for (const app of apps) {
    if (existingIds.has(app.id)) continue
    const phone = (app.phone || '').replace(/[^0-9]/g, '').slice(-9)
    const email = (app.email || '').toLowerCase().trim()

    const ticketRes = await fetch(`${SUPABASE_URL}/rest/v1/vendor_tickets`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        vendor_application_id: app.id,
        status: 'open',
      }),
    })

    if (!ticketRes.ok) {
      const err = await ticketRes.text().catch(() => '')
      console.error(`  Failed to create ticket for ${app.id}: ${err}`)
      continue
    }

    const [ticket] = await ticketRes.json()
    created++
    console.log(`  Ticket ${ticket.id} -> ${app.business_name || app.id}`)
  }
  console.log(`Created ${created} new tickets`)

  // 4. Link wa_threads that have vendor_application_id but no ticket_id
  const waThreads = await sql(`wa_threads?select=id,wa_phone,vendor_application_id&ticket_id=is.null&not.is.vendor_application_id`)
  console.log(`\nWA threads without ticket_id (with vendor link): ${waThreads.length}`)

  let waLinked = 0
  for (const t of waThreads) {
    if (!t.vendor_application_id) continue
    const tickets = await sql(`vendor_tickets?select=id&vendor_application_id=eq.${t.vendor_application_id}&limit=1`)
    if (tickets.length === 0) continue
    await sql(`wa_threads?id=eq.${t.id}`)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/wa_threads?id=eq.${t.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ticket_id: tickets[0].id }),
    })
    if (res.ok) { waLinked++ }
  }
  console.log(`Linked ${waLinked} WA threads`)

  // 5. Link support_inbox_threads that have vendor_application_id but no ticket_id
  const mailThreads = await sql(`support_inbox_threads?select=id,peer_email,vendor_application_id&ticket_id=is.null&not.is.vendor_application_id`)
  console.log(`\nSupport threads without ticket_id (with vendor link): ${mailThreads.length}`)

  let mailLinked = 0
  for (const t of mailThreads) {
    if (!t.vendor_application_id) continue
    const tickets = await sql(`vendor_tickets?select=id&vendor_application_id=eq.${t.vendor_application_id}&limit=1`)
    if (tickets.length === 0) continue
    const res = await fetch(`${SUPABASE_URL}/rest/v1/support_inbox_threads?id=eq.${t.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ticket_id: tickets[0].id }),
    })
    if (res.ok) { mailLinked++ }
  }
  console.log(`Linked ${mailLinked} support threads`)

  // 6. Update last_message_at and unread_count for all tickets
  const allTickets = await sql(`vendor_tickets?select=id`)
  console.log(`\nUpdating ${allTickets.length} ticket timestamps...`)

  for (const ticket of allTickets) {
    const waMsgs = await sql(`wa_messages?select=created_at&wa_threads(ticket_id=eq.${ticket.id})&order=created_at.desc&limit=1`)
    const mailMsgs = await sql(`support_inbox_messages?select=received_at&thread:support_inbox_threads!inner(ticket_id=eq.${ticket.id})&order=received_at.desc&limit=1`)

    const latest = [waMsgs[0]?.created_at, mailMsgs[0]?.received_at]
      .filter(Boolean)
      .sort()
      .reverse()[0]

    if (latest) {
      await fetch(`${SUPABASE_URL}/rest/v1/vendor_tickets?id=eq.${ticket.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ last_message_at: latest }),
      })
    }
  }

  console.log('\nDone!')
}

run().catch(console.error)
