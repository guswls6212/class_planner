import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTour } from "../useTour";

/**
 * Regression guard — tour-content-mismatch race (role null / dbSync 전 자동 시작).
 *
 * race-gap (uat-audit-findings-2026-05-30 §16, MEMORY feedback_race_window_patterns.md
 * "2026-05-27 tour-content-mismatch 사고"):
 *   로그인 직후 useMyRole / DB tour state fetch 가 끝나기 전 투어가 자동 시작되면
 *   (a) role 미해결(null)→기본 owner 로 fallback 해 admin/member 에게 owner step 노출,
 *   (b) DB 에 완료 기록이 있어도 localStorage 가 비어 투어 재발동.
 *
 * 이 두 가드 (useTour.ts:173 `role === null` early-return, :175 `!dbSyncDone`
 * early-return) 가 회귀하면 무음 실패라 단위 회귀 테스트로 잠근다.
 *
 * 기존 src/hooks/__tests__/useTour.test.tsx 는 useMyRole 를 static role:"owner" 로
 * mock 해 이 두 가드를 한 번도 통과시키지 않는다 (role 이 절대 null 이 아니고
 * fetchTourState 가 즉시 resolve). 본 파일은 role 과 DB fetch 타이밍을 제어해
 * 가드 자체를 검증한다.
 */

// ── mutable role mock — 기존 test 의 static "owner" 와 달리 null → 해결 전환을 재현 ──
let mockRole: "owner" | "admin" | "member" | null = null;
vi.mock("@/hooks/useMyRole", () => ({
  useMyRole: () => ({
    role: mockRole,
    canManage: mockRole === "owner" || mockRole === "admin",
    isLoading: mockRole === null,
    academies: [],
    linkedTeacherId: null,
    adminCount: 0,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: { user: { id: "race-user" } },
    user: { id: "race-user" },
    loading: false,
  }),
}));

// ── deferred fetchTourState — DB sync 완료 타이밍을 test 가 직접 제어 ──
let resolveFetch: ((v: { coreAt: string | null; loginAt: string | null }) => void) | null =
  null;
const mockFetchTourState = vi.fn(
  () =>
    new Promise<{ coreAt: string | null; loginAt: string | null }>((res) => {
      resolveFetch = res;
    }),
);
const mockUpsertTourCompletion = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/tour/tourPersistence", () => ({
  fetchTourState: (...args: unknown[]) =>
    (mockFetchTourState as (...a: unknown[]) => unknown)(...args),
  upsertTourCompletion: (...args: unknown[]) =>
    (mockUpsertTourCompletion as (...a: unknown[]) => unknown)(...args),
}));

const CORE_KEY = "onboarding_completed_race-user";
const LOGIN_KEY = "onboarding_login_completed_race-user";

// per-key localStorage store — DB sync 가 채운 키를 후속 자동 시작 effect 가 읽도록.
let store: Record<string, string>;
const ls = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

/** deferred fetchTourState resolve + microtask flush — dbSyncDone=true 갱신 적용 */
async function resolveDbSync(value: { coreAt: string | null; loginAt: string | null }) {
  await act(async () => {
    resolveFetch?.(value);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useTour — tour-content-mismatch race guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRole = null;
    resolveFetch = null;
    store = {};
    ls.getItem.mockImplementation((k: string) => store[k] ?? null);
    ls.setItem.mockImplementation((k: string, v: string) => {
      store[k] = v;
    });
    mockFetchTourState.mockClear();
    mockUpsertTourCompletion.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("guard (a): role === null (useMyRole fetch 미완)", () => {
    it("role 미해결(null) 동안엔 1초 delay 가 지나도 자동 시작하지 않는다", async () => {
      // DB 는 미완료 (빈 상태) — role 가드만 격리 검증하려고 dbSync 는 먼저 완료시킴
      const { result } = renderHook(() => useTour());
      await resolveDbSync({ coreAt: null, loginAt: null });

      // role 이 아직 null — auto-start effect 의 `if (isLoggedIn && role === null) return;`
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      expect(result.current.isActive).toBe(false);
    });

    it("role 이 member 로 해결된 뒤엔 member 전용 step 만 노출 (owner students/subjects/teachers step 노출 X)", async () => {
      const { result, rerender } = renderHook(() => useTour());
      await resolveDbSync({ coreAt: null, loginAt: null });

      // role null 동안 자동 시작 안 됨 확인
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });
      expect(result.current.isActive).toBe(false);

      // role 해결 (member) → effect 재실행 → 이제 가드 통과, member step 으로 자동 시작
      mockRole = "member";
      rerender();
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      expect(result.current.isActive).toBe(true);

      // member role 의 activeSteps 에는 owner 전용 step (students/subjects/teachers/
      // schedule/schedule-grid/export-admin) 이 없어야 한다 — content mismatch 방지 핵심.
      // step.id 들을 순회해 owner 전용 id 가 없음을 확인.
      const ownerOnlyIds = [
        "students",
        "subjects",
        "teachers",
        "schedule",
        "schedule-grid",
        "export-admin",
      ];
      const seenIds: string[] = [];
      const total = result.current.totalSteps;
      for (let i = 0; i < total; i++) {
        const id = result.current.step?.id;
        if (id) seenIds.push(id);
        act(() => result.current.next());
      }
      for (const ownerId of ownerOnlyIds) {
        expect(seenIds).not.toContain(ownerId);
      }
      // member 전용 step (export-teacher) 은 노출돼야 한다
      expect(seenIds).toContain("export-teacher");
    });
  });

  describe("guard (b): dbSyncDone === false (DB tour state fetch 미완)", () => {
    it("DB fetch 가 resolve 되기 전엔 1초 delay 가 지나도 자동 시작하지 않는다", async () => {
      mockRole = "owner"; // role 가드는 통과시켜 dbSync 가드만 격리
      const { result } = renderHook(() => useTour());

      // fetchTourState 가 아직 pending — dbSyncDone=false
      // delay 를 충분히 advance 해도 `if (isLoggedIn && !dbSyncDone) return;` 가 막아야 함
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.isActive).toBe(false);
      expect(mockFetchTourState).toHaveBeenCalledWith("race-user");
    });

    it("DB 에 core 완료 기록이 있고 localStorage 가 비었을 때: dbSync 가 localStorage 를 채운 뒤 자동 시작을 skip 한다 (재발동 방지)", async () => {
      mockRole = "owner";
      const DB_TS = "2026-01-10T00:00:00.000Z";
      const { result } = renderHook(() => useTour());

      // dbSync 완료 전: store 비어있음, 자동 시작 안 됨
      expect(store[CORE_KEY]).toBeUndefined();

      // DB 에 core 완료 기록 존재 (localStorage 는 비어있던 cross-device 시나리오)
      await resolveDbSync({ coreAt: DB_TS, loginAt: DB_TS });

      // dbSync 가 localStorage 를 DB 값으로 채움
      expect(store[CORE_KEY]).toBe(DB_TS);
      expect(store[LOGIN_KEY]).toBe(DB_TS);

      // 가드 해제 후 자동 시작 effect 재실행 — coreDone 이 채워졌으므로 startIndex=null → 자동 시작 X
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      expect(result.current.isActive).toBe(false);
    });

    it("DB 에 기록이 없으면(신규 사용자): dbSync 완료 후 정상적으로 자동 시작한다", async () => {
      mockRole = "owner";
      const { result } = renderHook(() => useTour());

      // dbSync pending 동안 자동 시작 안 됨
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });
      expect(result.current.isActive).toBe(false);

      // DB 빈 상태로 resolve → dbSyncDone=true, localStorage 도 비어있음
      await resolveDbSync({ coreAt: null, loginAt: null });
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      // 가드 모두 통과 + core 미완료 → 자동 시작
      expect(result.current.isActive).toBe(true);
      expect(result.current.currentStep).toBe(0);
    });
  });
});