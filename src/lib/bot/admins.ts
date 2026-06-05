// Hardcoded admin allowlist for the festival WhatsApp bot.
// Two roles today: 'master' (Taona — full control) and 'festival_owner' (Samreen
// — site/content/policy decisions). Admin inbound messages SKIP the festival
// LLM so the bot never tries to answer them as a customer.
//
// Phone format: E.164 with leading '+'. Match is by exact string after
// normalising both sides via toE164() in src/lib/whatsapp.ts.

export type AdminRole = 'master' | 'festival_owner'

export interface BotAdmin {
  phone: string // E.164, includes '+'
  role: AdminRole
  name: string
  email?: string
}

export const BOT_ADMINS: BotAdmin[] = [
  {
    phone: '+971501168462',
    role: 'master',
    name: 'Taona',
    email: 'admin@sinan.agency',
  },
  {
    phone: '+27723803393',
    role: 'festival_owner',
    name: 'Samreen Kumandan',
    email: 'capetownhalaal@gmail.com',
  },
]

export function findAdmin(e164: string): BotAdmin | null {
  const norm = (e164 || '').trim()
  return BOT_ADMINS.find((a) => a.phone === norm) || null
}

export function isAdmin(e164: string): boolean {
  return findAdmin(e164) !== null
}

export function adminPhones(): string[] {
  return BOT_ADMINS.map((a) => a.phone)
}
