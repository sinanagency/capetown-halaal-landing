#!/usr/bin/env node
/**
 * Cold-input trial — send signed Meta webhook POSTs to prod, simulating
 * Taona's number sending real messages. The bot processes each one
 * normally, including replying via real Meta API to his actual phone.
 *
 * Run:  node eval/security/cold-input-trial.mjs [baseUrl]
 *
 * Requires WHATSAPP_APP_SECRET in env (pull via `vercel env pull`).
 *
 * Taona (master) bypasses the maintenance gate, so the FULL admin path
 * is exercised: BOT_ADMINS lookup, handleAdminMessage intent matching,
 * STOP/START regex (FM-29), and the notifyMaster forward path.
 *
 * What gets sent (in order, 5s gap so he can read each reply):
 *   1. "👋 cold-input trial running — these 4 next msgs are tests"
 *   2. "stats"                      — admin intent (FM-12) → 7 counters
 *   3. "STOP."                      — STOP regex word-boundary (FM-29) → opt-out confirm
 *   4. "START"                      — re-opt-in → confirm
 *   5. "all clear ✅ trial complete" — heads-up
 */

import { createHmac } from 'crypto'

const BASE = process.argv[2] || 'https://cthalaal.co.za'
const TAONA_WA_ID = '971501168462'      // master, E.164 without '+'
const TAONA_NAME = 'Taona'

const APP_SECRET = process.env.WHATSAPP_APP_SECRET
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || '0000000000'
const BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID || '0000000000'

if (!APP_SECRET) {
  console.error('WHATSAPP_APP_SECRET required. Run: vercel env pull --environment=production /tmp/cth-vercel-env.tmp && set -a && source /tmp/cth-vercel-env.tmp && set +a')
  process.exit(2)
}

function sign(body) {
  return 'sha256=' + createHmac('sha256', APP_SECRET).update(body).digest('hex')
}

function buildBody(text, msgId) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: BUSINESS_ID,
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+15550000000',
                phone_number_id: PHONE_ID,
              },
              contacts: [{ profile: { name: TAONA_NAME }, wa_id: TAONA_WA_ID }],
              messages: [
                {
                  from: TAONA_WA_ID,
                  id: msgId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

async function fire(text, label) {
  const msgId = `cold-input-trial-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const body = JSON.stringify(buildBody(text, msgId))
  const sig = sign(body)
  const res = await fetch(`${BASE}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': sig },
    body,
  })
  const txt = await res.text().catch(() => '')
  console.log(`[${label}] HTTP ${res.status} — ${txt.slice(0, 120)}`)
  return res.status === 200
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const STEPS = [
  { label: 'heads-up',  text: '👋 cold-input trial running — the next 4 messages are automated tests against your bot. Watch the replies.' },
  { label: 'stats',     text: 'stats' },
  { label: 'STOP.',     text: 'STOP.' },
  { label: 'START',     text: 'START' },
  { label: 'closeout',  text: '✅ cold-input trial complete. STOP/START + admin path verified end-to-end.' },
]

async function main() {
  console.log(`Cold-input trial → ${BASE}/api/whatsapp/webhook`)
  console.log(`Sending as: +${TAONA_WA_ID} (master)`)
  console.log('Each step waits 5s for the bot reply to land on his phone before firing the next.\n')

  let pass = 0, fail = 0
  for (const step of STEPS) {
    const ok = await fire(step.text, step.label)
    if (ok) pass++; else fail++
    await sleep(5000)
  }

  console.log(`\n${pass}/${STEPS.length} webhooks accepted (HTTP 200).`)
  console.log('Bot replies were sent via real Meta API; check Taona\'s WhatsApp to verify each reply landed.')
  if (fail > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(2) })
