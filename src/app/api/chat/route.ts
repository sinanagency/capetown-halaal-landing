import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { FESTIVAL_SYSTEM_PROMPT } from '@/lib/festival-brain'


const ADMIN_PROMPT = `You are the Young at Heart Festival admin assistant. You help the festival management team understand their data and make decisions.

You have access to these admin tools and pages:
- Dashboard (cthalaal.co.za/admin): KPIs, revenue trends, vendor pipeline, ticket sales charts
- Ticket Sales (/admin/tickets): WooCommerce order data, daily revenue, ticket type breakdown
- Applications (/admin/applications): vendor booth applications, approve/reject/request info
- Analytics (/admin/analytics): page views, visitors, geo data, device breakdown, referrers, vendor funnel
- Follow Up (/admin/follow-up): failed payments, abandoned checkouts, captured emails from drop-offs

KEY METRICS YOU KNOW:
- 264 total booth spaces across 4 categories (FT, FS, TS, BS)
- Booth prices: R3,700 to R12,000 (marquee), R4,800 to R8,500 (food trucks)
- Festival dates: Dec 11-13, 2026
- Ticket prices: R30/day, R60 weekend pass
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
- Reference exact pages/sections where they can find data
- Keep responses concise (2-3 sentences)`

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Chat service not configured' }, { status: 503 })
    }

    const systemPrompt = context === 'admin' ? ADMIN_PROMPT : FESTIVAL_SYSTEM_PROMPT

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
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
