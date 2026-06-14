#!/usr/bin/env node
// CTH WhatsApp bot — daily conversation digest (Nisria conversation-review loop).
// Reads the last 24h of wa_messages, summarises activity, flags knowledge gaps
// (replies where the bot had to defer) and any send failures, and writes a dated
// markdown digest to ~/work-logs/. Run by launchd daily.
//
//   node scripts/bot-daily-digest.mjs            # last 24h
//   node scripts/bot-daily-digest.mjs 2026-06-01 # a specific day (UTC)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// --- load .env.local ---
const envPath = join(process.cwd(), '.env.local')
const env = {}
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
} catch { /* fall back to process.env */ }
const URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SRK = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SRK) { console.error('Missing Supabase creds'); process.exit(1) }

// --- window ---
const dayArg = process.argv[2]
let since, until, label
if (dayArg) {
  since = `${dayArg}T00:00:00`; until = `${dayArg}T23:59:59`; label = dayArg
} else {
  const now = new Date()
  since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
  until = now.toISOString(); label = `last 24h (to ${until.slice(0, 16)}Z)`
}

const h = { apikey: SRK, Authorization: `Bearer ${SRK}` }
async function q(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: h })
  return r.ok ? r.json() : []
}

const msgs = await q(`wa_messages?created_at=gte.${since}&created_at=lte.${until}&select=direction,status,wa_phone,body,template_name,broadcast_id,error,created_at&order=created_at.asc`)

const inbound = msgs.filter((m) => m.direction === 'in')
const outbound = msgs.filter((m) => m.direction === 'out')
const users = [...new Set(inbound.map((m) => m.wa_phone))]
const failed = outbound.filter((m) => m.status === 'failed')
const broadcasts = [...new Set(outbound.filter((m) => m.broadcast_id).map((m) => m.broadcast_id))]

// Knowledge gaps: bot replies that deferred / didn't know.
const DEFER = ["don't have", 'not sure', 'announced', 'reach out', "i don't", 'recommend reaching', 'confirmed closer', 'follow', 'instagram']
const deferrals = outbound.filter((m) => !m.template_name && m.body && DEFER.some((s) => m.body.toLowerCase().includes(s)))

let md = `# CTH WhatsApp Bot — Daily Digest\n_${label}_\n\n`
md += `## At a glance\n`
md += `- Inbound messages: **${inbound.length}** from **${users.length}** people\n`
md += `- Bot replies sent: **${outbound.filter((m) => !m.template_name).length}**\n`
md += `- Template/broadcast sends: **${outbound.filter((m) => m.template_name).length}** (${broadcasts.length} broadcast${broadcasts.length === 1 ? '' : 's'})\n`
md += `- Failed sends: **${failed.length}**\n\n`

md += `## Questions people asked\n`
md += inbound.length ? inbound.map((m) => `- "${(m.body || '').replace(/\n/g, ' ').slice(0, 140)}"`).join('\n') : '_none_'
md += `\n\n`

md += `## ⚠️ Knowledge gaps (bot had to defer) — candidates to add to the brain\n`
md += deferrals.length
  ? deferrals.map((m) => `- ${(m.body || '').replace(/\n/g, ' ').slice(0, 180)}…`).join('\n')
  : '_none — bot answered everything from its knowledge_'
md += `\n\n`

if (failed.length) {
  md += `## ❌ Failed sends (investigate)\n`
  md += failed.map((m) => `- ${m.wa_phone} — ${m.error || 'unknown'} ${m.template_name ? `(${m.template_name})` : ''}`).join('\n')
  md += `\n\n`
}

md += `---\n_Generated ${new Date().toISOString()}. Re-run the grounding eval anytime: \`node eval/festival-brain-eval.mjs\`._\n`

const dir = join(homedir(), 'work-logs')
mkdirSync(dir, { recursive: true })
const stamp = (dayArg || new Date().toISOString().slice(0, 10))
const out = join(dir, `cth-bot-digest-${stamp}.md`)
writeFileSync(out, md)
console.log(`✓ digest written: ${out}`)
console.log(`  inbound ${inbound.length} / users ${users.length} / deferrals ${deferrals.length} / failed ${failed.length}`)
