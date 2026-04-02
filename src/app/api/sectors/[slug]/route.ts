import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SLUG_TO_SECTOR: Record<string, string> = {
  'food-beverage': 'Food & Beverage',
  'fashion-modest-wear': 'Fashion & Modest Wear',
  'beauty-wellness': 'Beauty & Wellness',
  'health-pharmacy': 'Health & Pharmacy',
  'travel-tourism': 'Travel & Tourism',
  'home-living': 'Home & Living',
  'finance-services': 'Finance & Services',
  'business-trade': 'Business & Trade',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const sectorName = SLUG_TO_SECTOR[slug]

    if (!sectorName) {
      return NextResponse.json({ error: 'Sector not found' }, { status: 404 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('vendor_applications')
      .select('id, business_name, business_description, website, instagram')
      .eq('status', 'approved')
      .contains('product_categories', [sectorName])
      .order('business_name', { ascending: true })

    if (error) {
      console.error('Sector query error:', error)
      return NextResponse.json({ vendors: [] })
    }

    return NextResponse.json({ vendors: data || [] })
  } catch (error) {
    console.error('Sector API error:', error)
    return NextResponse.json({ vendors: [] })
  }
}
