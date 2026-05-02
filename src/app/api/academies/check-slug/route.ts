import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { isValidSlug } from '@/lib/slug'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  if (!isValidSlug(slug)) {
    return NextResponse.json({ available: false, reason: 'invalid_format' })
  }

  const excludeId = searchParams.get('excludeId')

  const client = getServiceRoleClient()
  let query = client
    .from('academies')
    .select('id')
    .eq('slug', slug)
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  const { data } = await query.maybeSingle()

  return NextResponse.json({ available: !data })
}
