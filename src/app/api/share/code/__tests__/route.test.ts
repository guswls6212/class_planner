import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetServiceRoleClient = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabaseServiceRole', () => ({
  getServiceRoleClient: mockGetServiceRoleClient,
}))

// Rate limit 함수들을 mock — 기본적으로 모두 허용
const mockCheckRateLimit = vi.hoisted(() => vi.fn())
const mockCheckLockout = vi.hoisted(() => vi.fn())
const mockRecordFailure = vi.hoisted(() => vi.fn())
const mockResetFailures = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
  checkLockout: mockCheckLockout,
  recordFailure: mockRecordFailure,
  resetFailures: mockResetFailures,
}))

// 실제 UUID 형식 사용 (isUUID 체크를 통과하여 academies 조회 우회)
const ACADEMY_UUID_A = '11111111-1111-1111-1111-111111111111'
const ACADEMY_UUID_B = '22222222-2222-2222-2222-222222222222'

const mockSupabaseChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  mockGetServiceRoleClient.mockReturnValue(mockSupabaseChain)
  mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
  mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
  mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
  mockSupabaseChain.is.mockReturnValue(mockSupabaseChain)
  mockSupabaseChain.gt.mockReturnValue(mockSupabaseChain)
  // 기본: rate limit 허용, lockout 없음
  mockCheckRateLimit.mockReturnValue({ allowed: true, resetAt: Date.now() + 60_000 })
  mockCheckLockout.mockReturnValue(false)
})

function makeRequest(body: object, ip = '1.2.3.4') {
  return new NextRequest('http://localhost/api/share/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/share/code', () => {
  it('유효한 코드 + academyId → 200 + token 반환', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({
      data: {
        token: 'abc123def',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        academy_id: ACADEMY_UUID_A,
      },
      error: null,
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '이현2A', academyId: ACADEMY_UUID_A }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('abc123def')
  })

  it('code 없으면 400', async () => {
    const { POST } = await import('../route')
    const res = await POST(makeRequest({ academyId: ACADEMY_UUID_A }))
    expect(res.status).toBe(400)
  })

  it('academyId 없으면 400', async () => {
    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '이현2A' }))
    expect(res.status).toBe(400)
  })

  it('존재하지 않는 코드 → 404', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '없는코드', academyId: ACADEMY_UUID_A }))

    expect(res.status).toBe(404)
  })

  it('cross-academy: B 학원 UUID로 A 학원 코드 입력 → 404 + academy_id로 필터 확인', async () => {
    // DB가 academy_id 필터로 조회하므로 ACADEMY_UUID_B에 이현2A는 없음
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '이현2A', academyId: ACADEMY_UUID_B }))

    expect(res.status).toBe(404)
    // academy_id UUID로 직접 필터했는지 확인
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith('academy_id', ACADEMY_UUID_B)
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith('access_code', '이현2A')
  })

  it('IP rate limit 초과 → 429', async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, resetAt: Date.now() + 60_000 })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '이현2A', academyId: ACADEMY_UUID_A }))

    expect(res.status).toBe(429)
  })

  it('lockout 상태 → 429', async () => {
    mockCheckLockout.mockReturnValueOnce(true)

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '이현2A', academyId: ACADEMY_UUID_A }))

    expect(res.status).toBe(429)
  })

  it('성공 시 resetFailures 호출됨', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({
      data: {
        token: 'tok-success',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        academy_id: ACADEMY_UUID_A,
      },
      error: null,
    })

    const { POST } = await import('../route')
    await POST(makeRequest({ code: '이현2A', academyId: ACADEMY_UUID_A }))

    expect(mockResetFailures).toHaveBeenCalledOnce()
  })

  it('코드 실패 시 recordFailure 호출됨', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { POST } = await import('../route')
    await POST(makeRequest({ code: '틀린코드', academyId: ACADEMY_UUID_A }))

    expect(mockRecordFailure).toHaveBeenCalledOnce()
  })

  it('NFD 한글 slug → NFC로 정규화하여 academies 조회 (학부모 코드 페이지 404 회귀 방지)', async () => {
    // 1번째 maybeSingle: academies slug lookup → academy 발견
    // 2번째 maybeSingle: share_tokens 조회 → token 반환
    mockSupabaseChain.maybeSingle
      .mockResolvedValueOnce({ data: { id: ACADEMY_UUID_A }, error: null })
      .mockResolvedValueOnce({
        data: {
          token: 'tok-nfc-fixed',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          academy_id: ACADEMY_UUID_A,
        },
        error: null,
      })

    const nfdSlug = '현진학원'.normalize('NFD')
    const nfcSlug = '현진학원'.normalize('NFC')
    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '김요RTUE', academyId: nfdSlug }))

    expect(res.status).toBe(200)
    // academies 조회 시 NFC 정규화된 slug 사용했는지 검증
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith('slug', nfcSlug)
  })
})
