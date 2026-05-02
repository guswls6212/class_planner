import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { resolveAcademyMembership } from '@/lib/resolveAcademyMembership'
import { logger } from '@/lib/logger'
import { toErrorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    const { academyId, role } = await resolveAcademyMembership(userId)

    if (!['owner', 'admin'].includes(role)) {
      return NextResponse.json({ success: false, error: '이력 조회 권한이 없습니다.' }, { status: 403 })
    }

    const limitParam = searchParams.get('limit')
    const limit = Math.min(parseInt(limitParam ?? '20', 10) || 20, 50)

    const client = getServiceRoleClient()
    const { data, error } = await client
      .from('audit_log')
      .select('id, actor_id, action, target_type, target_id, before, after, at')
      .eq('academy_id', academyId)
      .order('at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('audit_log 조회 실패', { userId, academyId }, error as Error)
      return NextResponse.json({ success: false, error: 'audit_log 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, logs: data })
  } catch (error) {
    return toErrorResponse(error)
  }
}
