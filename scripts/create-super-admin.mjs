import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = resolve(dirname(fileURLToPath(import.meta.url)))

// ── Configurable values (edit these before running) ──────────────────────
const EMAIL = 'altaafkumandan@gmail.com'
const PASSWORD = 'changeme-on-first-login!'
const ADMIN_NAME = 'Altaaf Kumandan'
const SAMREEN_PHONE = '27723803393' // without + for Meta
// ─────────────────────────────────────────────────────────────────────────

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`FATAL: ${name} is not set. Must be a Supabase service key URL/secret or WhatsApp API token.`)
    process.exit(1)
  }
  return v
}

const SUPABASE_URL = requireEnv('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_KEY')
const WHATSAPP_TOKEN = requireEnv('WHATSAPP_TOKEN')
const WHATSAPP_PHONE_ID = requireEnv('WHATSAPP_PHONE_ID')

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function sendWhatsApp(to, message) {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`WhatsApp error: ${JSON.stringify(data)}`)
  return data
}

async function main() {
  console.log('Creating auth user for', EMAIL)

  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'owner' },
  })

  let userId
  if (createError) {
    console.log('Create failed, trying to find existing user:', createError.message)
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error || !data?.users?.length) break
      const u = data.users.find((u) => (u.email || '').toLowerCase() === EMAIL.toLowerCase())
      if (u) {
        userId = u.id
        await admin.auth.admin.updateUserById(u.id, { password: PASSWORD })
        console.log('Found existing user, password reset:', u.id)
        break
      }
      if (data.users.length < 200) break
    }
    if (!userId) {
      console.error('Could not create or find user')
      process.exit(1)
    }
  } else {
    userId = userData.user.id
    console.log('Auth user created:', userId)
  }

  const { error: insertError } = await admin
    .from('admin_users')
    .upsert(
      { id: userId, email: EMAIL, role: 'owner', name: ADMIN_NAME },
      { onConflict: 'id' }
    )

  if (insertError) {
    console.error('admin_users insert error:', insertError.message)
    process.exit(1)
  }
  console.log('admin_users row inserted as owner')

  const msg = `🔐 *New Super Admin Created*\n\nEmail: ${EMAIL}\nPassword: ${PASSWORD}\nRole: Owner (full access)\n\nLogin: https://admin.cthalaal.co.za\n\nPlease share these details with Altaaf securely.`

  try {
    const waResult = await sendWhatsApp(SAMREEN_PHONE, msg)
    console.log('WhatsApp sent to Samreen:', waResult.messages?.[0]?.id || 'OK')
  } catch (e) {
    console.error('WhatsApp send failed:', e.message)
    process.exit(1)
  }

  console.log('Done! Altaaf is now a super admin.')
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
