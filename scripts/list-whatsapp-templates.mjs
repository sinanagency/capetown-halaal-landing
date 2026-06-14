#!/usr/bin/env node
// List every WhatsApp template registered to your WABA + their approval status.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..')
const envPath = path.join(repo, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i)
    if (!m) continue
    const k = m[1]; let v = m[2]
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v.replace(/\\n$/, '')
  }
}

const TOKEN = (process.env.WHATSAPP_TOKEN || '').trim()
const WABA = (process.env.WHATSAPP_BUSINESS_ID || '').trim()
if (!TOKEN || !WABA) { console.error('WHATSAPP_TOKEN / WHATSAPP_BUSINESS_ID missing'); process.exit(1) }

const res = await fetch(`https://graph.facebook.com/v20.0/${WABA}/message_templates?fields=name,status,category,language&limit=50`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
})
const j = await res.json()
if (!res.ok) { console.error(j); process.exit(1) }
for (const t of j.data || []) {
  console.log(`${t.status.padEnd(10)} ${t.category.padEnd(10)} ${t.language.padEnd(6)} ${t.name}`)
}
console.log(`\n${(j.data || []).length} templates`)
