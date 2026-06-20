import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { askFestivalBrain } from '@/lib/festival-brain'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  checkHoneypot,
  checkIpThrottle,
  logGuardEvent,
  clientIp,
} from '@/lib/security/abuse-guard'

const ENDPOINT = 'chat'
// 10 messages / IP / 10min for the public branch. Anyone past that is either
// a scraper or an LLM-burn DoS. Admin branch separately gates on session.
const MAX_PER_WINDOW = 10
const WINDOW_MIN = 10
const MAX_BODY_BYTES = 4 * 1024
const MAX_MESSAGE_CHARS = 1000

const ADMIN_PROMPT = `You are the Young at Heart Festival admin helper. You help the festival management team understand their data and make decisions.

You have access to these admin tools and pages:
- Dashboard (cthalaal.co.za/admin): KPIs, revenue trends, vendor pipeline, ticket sales charts
- Ticket Sales (/admin/tickets): WooCommerce order data, daily revenue, ticket type breakdown
- Applications (/admin/applications): vendor booth applications, approve/reject/request info
- Analytics (/admin/analytics): page views, visitors, geo data, device breakdown, referrers, vendor funnel
- Follow Up (/admin/follow-up): failed payments, abandoned checkouts, captured emails from drop-offs

KEY METRICS YOU KNOW:
- 264 total booth spaces across 4 categories (FT, FS, TS, BS)
- Booth prices: R3,700 to R12,000 (marquee), R4,800 to R8,500 (food trucks)
- Festival dates: 11, 12, 13 December 2026
- Ticket prices: R30 per day, R60 weekend pass
- Expected: 25,000+ visitors, 350+ vendors

ADMIN GUIDANCE:
- When asked about revenue, refer them to Dashboard or Ticket Sales page
- When asked about vendor categories, refer to the Vendor Categories section on Dashboard
- When asked about drop-offs, refer to Follow Up page and the vendor funnel in Analytics
- When asked about approvals, guide them to Applications page
- Suggest actionable next steps based on the data
- Be concise, data-driven, and helpful

RULES:
- Be professional but friendly
- Give specific, actionable advice
- Reference exact pages and sections where they can find data
- Keep responses concise (2-3 sentences)
- No em-dashes. Use commas, periods, colons.
- Do not say "AI assistant", "Claude", "ChatGPT". You are Zanii AI for Young at Heart.`

const client = new Anthropic()

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const meta = user.user_metadata || {}
    return Boolean(meta.is_admin) || meta.role === 'admin'
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient()
    const ip = clientIp(req.headers)

    // V7: cap raw body to 4KB so an attacker cannot ship a multi-MB prompt
    // and burn the Anthropic budget on a single call.
    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Body too large' }, { status: 413 })
    }
    let parsed: { messages?: Array<{ role: string; content: string }>; context?: string; [k: string]: unknown }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
    }
    const { messages, context } = parsed

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    // Honeypot — if there's a hidden form field, bots filling it get a soft
    // 200 so they can't fingerprint the defense.
    const hp = checkHoneypot(parsed as Record<string, unknown>)
    if (!hp.ok) {
      await logGuardEvent(admin, { endpoint: ENDPOINT, ip, reason: hp.reason!, fields: {} })
      return NextResponse.json({ message: '' })
    }

    // Cap message length. The public visitor concierge does not need 10K-char
    // turns and the admin chat only needs a few hundred.
    for (const m of messages) {
      if (typeof m?.content === 'string' && m.content.length > MAX_MESSAGE_CHARS) {
        return NextResponse.json({ error: 'Message too long' }, { status: 413 })
      }
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Chat service not configured' }, { status: 503 })
    }

    const adminBranch = context === 'admin'
    const vendorBranch = context === 'vendor'

    // Admin branch: gate the LLM call behind a real admin session. Public
    // callers asking for context=admin (e.g. trying to coax vendor-data
    // answers out of the prompt) get rejected at the door.
    if (adminBranch) {
      if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
      }
    } else if (vendorBranch) {
      // Vendor branch: ONLY a signed-in exhibitor gets vendor-platform answers.
      // A public caller POSTing context='vendor' has no exhibitor session, so
      // they're rejected — vendor answers never leak off the portal.
      const exhibitor = await getExhibitorContext()
      if (!exhibitor) {
        return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
      }
      const last = messages[messages.length - 1]
      const history = messages
        .slice(0, -1)
        .slice(-8)
        .map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      const assistantHasSpoken = messages.some((m: { role: string }) => m.role === 'assistant')
      const appRow = (exhibitor.application || {}) as Record<string, unknown>
      const brief = [
        appRow.business_name ? `Vendor business: ${appRow.business_name}` : null,
        appRow.contact_name ? `Contact: ${appRow.contact_name}` : null,
        appRow.status ? `Application status: ${appRow.status}` : null,
      ].filter(Boolean).join('. ')

      const result = await askFestivalBrain(last?.content ?? '', {
        history,
        forceFirstContact: !assistantHasSpoken,
        surface: 'vendor',
        extraSystem: brief || undefined,
      })
      return NextResponse.json({ message: result.message, needsHuman: result.needsHuman })
    } else {
      // Public branch: per-IP throttle.
      const throttle = await checkIpThrottle(admin, {
        ip,
        endpoint: ENDPOINT,
        max: MAX_PER_WINDOW,
        windowMin: WINDOW_MIN,
      })
      if (!throttle.ok) {
        await logGuardEvent(admin, { endpoint: ENDPOINT, ip, reason: throttle.reason!, fields: {} })
        return NextResponse.json(
          { message: 'You are sending messages too quickly. Try again in a minute.' },
          { status: 429 },
        )
      }
      await logGuardEvent(admin, {
        endpoint: ENDPOINT,
        ip,
        reason: 'rate_limited',
        fields: { kind: 'attempt' },
      })

      const last = messages[messages.length - 1]
      const history = messages
        .slice(0, -1)
        .slice(-8)
        .map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

      // Web chat = treat each new session as first-contact for sign-off purposes
      // if the assistant has not sent anything yet in this thread.
      const assistantHasSpoken = messages.some(
        (m: { role: string }) => m.role === 'assistant',
      )

      const result = await askFestivalBrain(last?.content ?? '', {
        history,
        forceFirstContact: !assistantHasSpoken,
      })

      return NextResponse.json({
        message: result.message,
        needsHuman: result.needsHuman,
      })
    }

    // Admin chat: direct LLM with admin prompt.
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: ADMIN_PROMPT,
      messages: messages.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
