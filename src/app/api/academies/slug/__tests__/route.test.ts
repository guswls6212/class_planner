import { describe, it, expect, vi, beforeEach } from 'vitest'
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
