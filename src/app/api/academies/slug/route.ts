import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { resolveAcademyMembership } from '@/lib/resolveAcademyMembership'
import { isValidSlug, normalizeSlugForLookup } from '@/lib/slug'
import { logger } from '@/lib/logger'

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const { slug: rawSlug } = await request.json().catch(() => ({}))
    // NFC 정규화 — 저장과 조회 모두 NFC로 통일하여 매칭 실패 회귀 방지
    const slug = rawSlug ? normalizeSlugForLookup(rawSlug) : ''
    if (!slug || !isValidSlug(slug)) {
      return NextResponse.json({ error: '유효하지 않은 slug입니다.' }, { status: 400 })
    }

    const membership = await resolveAcademyMembership(userId)
    if (membership.role !== 'owner') {
      return NextResponse.json({ error: 'slug 변경은 원장만 가능합니다.' }, { status: 403 })
    }

    const client = getServiceRoleClient()

    // 중복 확인 (자기 자신 제외)
    const { data: existing } = await client
      .from('academies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing && existing.id !== membership.academyId) {
      return NextResponse.json({ error: '이미 사용 중인 slug입니다.' }, { status: 409 })
    }

    const { data, error } = await client
      .from('academies')
      .update({ slug })
      .eq('id', membership.academyId)
      .select('slug')
      .single()

    if (error || !data) {
      logger.error('slug 변경 실패', { academyId: membership.academyId }, error as Error)
      return NextResponse.json({ error: 'slug 변경 실패' }, { status: 500 })
    }

    return NextResponse.json({ slug: data.slug })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
