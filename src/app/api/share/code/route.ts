import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { code, academyId } = body as { code?: string; academyId?: string }

    if (!code) {
      return NextResponse.json({ error: 'code가 필요합니다.' }, { status: 400 })
    }
    // academyId는 선택사항 — 코드는 전역 고유로 검색

    const client = getServiceRoleClient()
    const now = new Date().toISOString()

    // access_code는 전역적으로 유니크하게 조회 (academyId가 URL에서 잘못됐을 경우 대비)
    const { data, error } = await client
      .from('share_tokens')
      .select('token, expires_at, academy_id')
      .eq('access_code', code)
      .is('revoked_at', null)
      .gt('expires_at', now)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 404 })
    }

    return NextResponse.json({ token: data.token })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
