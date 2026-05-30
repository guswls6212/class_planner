import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSignOut, mockClearUserData, mockClearActiveAcademy } = vi.hoisted(() => ({
  mockSignOut: vi.fn().mockResolvedValue({}),
  mockClearUserData: vi.fn(),
  mockClearActiveAcademy: vi.fn(),
}))

vi.mock('@/utils/supabaseClient', () => ({
  supabase: { auth: { signOut: mockSignOut } },
}))

vi.mock('@/lib/localStorageCrud', () => ({
  clearUserClassPlannerData: mockClearUserData,
  clearActiveAcademy: mockClearActiveAcademy,
  // pendingDeletes 모듈이 module-init 시점에 호출 — mock 누락 시 CI fail.
  getStorageKey: () => 'classPlannerData:test',
}))

// Replace window.location once at module level so jsdom allows it
const locationMock = {
  reload: vi.fn(),
  href: '',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
}
Object.defineProperty(window, 'location', {
  writable: true,
  value: locationMock,
})

import { signOut } from '../signOut'

// setupTests.ts replaces window.localStorage with a vi.fn() mock.
// We access it here so we can configure getItem/setItem/removeItem per test.
const ls = window.localStorage as unknown as Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
  vi.clearAllMocks()
  // Default: getItem returns null (no userId stored)
  ls.getItem.mockReturnValue(null)
  // Reset cookies
  document.cookie = 'onboarded=test'
  document.cookie = 'user_role=admin'
  document.cookie = 'active_academy_id=abc'
})

describe('signOut', () => {
  it('supabase.auth.signOut()을 호출한다', async () => {
    await signOut()
    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it('userId가 있으면 localStorage 데이터를 모두 정리한다', async () => {
    ls.getItem.mockReturnValue('user-123')
    await signOut()
    expect(mockClearUserData).toHaveBeenCalledWith('user-123')
    expect(mockClearActiveAcademy).toHaveBeenCalledWith('user-123')
    expect(ls.removeItem).toHaveBeenCalledWith('supabase_user_id')
  })

  it('userId가 없어도 정상 동작한다', async () => {
    ls.getItem.mockReturnValue(null)
    await signOut()
    expect(mockClearUserData).not.toHaveBeenCalled()
    expect(mockClearActiveAcademy).not.toHaveBeenCalled()
  })

  it('onboarded, user_role, active_academy_id 쿠키를 삭제한다', async () => {
    await signOut()
    expect(document.cookie).not.toContain('onboarded=test')
    expect(document.cookie).not.toContain('user_role=admin')
    expect(document.cookie).not.toContain('active_academy_id=abc')
  })

  it('supabase.auth.signOut() 실패해도 localStorage와 쿠키를 정리한다 (finally 보장)', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('network error'))
    ls.getItem.mockReturnValue('user-456')
    try {
      await signOut()
    } catch {
      // expected — supabase error propagates, finally still ran
    }
    expect(mockClearUserData).toHaveBeenCalledWith('user-456')
    expect(locationMock.reload).toHaveBeenCalled()
  })

  it('항상 window.location.reload()를 호출한다', async () => {
    await signOut()
    expect(locationMock.reload).toHaveBeenCalledOnce()
  })
})
