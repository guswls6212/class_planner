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
  is: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/share/code', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/share/code', () => {
  it('유효한 코드 → 200 + token 반환', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { token: 'abc123def', expires_at: new Date(Date.now() + 86400000).toISOString(), academy_id: 'academy-1' },
      error: null,
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '이현2A', academyId: 'academy-1' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('abc123def')
  })

  it('academyId 없어도 코드만으로 200 반환 (global search)', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { token: 'xyz789', expires_at: new Date(Date.now() + 86400000).toISOString(), academy_id: 'academy-1' },
      error: null,
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '이현2A' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('xyz789')
  })

  it('존재하지 않는 코드 → 404', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '없는코드', academyId: 'academy-1' }))

    expect(res.status).toBe(404)
  })

  it('code 없으면 400', async () => {
    const { POST } = await import('../route')
    const res = await POST(makeRequest({ academyId: 'academy-1' }))
    expect(res.status).toBe(400)
  })
})
