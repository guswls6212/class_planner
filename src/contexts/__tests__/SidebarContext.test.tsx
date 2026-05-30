import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SidebarProvider, useSidebar } from '../SidebarContext'

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

function wrapper({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>
}

describe('SidebarContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('기본값은 false (collapsed)', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const { result } = renderHook(() => useSidebar(), { wrapper })
    expect(result.current.expanded).toBe(false)
  })

  it('localStorage에 "true" 저장돼 있으면 mount 직후 effect로 expanded=true', async () => {
    // Hydration-safe: 초기 렌더는 항상 false (SSR과 일치) → useEffect에서 localStorage 읽고 true로 업데이트
    localStorageMock.getItem.mockReturnValue('true')
    const { result } = renderHook(() => useSidebar(), { wrapper })
    await waitFor(() => expect(result.current.expanded).toBe(true))
  })

  it('toggle()이 expanded를 false→true로 전환', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const { result } = renderHook(() => useSidebar(), { wrapper })
    act(() => { result.current.toggle() })
    expect(result.current.expanded).toBe(true)
  })

  it('toggle()이 expanded를 true→false로 전환', async () => {
    localStorageMock.getItem.mockReturnValue('true')
    const { result } = renderHook(() => useSidebar(), { wrapper })
    // wait for mount-effect to apply localStorage value
    await waitFor(() => expect(result.current.expanded).toBe(true))
    act(() => { result.current.toggle() })
    expect(result.current.expanded).toBe(false)
  })

  it('toggle() 호출 시 localStorage.setItem("sidebar_expanded", "true") 호출', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const { result } = renderHook(() => useSidebar(), { wrapper })
    act(() => { result.current.toggle() })
    expect(localStorageMock.setItem).toHaveBeenCalledWith('sidebar_expanded', 'true')
  })

  it('toggle() 두 번 호출 시 false로 복귀, localStorage.setItem("sidebar_expanded", "false") 호출', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const { result } = renderHook(() => useSidebar(), { wrapper })
    act(() => { result.current.toggle() })
    act(() => { result.current.toggle() })
    expect(result.current.expanded).toBe(false)
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith('sidebar_expanded', 'false')
  })
})
