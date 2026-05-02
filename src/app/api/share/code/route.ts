import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { isUUID } from '@/lib/slug'
import {
  checkRateLimit,
  checkLockout,
  recordFailure,
  resetFailures,
} from '@/lib/rateLimit'

// IP rate limit: 분당 10회
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

// academy+IP 조합 lockout: 5회 실패 시 1시간
const MAX_FAILURES = 5
const LOCKOUT_MS = 60 * 60 * 1_000  // 1시간 (ms)

function extractIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { code, academyId } = body as { code?: string; academyId?: string }

    if (!code) {
      return NextResponse.json({ error: 'code가 필요합니다.' }, { status: 400 })
    }
    if (!academyId) {
      return NextResponse.json({ error: 'academyId가 필요합니다.' }, { status: 400 })
    }

    const ip = extractIp(request)
    const lockoutKey = `${academyId}:${ip}`

    // IP rate limit 확인
    const { allowed } = checkRateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 })
    }

    // academy+IP 조합 lockout 확인
    if (checkLockout(lockoutKey)) {
      return NextResponse.json({ error: '너무 많이 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }

    const client = getServiceRoleClient()
    const now = new Date().toISOString()

    // academyId가 slug이면 UUID로 변환
    let academyUuid = academyId
    if (!isUUID(academyId)) {
      const { data: academy } = await client
        .from('academies')
        .select('id')
        .eq('slug', academyId)
        .maybeSingle()

      if (!academy) {
        recordFailure(lockoutKey, MAX_FAILURES, LOCKOUT_MS)
        return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 404 })
      }
      academyUuid = academy.id
    }

    // academy 범위 내에서만 코드 조회 (cross-academy 격리)
    const { data, error } = await client
      .from('share_tokens')
      .select('token, expires_at, academy_id')
      .eq('access_code', code)
      .eq('academy_id', academyUuid)
      .is('revoked_at', null)
      .gt('expires_at', now)
      .maybeSingle()

    if (error || !data) {
      recordFailure(lockoutKey, MAX_FAILURES, LOCKOUT_MS)
      return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 404 })
    }

    resetFailures(lockoutKey)
    return NextResponse.json({ token: data.token })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
