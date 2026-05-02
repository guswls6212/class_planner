import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetServiceRoleClient = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabaseServiceRole', () => ({
  getServiceRoleClient: mockGetServiceRoleClient,
}))

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

describe('GET /api/academies/check-slug', () => {
  it('사용 가능한 slug → { available: true }', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/academies/check-slug?slug=현진학원'))
    expect(res.status).toBe(200)
    expect((await res.json()).available).toBe(true)
  })

  it('중복 slug → { available: false }', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'some-id' }, error: null })
    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/academies/check-slug?slug=현진학원'))
    expect((await res.json()).available).toBe(false)
  })

  it('slug 파라미터 없으면 400', async () => {
    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/academies/check-slug'))
    expect(res.status).toBe(400)
  })

  it('excludeId가 있으면 해당 academy를 제외하고 조회한다 (자기 자신의 slug는 available)', async () => {
    // The academy with the same slug is the one being excluded → no other match → available
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/academies/check-slug?slug=my-academy&excludeId=acad-1')
    )
    expect(res.status).toBe(200)
    expect((await res.json()).available).toBe(true)
    expect(mockSupabase.neq).toHaveBeenCalledWith('id', 'acad-1')
  })
})
