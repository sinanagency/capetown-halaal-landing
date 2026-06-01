#!/usr/bin/env node
/**
 * Terminal campaign sender for Young at Heart Festival.
 *
 * Calls the branded campaign engine at /api/admin/campaign/send — the SAME engine
 * Sam's portal will use later — so every email goes out in the branded shell,
 * DKIM-signed through Resend.
 *
 * Usage:
 *   node scripts/send-campaign.mjs <content.json> --to=<audience> [--dry] [--limit=N] [--local]
 *
 * Audiences:
 *   vendors            all vendor applications
 *   vendors_pending    pending / info_requested vendors
 *   vendors_approved   approved vendors
 *   buyers             everyone in ticket_buyers
 *   test               sends to the emails in content.testTo (great for a final check)
 *
 * Flags:
 *   --dry        show who WOULD receive it (count + sample), send nothing
 *   --limit=N    override the 100/day free-tier cap (also raise your Resend plan!)
 *   --local      hit http://localhost:3000 instead of production
 *
 * Auth: reads CRON_SECRET from the environment or .env.local.
 *
 * Example:
 *   node scripts/send-campaign.mjs scripts/campaign.example.json --to=test --dry
 */
import fs from 'node:fs'
import path from 'node:path'

const argFlag = (n) => process.argv.includes(`--${n}`)
const argVal = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}

const contentFile = process.argv[2]
if (!contentFile || contentFile.startsWith('--')) {
  console.error('Usage: node scripts/send-campaign.mjs <content.json> --to=<audience> [--dry] [--limit=N] [--local]')
  process.exit(1)
}

function readEnv(key) {
  if (process.env[key]) return process.env[key].trim()
  try {
    const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const line = env.split('\n').find((l) => l.startsWith(`${key}=`))
    if (line) return line.slice(key.length + 1).trim()
  } catch {}
  return null
}

const CRON_SECRET = readEnv('CRON_SECRET')
if (!CRON_SECRET) {
  console.error('✗ CRON_SECRET not found in env or .env.local — needed to authorise the send.')
  process.exit(1)
}

const spec = JSON.parse(fs.readFileSync(contentFile, 'utf8'))
const audience = argVal('to', spec.audience)
if (!audience) {
  console.error('✗ No audience. Pass --to=<audience> or set "audience" in the JSON.')
  process.exit(1)
}

const base = argFlag('local') ? 'http://localhost:3000' : 'https://cthalaal.co.za'
const dryRun = argFlag('dry')
const limit = argVal('limit')

const payload = {
  audience,
  subject: spec.subject,
  content: spec.content,
  testTo: spec.testTo || [],
  dryRun,
  ...(limit ? { limit: Number(limit) } : {}),
}

console.log(`\n→ ${dryRun ? 'DRY RUN' : 'SENDING'}  ·  audience=${audience}  ·  ${base}`)
console.log(`  subject: ${spec.subject}\n`)

const res = await fetch(`${base}/api/admin/campaign/send`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CRON_SECRET}` },
  body: JSON.stringify(payload),
})

const out = await res.json()
if (!res.ok) {
  console.error(`✗ ${res.status}:`, out)
  process.exit(1)
}

if (out.capWarning) console.log(`⚠️  ${out.capWarning}\n`)
if (dryRun) {
  console.log(`Would send to ${out.willSend} of ${out.total} recipients.`)
  console.log(`Sample: ${out.sample.join(', ')}`)
} else {
  console.log(`✓ Sent ${out.sent}  ·  ✗ Failed ${out.failed}  ·  of ${out.total} total`)
  if (out.errors?.length) console.log('First errors:', out.errors)
}
console.log('')
