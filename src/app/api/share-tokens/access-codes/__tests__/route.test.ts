import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const { mockMembership, mockFrom } = vi.hoisted(() => ({
  mockMembership: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/resolveAcademyMembership', () => ({
  resolveAcademyMembership: mockMembership,
}))

vi.mock('@/lib/supabaseServiceRole', () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/accessCode', () => ({
  generateAccessCode: vi.fn((name: string) => `${name.slice(0, 2).padEnd(2, '_')}3A7B`),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { DELETE, POST } from '../route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStudentsFrom(table: string) {
  if (table !== 'students') return null
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: 'student-1', name: '홍길동' },
          { id: 'student-2', name: '김철수' },
        ],
        error: null,
      }),
    }),
  }
}

// ---------------------------------------------------------------------------
// POST — mode='create'
// ---------------------------------------------------------------------------

describe('POST /api/share-tokens/access-codes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('owner — mode=create → 코드 없는 학생에게 접속 코드를 생성하고 created 수를 반환한다', async () => {
    mockMembership.mockResolvedValue({ academyId: 'acad-1', role: 'owner' })

    // share_tokens.select is called twice across two from() invocations.
    // Hoist selectMock so it persists across from() calls.
    const shareTokensSelectMock = vi.fn()
    shareTokensSelectMock
      .mockReturnValueOnce({
        // call 1 (from first from()): existing student codes check
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        // call 2 (from second from()): DB collision check
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })
    const shareTokensInsertMock = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'student-1', name: '홍길동' },
                { id: 'student-2', name: '김철수' },
              ],
              error: null,
            }),
          }),
        }
      }
      if (table === 'share_tokens') {
        return {
          select: shareTokensSelectMock,
          insert: shareTokensInsertMock,
        }
      }
      return {}
    })

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'POST',
      body: JSON.stringify({ mode: 'create' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.created).toBe(2)
  })

  it('mode=create — 이미 코드가 있는 학생은 건너뛰고 나머지만 생성한다', async () => {
    mockMembership.mockResolvedValue({ academyId: 'acad-1', role: 'owner' })

    const insertMock = vi.fn().mockResolvedValue({ error: null })

    // Hoist selectMock so it persists across from() calls
    const shareTokensSelectMock = vi.fn()
    shareTokensSelectMock
      .mockReturnValueOnce({
        // call 1: existing student codes check — student-1 already has a code
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({
                data: [{ filter_student_id: 'student-1' }],
                error: null,
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        // call 2: DB collision check — no conflicts
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'student-1', name: '홍길동' },
                { id: 'student-2', name: '김철수' },
              ],
              error: null,
            }),
          }),
        }
      }
      if (table === 'share_tokens') {
        return {
          select: shareTokensSelectMock,
          insert: insertMock,
        }
      }
      return {}
    })

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'POST',
      body: JSON.stringify({ mode: 'create' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.created).toBe(1)
    const inserted = insertMock.mock.calls[0][0] as Array<{ filter_student_id: string }>
    expect(inserted).toHaveLength(1)
    expect(inserted[0].filter_student_id).toBe('student-2')
  })

  it('member 역할 → 403을 반환한다', async () => {
    mockMembership.mockResolvedValue({ academyId: 'acad-1', role: 'member' })

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'POST',
      body: JSON.stringify({ mode: 'create' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(403)
  })

  it('userId 없으면 400을 반환한다', async () => {
    const req = new NextRequest('http://localhost/api/share-tokens/access-codes', {
      method: 'POST',
      body: JSON.stringify({ mode: 'create' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('mode=renew — 기존 코드를 revoke한 뒤 전체 학생 코드를 생성한다', async () => {
    mockMembership.mockResolvedValue({ academyId: 'acad-1', role: 'owner' })

    const updateMock = vi.fn()
    const insertMock = vi.fn().mockResolvedValue({ error: null })

    // update chain: update → eq → not
    const updateChain = {
      eq: vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue({ error: null }),
      }),
    }
    updateMock.mockReturnValue(updateChain)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'student-1', name: '홍길동' },
                { id: 'student-2', name: '김철수' },
              ],
              error: null,
            }),
          }),
        }
      }
      if (table === 'share_tokens') {
        return {
          update: updateMock,
          // DB collision check: select → eq → in → is
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          insert: insertMock,
        }
      }
      return {}
    })

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'POST',
      body: JSON.stringify({ mode: 'renew' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.created).toBe(2)
    // revoke was called
    expect(updateMock).toHaveBeenCalledTimes(1)
    const [updatePayload] = updateMock.mock.calls[0]
    expect(updatePayload).toHaveProperty('revoked_at')
    // insert was called with all students
    expect(insertMock).toHaveBeenCalledTimes(1)
    const inserted = insertMock.mock.calls[0][0] as unknown[]
    expect(inserted).toHaveLength(2)
  })

  it('학생이 0명이면 insert 없이 created:0을 반환한다', async () => {
    mockMembership.mockResolvedValue({ academyId: 'acad-1', role: 'owner' })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      if (table === 'share_tokens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gt: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'POST',
      body: JSON.stringify({ mode: 'create' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.created).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe('DELETE /api/share-tokens/access-codes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('owner + studentId → 접속 코드를 revoke하고 200을 반환한다', async () => {
    mockMembership.mockResolvedValue({ academyId: 'acad-1', role: 'owner' })

    const notMock = vi.fn().mockResolvedValue({ error: null })
    const eqStudentMock = vi.fn().mockReturnValue({ not: notMock })
    const eqAcademyMock = vi.fn().mockReturnValue({ eq: eqStudentMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqAcademyMock })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'share_tokens') return { update: updateMock }
      return {}
    })

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'DELETE',
      body: JSON.stringify({ studentId: 'student-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(updateMock).toHaveBeenCalledTimes(1)
    const [updatePayload] = updateMock.mock.calls[0]
    expect(updatePayload).toHaveProperty('revoked_at')
  })

  it('studentId 없으면 400을 반환한다', async () => {
    mockMembership.mockResolvedValue({ academyId: 'acad-1', role: 'owner' })

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'DELETE',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)

    expect(res.status).toBe(400)
  })

  it('userId 없으면 400을 반환한다', async () => {
    const req = new NextRequest('http://localhost/api/share-tokens/access-codes', {
      method: 'DELETE',
      body: JSON.stringify({ studentId: 'student-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)

    expect(res.status).toBe(400)
  })

  it('member 역할 → 403을 반환한다', async () => {
    mockMembership.mockResolvedValue({ academyId: 'acad-1', role: 'member' })

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'DELETE',
      body: JSON.stringify({ studentId: 'student-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)

    expect(res.status).toBe(403)
  })

  it('resolveAcademyMembership 실패 → 401을 반환한다', async () => {
    mockMembership.mockRejectedValue(new Error('not found'))

    const req = new NextRequest('http://localhost/api/share-tokens/access-codes?userId=user-1', {
      method: 'DELETE',
      body: JSON.stringify({ studentId: 'student-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)

    expect(res.status).toBe(401)
  })
})
