import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { resolveAcademyMembership } from '@/lib/resolveAcademyMembership'
import { logger } from '@/lib/logger'
import { toErrorResponse } from '@/lib/errors'
import {
  PAGINATION_DEFAULT_LIMIT,
  decodeCursor,
  encodeCursor,
  isPaginatedRequest,
  parsePaginationParams,
} from '@/lib/pagination'

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

    const client = getServiceRoleClient()
    const paginationOpts = parsePaginationParams(searchParams)

    if (isPaginatedRequest(paginationOpts)) {
      // Paginated mode — desc cursor (at + id tie-break) + q (action search)
      // cursor payload의 createdAt 필드는 audit_log의 at 컬럼 값을 담는다 (generic 형식 재사용).
      let query = client
        .from('audit_log')
        .select('id, actor_id, action, target_type, target_id, before, after, at')
        .eq('academy_id', academyId)
        .order('at', { ascending: false })
        .order('id', { ascending: false })

      if (paginationOpts.q) {
        query = query.ilike('action', `%${paginationOpts.q}%`)
      }
      if (paginationOpts.cursor) {
        const decoded = decodeCursor(paginationOpts.cursor)
        if (decoded) {
          query = query.or(
            `at.lt.${decoded.createdAt},and(at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
          )
        }
      }
      const limit = paginationOpts.limit ?? PAGINATION_DEFAULT_LIMIT
      query = query.limit(limit + 1)

      const { data, error } = await query
      if (error) {
        logger.error('audit_log 페이징 조회 실패', { userId, academyId }, error as Error)
        return NextResponse.json({ success: false, error: 'audit_log 조회에 실패했습니다.' }, { status: 500 })
      }

      const rows = data ?? []
      const hasMore = rows.length > limit
      const items = hasMore ? rows.slice(0, limit) : rows
      let nextCursor: string | null = null
      if (hasMore && items.length > 0) {
        const last = items[items.length - 1]
        nextCursor = encodeCursor({
          createdAt: last.at as string,
          id: last.id as string,
        })
      }
      return NextResponse.json({ success: true, logs: items, nextCursor })
    }

    // 기존 흐름 (회귀 0) — 옵션 없으면 limit 20 default, 최대 50
    const limitParam = searchParams.get('limit')
    const limit = Math.min(parseInt(limitParam ?? '20', 10) || 20, 50)

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
