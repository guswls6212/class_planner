import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { code, academyId } = body as { code?: string; academyId?: string }

    if (!code || !academyId) {
      return NextResponse.json({ error: 'code와 academyId가 필요합니다.' }, { status: 400 })
    }

    const client = getServiceRoleClient()
    const now = new Date().toISOString()

    const { data, error } = await client
      .from('share_tokens')
      .select('token, expires_at')
      .eq('academy_id', academyId)
      .eq('access_code', code)
      .is('revoked_at', null)
      .gt('expires_at', now)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 404 })
    }

    return NextResponse.json({ token: data.token })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
