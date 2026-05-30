import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { isValidSlug, normalizeSlugForLookup } from '@/lib/slug'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawSlug = searchParams.get('slug')

  if (!rawSlug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  // NFC 정규화 — 사용자가 NFD로 입력해도 DB(NFC)와 일관 비교
  const slug = normalizeSlugForLookup(rawSlug)

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
