import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { isUUID, normalizeSlugForLookup } from '@/lib/slug'
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

    // academyId가 slug이면 UUID로 변환.
    // NFC 정규화 — URL/클립보드를 거쳐 NFD로 도착한 한글 slug가 NFC로 저장된
    // DB와 매칭 실패하는 회귀 (학부모 코드 입력 페이지 404 사고) 방지.
    let academyUuid = academyId
    if (!isUUID(academyId)) {
      const slugLookup = normalizeSlugForLookup(academyId)
      const { data: academy } = await client
        .from('academies')
        .select('id')
        .eq('slug', slugLookup)
        .maybeSingle()

      if (!academy) {
        recordFailure(lockoutKey, MAX_FAILURES, LOCKOUT_MS)
        return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 404 })
      }
      academyUuid = academy.id
    }

    // NFC normalize: client가 NFD로 보내도 DB(NFC)와 매칭되도록 서버측에서도 정규화.
    // (방어적 — client는 이미 NFC로 보내지만 다른 entry point도 안전.)
    const normalizedCode = code.normalize('NFC')

    // academy 범위 내에서만 코드 조회 (cross-academy 격리)
    const { data, error } = await client
      .from('share_tokens')
      .select('token, expires_at, academy_id')
      .eq('access_code', normalizedCode)
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
