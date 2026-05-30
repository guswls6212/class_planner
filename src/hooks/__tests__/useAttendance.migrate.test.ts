import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useAttendance } from "../useAttendance";

/**
 * Regression guard for the §15/§18 race-gap "attendance-migrate-409"
 * (uat-audit-findings-2026-05-30).
 *
 * 세션을 다른 요일/주로 이동하면 출결도 새 occurrence date 로 migrate 된다 (B move 정책, PR #550).
 * caller (schedule/page.tsx onAttendanceMigrate) 는 fire-and-forget 으로 호출하므로,
 * 데이터 무결성 책임은 migrateAttendance 의 결정적 분기 + local state 전이에 있다.
 *
 * 핵심 회귀 가드:
 *  1. 성공 시 oldDate 캐시 제거 + newDate 로 entries 이동 ("출결 N건 함께 이동").
 *  2. DUPLICATE_DATE 409 시 local state 를 건드리지 않아 원본 출결 보존 (데이터 손실 0).
 *  3. oldDate === newDate noop — 불필요한 네트워크 호출 없음.
 *  4. non-ok / success:false → FAIL, userId null → null.
 *
 * 모든 동작은 mock fetch 로 결정적. timing/waitForTimeout 없음.
 */

const userId = "user-mig-1";
const sessionId = "sess-mig-1";
const OLD_DATE = "2026-04-15";
const NEW_DATE = "2026-04-22";

// migrate 후 새 날짜에 따라온 출결 record (server 가 date 만 newDate 로 갱신해 반환)
function migratedRows(date: string) {
  return [
    { student_id: "stu-1", status: "present", notes: null, date },
    { student_id: "stu-2", status: "absent", notes: "지각 사유", date },
  ];
}

describe("useAttendance.migrateAttendance (race-gap: attendance-migrate-409)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("oldDate === newDate 면 네트워크 호출 없이 count 0 noop 을 반환한다", async () => {
    const { result } = renderHook(() => useAttendance(userId));

    let res: Awaited<ReturnType<typeof result.current.migrateAttendance>>;
    await act(async () => {
      res = await result.current.migrateAttendance(sessionId, OLD_DATE, OLD_DATE);
    });

    expect(res!).toEqual({ count: 0 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("userId 가 없으면 null 을 반환하고 호출하지 않는다", async () => {
    const { result } = renderHook(() => useAttendance(null));

    let res: Awaited<ReturnType<typeof result.current.migrateAttendance>>;
    await act(async () => {
      res = await result.current.migrateAttendance(sessionId, OLD_DATE, NEW_DATE);
    });

    expect(res!).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("성공 시: oldDate 출결을 newDate 로 옮기고 oldDate 캐시는 제거한다 (B move)", async () => {
    const { result } = renderHook(() => useAttendance(userId));

    // 사전: oldDate 에 출결이 fetch 되어 local state 에 존재하는 상황 재현.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: migratedRows(OLD_DATE) }),
    });
    await act(async () => {
      await result.current.fetchAttendance(sessionId, OLD_DATE);
    });
    expect(result.current.attendance[sessionId][OLD_DATE]["stu-1"].status).toBe("present");

    // migrate: server 가 date 를 newDate 로 갱신한 row 들을 반환.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: migratedRows(NEW_DATE) }),
    });
    let res: Awaited<ReturnType<typeof result.current.migrateAttendance>>;
    await act(async () => {
      res = await result.current.migrateAttendance(sessionId, OLD_DATE, NEW_DATE);
    });

    // 반환: 이동 건수 = 2건 (toast "출결 2건 함께 이동" 트리거).
    expect(res!).toEqual({ count: 2 });

    // POST /api/attendance/migrate 에 정확한 body 전달.
    const migrateCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes("/api/attendance/migrate"),
    );
    expect(migrateCall).toBeDefined();
    expect(JSON.parse(migrateCall![1].body)).toEqual({
      sessionId,
      oldDate: OLD_DATE,
      newDate: NEW_DATE,
    });

    // local state: oldDate 는 사라지고, newDate 에 옮겨진 출결이 보존된다.
    expect(result.current.attendance[sessionId][OLD_DATE]).toBeUndefined();
    expect(result.current.attendance[sessionId][NEW_DATE]["stu-1"].status).toBe("present");
    expect(result.current.attendance[sessionId][NEW_DATE]["stu-2"].status).toBe("absent");
  });

  it("성공 시: newDate 에 기존 entry 가 있어도 merge 로 보존된다", async () => {
    const { result } = renderHook(() => useAttendance(userId));

    // newDate 에 다른 학생(stu-9) 출결이 미리 존재 (충돌 아닌 별개 학생).
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ student_id: "stu-9", status: "late", notes: null, date: NEW_DATE }],
      }),
    });
    await act(async () => {
      await result.current.fetchAttendance(sessionId, NEW_DATE);
    });

    // migrate: stu-1 이 newDate 로 따라옴.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ student_id: "stu-1", status: "present", notes: null, date: NEW_DATE }],
      }),
    });
    await act(async () => {
      await result.current.migrateAttendance(sessionId, OLD_DATE, NEW_DATE);
    });

    // 기존 stu-9 와 새로 이동한 stu-1 모두 보존 (merge).
    expect(result.current.attendance[sessionId][NEW_DATE]["stu-9"].status).toBe("late");
    expect(result.current.attendance[sessionId][NEW_DATE]["stu-1"].status).toBe("present");
  });

  it("DUPLICATE_DATE 409: error 반환 + 원본 출결 보존 (데이터 손실 0)", async () => {
    const { result } = renderHook(() => useAttendance(userId));

    // 사전: oldDate 에 출결 존재.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: migratedRows(OLD_DATE) }),
    });
    await act(async () => {
      await result.current.fetchAttendance(sessionId, OLD_DATE);
    });

    // migrate: 대상 날짜에 이미 출결이 있어 server 가 409 + DUPLICATE_DATE 반환.
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: "이미 새 날짜에 출결 기록이 있습니다. 기존 기록 충돌로 이동 안 됨.",
        code: "DUPLICATE_DATE",
      }),
    });
    let res: Awaited<ReturnType<typeof result.current.migrateAttendance>>;
    await act(async () => {
      res = await result.current.migrateAttendance(sessionId, OLD_DATE, NEW_DATE);
    });

    // caller 의 "이미 출결 있음 — 이동 안 됨" warning toast 를 트리거하는 시그널.
    expect(res!).toEqual({ count: 0, error: "DUPLICATE_DATE" });

    // 데이터 무결성 핵심: 충돌 실패 시 local state 를 건드리지 않아 원본 출결이 그대로 남는다.
    expect(result.current.attendance[sessionId][OLD_DATE]["stu-1"].status).toBe("present");
    expect(result.current.attendance[sessionId][OLD_DATE]["stu-2"].status).toBe("absent");
    expect(result.current.attendance[sessionId][NEW_DATE]).toBeUndefined();
  });

  it("409 외 non-ok 응답 → FAIL 을 반환하고 local state 변경 없음", async () => {
    const { result } = renderHook(() => useAttendance(userId));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: migratedRows(OLD_DATE) }),
    });
    await act(async () => {
      await result.current.fetchAttendance(sessionId, OLD_DATE);
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: "출석 이동에 실패했습니다." }),
    });
    let res: Awaited<ReturnType<typeof result.current.migrateAttendance>>;
    await act(async () => {
      res = await result.current.migrateAttendance(sessionId, OLD_DATE, NEW_DATE);
    });

    expect(res!).toEqual({ count: 0, error: "FAIL" });
    // 원본 보존 — 서버 오류로 끝나도 출결 손실 없음.
    expect(result.current.attendance[sessionId][OLD_DATE]["stu-1"].status).toBe("present");
    expect(result.current.attendance[sessionId][NEW_DATE]).toBeUndefined();
  });

  it("ok 응답이지만 success:false → FAIL 을 반환한다", async () => {
    const { result } = renderHook(() => useAttendance(userId));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: "권한 없음" }),
    });
    let res: Awaited<ReturnType<typeof result.current.migrateAttendance>>;
    await act(async () => {
      res = await result.current.migrateAttendance(sessionId, OLD_DATE, NEW_DATE);
    });

    expect(res!).toEqual({ count: 0, error: "FAIL" });
  });

  it("성공이지만 migrate 된 row 0건 → count 0 (저장된 출결 없음 안내 경로)", async () => {
    const { result } = renderHook(() => useAttendance(userId));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    let res: Awaited<ReturnType<typeof result.current.migrateAttendance>>;
    await act(async () => {
      res = await result.current.migrateAttendance(sessionId, OLD_DATE, NEW_DATE);
    });

    // error 없이 count 0 — caller 는 "저장된 출결 없음 — 이동할 데이터 없음" info toast.
    expect(res!).toEqual({ count: 0 });
    expect(res!.error).toBeUndefined();
  });
});