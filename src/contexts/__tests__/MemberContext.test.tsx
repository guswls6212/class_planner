/**
 * MemberContext — S-1.5 race window 회귀 가드.
 *
 * 검증 포인트:
 *  - me=null 응답 시 sessionStorage 에 cache 저장하지 않음 (race 결과 영속화 차단)
 *  - me=present 응답 시 cache 저장
 *  - class-planner:academy-changed 이벤트 발화 시 cache 무효화 + 재fetch
 *
 * Background:
 *  - onboarding API 성공 직후 /students→/schedule 이동 시 첫 /api/members 응답에
 *    me 누락(read-after-write race) → canManage:false 영속화 → FAB 사라짐 + 모달
 *    안 열림. 새로고침 시에만 해결되던 증상.
 *  - 본 PR: academy-changed listener 추가 + me=null cache write skip.
 */

import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemberProvider, useMemberContext } from "../MemberContext";
import { getActiveAcademyId, setActiveAcademyId } from "@/lib/localStorageCrud";

const CACHE_KEY_PREFIX = "useMyRole_v1_";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1", email: "u@test.local" } },
    loading: false,
  }),
}));

vi.mock("@/lib/localStorageCrud", () => ({
  getActiveAcademyId: vi.fn(() => null),
  setActiveAcademyId: vi.fn(),
}));

// fetch + sessionStorage spy — 매 test 새 instance.
let fetchSpy: ReturnType<typeof vi.fn>;
const sessionStorageMock = {
  store: new Map<string, string>(),
  getItem: vi.fn((k: string) => sessionStorageMock.store.get(k) ?? null),
  setItem: vi.fn((k: string, v: string) => {
    sessionStorageMock.store.set(k, v);
  }),
  removeItem: vi.fn((k: string) => {
    sessionStorageMock.store.delete(k);
  }),
  clear: vi.fn(() => sessionStorageMock.store.clear()),
};

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  configurable: true,
});

function Probe({ onSnapshot }: { onSnapshot: (d: unknown) => void }) {
  const data = useMemberContext();
  onSnapshot(data);
  return null;
}

function mockMembersResponse(members: unknown[]) {
  return {
    ok: true,
    json: async () => ({ data: members }),
  };
}

function mockAcademiesMineEmpty() {
  return {
    ok: true,
    json: async () => ({ academies: [] }),
  };
}

describe("MemberContext — S-1.5 race window 회귀 가드", () => {
  beforeEach(() => {
    sessionStorageMock.store.clear();
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
    fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/members")) {
        return mockMembersResponse([]); // default: me 없음
      }
      if (u.includes("/api/academies/mine")) {
        return mockAcademiesMineEmpty();
      }
      if (u.includes("/api/auth/set-role-cookie")) {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: false, json: async () => ({}) };
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
    vi.mocked(getActiveAcademyId).mockReturnValue(null);
    vi.mocked(setActiveAcademyId).mockClear();
  });

  it("me=null 응답 시 sessionStorage 에 cache 저장하지 않아야 한다 (race 결과 영속화 차단)", async () => {
    type Snap = { isLoading: boolean; canManage: boolean };
    let lastSnapshot: Snap = { isLoading: true, canManage: false };

    render(
      <MemberProvider>
        <Probe
          onSnapshot={(d) => {
            lastSnapshot = d as typeof lastSnapshot;
          }}
        />
      </MemberProvider>,
    );

    // fetch 호출 + isLoading false 까지 대기
    await waitFor(() => {
      expect(lastSnapshot?.isLoading).toBe(false);
    });

    expect(lastSnapshot?.canManage).toBe(false);
    // 핵심 검증: me=null 응답 시 sessionStorage.setItem 으로 cache write 안 됨
    const setItemCalls = sessionStorageMock.setItem.mock.calls.filter(
      (c) => String(c[0]).startsWith(CACHE_KEY_PREFIX),
    );
    expect(setItemCalls.length).toBe(0);
  });

  it("me=present 응답 시 cache 저장 + canManage 반영", async () => {
    fetchSpy.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/members")) {
        return mockMembersResponse([
          {
            userId: "user-1",
            role: "owner",
            linkedTeacherId: null,
            linkedTeacherName: null,
            linkedTeacherColor: null,
          },
        ]);
      }
      if (u.includes("/api/academies/mine")) return mockAcademiesMineEmpty();
      if (u.includes("/api/auth/set-role-cookie"))
        return { ok: true, json: async () => ({}) };
      return { ok: false, json: async () => ({}) };
    });

    type Snap = { isLoading: boolean; canManage: boolean; role: string | null };
    let lastSnapshot: Snap = { isLoading: true, canManage: false, role: null };

    render(
      <MemberProvider>
        <Probe
          onSnapshot={(d) => {
            lastSnapshot = d as typeof lastSnapshot;
          }}
        />
      </MemberProvider>,
    );

    await waitFor(() => {
      expect(lastSnapshot?.canManage).toBe(true);
    });
    expect(lastSnapshot?.role).toBe("owner");

    // cache write 호출됐는지 확인
    const setItemCalls = sessionStorageMock.setItem.mock.calls.filter(
      (c) => String(c[0]).startsWith(CACHE_KEY_PREFIX),
    );
    expect(setItemCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("class-planner:academy-changed 이벤트 발화 시 cache 무효화 + 재fetch", async () => {
    // 첫 fetch: me 없음 (race)
    let callCount = 0;
    fetchSpy.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/members")) {
        callCount += 1;
        if (callCount === 1) {
          return mockMembersResponse([]); // race — me 누락
        }
        // 두 번째 fetch부터: me 발견 (academy_members commit 완료)
        return mockMembersResponse([
          {
            userId: "user-1",
            role: "owner",
            linkedTeacherId: null,
            linkedTeacherName: null,
            linkedTeacherColor: null,
          },
        ]);
      }
      if (u.includes("/api/academies/mine")) return mockAcademiesMineEmpty();
      if (u.includes("/api/auth/set-role-cookie"))
        return { ok: true, json: async () => ({}) };
      return { ok: false, json: async () => ({}) };
    });

    type Snap = { canManage: boolean; role: string | null };
    let lastSnapshot: Snap = { canManage: false, role: null };

    render(
      <MemberProvider>
        <Probe
          onSnapshot={(d) => {
            lastSnapshot = d as typeof lastSnapshot;
          }}
        />
      </MemberProvider>,
    );

    // 1st fetch 완료 + canManage false (race)
    await waitFor(() => {
      expect(lastSnapshot?.canManage).toBe(false);
    });

    // 이벤트 발화 → re-fetch trigger
    act(() => {
      window.dispatchEvent(new CustomEvent("class-planner:academy-changed"));
    });

    // 2nd fetch 완료 + canManage true (academy_members commit 후)
    await waitFor(() => {
      expect(lastSnapshot?.canManage).toBe(true);
    });
    expect(lastSnapshot?.role).toBe("owner");

    // 이벤트 핸들러가 sessionStorage.removeItem 호출 (cache 무효화)
    const removeItemCalls = sessionStorageMock.removeItem.mock.calls.filter(
      (c) => String(c[0]) === `${CACHE_KEY_PREFIX}user-1`,
    );
    expect(removeItemCalls.length).toBe(1);
  });

  // ── L1: stale active_academy reconcile (teardown→relogin 무한 스피너 root fix) ──
  // 멤버십에 없는 학원을 active_academy 가 가리키면 getStorageKey() 가 엉뚱한 scoped
  // 데이터를 읽어 useGlobalDataInitialization 가 upload-local 재진입 루프 → 무한 스피너.
  // MemberProvider 가 /api/academies/mine 멤버십과 대조해 stale 이면 유효 학원으로 교체.
  type Academy = { id: string; name: string; slug: string | null; role: string };

  function mockAcademiesMine(academies: Academy[]) {
    return { ok: true, json: async () => ({ academies }) };
  }

  function setupOwnerWithAcademies(academies: Academy[]) {
    fetchSpy.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/members")) {
        return mockMembersResponse([
          {
            userId: "user-1",
            role: "owner",
            linkedTeacherId: null,
            linkedTeacherName: null,
            linkedTeacherColor: null,
          },
        ]);
      }
      if (u.includes("/api/academies/mine")) return mockAcademiesMine(academies);
      if (u.includes("/api/auth/set-role-cookie"))
        return { ok: true, json: async () => ({}) };
      return { ok: false, json: async () => ({}) };
    });
  }

  it("active_academy 가 멤버십에 없는 stale id 면 유효 학원으로 reconcile", async () => {
    const validId = `valid_${Date.now()}`;
    vi.mocked(getActiveAcademyId).mockReturnValue("stale-deleted-academy");
    setupOwnerWithAcademies([{ id: validId, name: "헬로", slug: null, role: "owner" }]);

    let snap: { canManage: boolean } = { canManage: false };
    render(
      <MemberProvider>
        <Probe onSnapshot={(d) => { snap = d as typeof snap; }} />
      </MemberProvider>,
    );

    await waitFor(() => { expect(snap.canManage).toBe(true); });
    await waitFor(() => {
      expect(vi.mocked(setActiveAcademyId)).toHaveBeenCalledWith("user-1", validId);
    });
  });

  it("active_academy 가 유효 멤버십이면 reconcile 안 함 (멋대로 학원 전환 X)", async () => {
    const a1 = `academy_a_${Date.now()}`;
    const a2 = `academy_b_${Date.now()}`;
    vi.mocked(getActiveAcademyId).mockReturnValue(a2); // 이미 유효한 학원 선택중
    setupOwnerWithAcademies([
      { id: a1, name: "A", slug: null, role: "owner" },
      { id: a2, name: "B", slug: null, role: "admin" },
    ]);

    let snap: { canManage: boolean } = { canManage: false };
    render(
      <MemberProvider>
        <Probe onSnapshot={(d) => { snap = d as typeof snap; }} />
      </MemberProvider>,
    );

    await waitFor(() => { expect(snap.canManage).toBe(true); });
    // academies/mine fetch 완료까지 대기 후 setActiveAcademyId 미호출 확인
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some((c) => String(c[0]).includes("/api/academies/mine")),
      ).toBe(true);
    });
    expect(vi.mocked(setActiveAcademyId)).not.toHaveBeenCalled();
  });

  it("active_academy 미설정이면 list[0](owner 우선)로 초기화 (기존 동작 유지)", async () => {
    const firstId = `first_${Date.now()}`;
    vi.mocked(getActiveAcademyId).mockReturnValue(null);
    setupOwnerWithAcademies([{ id: firstId, name: "A", slug: null, role: "owner" }]);

    let snap: { canManage: boolean } = { canManage: false };
    render(
      <MemberProvider>
        <Probe onSnapshot={(d) => { snap = d as typeof snap; }} />
      </MemberProvider>,
    );

    await waitFor(() => { expect(snap.canManage).toBe(true); });
    await waitFor(() => {
      expect(vi.mocked(setActiveAcademyId)).toHaveBeenCalledWith("user-1", firstId);
    });
  });
});
