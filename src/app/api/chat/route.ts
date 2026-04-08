import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are the Young at Heart Festival assistant. You help visitors with questions about the festival.

KEY FACTS:
- Event: Young at Heart Festival 2026 (formerly Cape Town Halaal Lifestyle Expo)
- Tagline: South Africa's Largest Lifestyle Exhibition
- Dates: December 11-13, 2026 (Thursday to Saturday)
- Venue: Youngsfield Military Base, Cape Town, South Africa
- Expected: 350+ vendors, 25,000+ visitors over 3 days
- Contact: support@youngatheart.co.za | 065 943 5012
- Instagram: @youngatheart_capetown
- Tickets: Available at tickets.youngatheart.co.za
- Website: cthalaal.co.za

TICKET TYPES:
- Friday Pass (Day 1)
- Saturday Pass (Day 2)
- Sunday Pass (Day 3)
- Weekend Pass (all 3 days, best value)

VENDOR INFO:
- 264 booth spaces across 4 categories: Food & Treats (FT), Fashion & Style (FS), Trending & Services (TS), Business & Sponsors (BS)
- Vendor applications: apply at cthalaal.co.za/apply
- Electricity available for select booths (additional fee)
- Vendors receive confirmation email with booth details after approval

SECTORS:
- Food & Culinary
- Fashion & Beauty
- Home & Living
- Health & Wellness
- Kids & Family
- Technology
- Arts & Crafts
- Business Services

RULES:
- Be friendly, concise, and helpful
- If unsure about something specific (like exact pricing), direct them to support@youngatheart.co.za or the ticket store
- Keep responses short (2-4 sentences unless they ask for detail)
- Do not make up information. If you don't know, say so and point them to the right contact
- Respond in the same language the visitor writes in (primarily English, but support Afrikaans too)`

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Chat service not configured' }, { status: 503 })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
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
