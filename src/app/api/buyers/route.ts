import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const buyerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
})

// POST: Create or retrieve buyer by email (auto-login)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = buyerSchema.parse(body)
    const supabase = createAdminClient()

    // Check if buyer exists
    const { data: existing } = await supabase
      .from('ticket_buyers')
      .select('*')
      .eq('email', validated.email)
      .single()

    if (existing) {
      // Update name/phone if provided
      if (validated.name || validated.phone) {
        const updates: Record<string, string> = {}
        if (validated.name) updates.name = validated.name
        if (validated.phone) updates.phone = validated.phone

        await supabase
          .from('ticket_buyers')
          .update(updates)
          .eq('id', existing.id)
      }
      return NextResponse.json({ buyer: existing, isNew: false })
    }

    // Create new buyer
    const { data: newBuyer, error } = await supabase
      .from('ticket_buyers')
      .insert({
        email: validated.email,
        name: validated.name || null,
        phone: validated.phone || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create buyer error:', error)
      return NextResponse.json({ error: 'Failed to create buyer' }, { status: 500 })
    }

    return NextResponse.json({ buyer: newBuyer, isNew: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    console.error('Buyer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
