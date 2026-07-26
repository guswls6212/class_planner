import { describe, it, expect, vi, beforeEach } from 'vitest'

// 세션 가드 스텁 — 라우트 로직 검증용. 실제 토큰 검증만 우회한다.
//   - 호출부가 userId 를 넘기면 그 값을 세션 사용자로 취급 (기존 단정 유지)
//   - 넘기지 않으면 "신원 없음" → 401. 라우트의 옛 계약은 "?userId= 없으면 400"
//     이었는데, 이제 신원 부재는 인증 실패이므로 401 이 맞다.
// 가드의 실제 정책은 아래 두 곳이 검증한다:
//   - src/lib/auth/__tests__/apiAuth.test.ts (가드 단위 — 401/403)
//   - src/app/api/__tests__/session-authz.integration.test.ts (라우트가 가드를 진짜 호출하는지)
vi.mock("@/lib/auth/apiAuth", () => {
  const unauthorized = () =>
    new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  return {
    requireSessionUser: vi.fn(
      async (_request: unknown, claimedUserId?: string | null) =>
        claimedUserId
          ? { ok: true as const, userId: claimedUserId }
          : { ok: false as const, response: unauthorized() }
    ),
    verifyBearerUser: vi.fn(async () => ({
      id: "test-user-id",
      email: "test@example.com",
    })),
    getAuthenticatedUserId: vi.fn(async () => "test-user-id"),
  };
});

import { NextRequest } from 'next/server'

const mockResolveAcademyMembership = vi.hoisted(() => vi.fn())
const mockGetServiceRoleClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/resolveAcademyMembership', () => ({
  resolveAcademyMembership: mockResolveAcademyMembership,
}))
vi.mock('@/lib/supabaseServiceRole', () => ({
  getServiceRoleClient: mockGetServiceRoleClient,
}))

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

function makePatch(body: object, userId = 'owner-1') {
  return new NextRequest(`http://localhost/api/academies/slug?userId=${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/academies/slug', () => {
  it('owner가 slug 변경 → 200 + slug 반환', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'owner' })
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }) // no conflict
    mockSupabase.single.mockResolvedValueOnce({ data: { slug: '새slug' }, error: null })

    const { PATCH } = await import('../route')
    const res = await PATCH(makePatch({ slug: '새slug' }))
    expect(res.status).toBe(200)
    expect((await res.json()).slug).toBe('새slug')
  })

  it('admin이 slug 변경 시도 → 403', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'admin' })
    const { PATCH } = await import('../route')
    const res = await PATCH(makePatch({ slug: '새slug' }))
    expect(res.status).toBe(403)
  })

  it('중복 slug (다른 학원) → 409', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'owner' })
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'other-academy' }, error: null })
    const { PATCH } = await import('../route')
    const res = await PATCH(makePatch({ slug: '중복slug' }))
    expect(res.status).toBe(409)
  })

  it('유효하지 않은 slug → 400', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'owner' })
    const { PATCH } = await import('../route')
    const res = await PATCH(makePatch({ slug: 'a' })) // too short
    expect(res.status).toBe(400)
  })
})
