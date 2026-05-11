import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  syncStudentCreate,
  syncStudentUpdate,
  syncStudentDelete,
  syncSubjectCreate,
  syncSubjectUpdate,
  syncSubjectDelete,
  syncEnrollmentCreate,
  syncEnrollmentDelete,
  syncSessionCreate,
  syncSessionUpdate,
  syncSessionUpdateAsync,
  syncSessionDelete,
  syncTeacherCreate,
  syncTeacherUpdate,
  getContextLabel,
  getLastFailureContext,
  __resetSyncStateForTests,
} from "../apiSync";
import { showToast } from "../toast";

vi.mock("../toast", () => ({
  showToast: vi.fn(),
  showError: vi.fn(),
}));

describe("apiSync", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.fetch = mockFetch;
    __resetSyncStateForTests();
    vi.mocked(showToast).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("anonymous user (userId=null)", () => {
    it("syncStudentCreate는 fetch를 호출하지 않는다", () => {
      syncStudentCreate(null, { name: "test" });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("syncSubjectDelete는 fetch를 호출하지 않는다", () => {
      syncSubjectDelete(null, "id-1");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("syncSessionCreate는 fetch를 호출하지 않는다", () => {
      syncSessionCreate(null, { weekday: 1, startsAt: "09:00", endsAt: "10:00" } as any);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Students", () => {
    it("syncStudentCreate가 POST /api/students를 호출한다", () => {
      syncStudentCreate("user-1", { name: "Kim", gender: "male" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/students?userId=user-1"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("syncStudentUpdate가 PUT /api/students/:id를 호출한다", () => {
      syncStudentUpdate("user-1", "s-1", { name: "수정" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/students/s-1?userId=user-1"),
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("syncStudentDelete가 DELETE /api/students/:id를 호출한다", () => {
      syncStudentDelete("user-1", "s-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/students/s-1?userId=user-1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("Subjects", () => {
    it("syncSubjectCreate가 POST /api/subjects를 호출한다", () => {
      syncSubjectCreate("user-1", { name: "Math", color: "#FF0000" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/subjects?userId=user-1"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("syncSubjectUpdate가 PUT /api/subjects/:id를 호출한다", () => {
      syncSubjectUpdate("user-1", "sub-1", { name: "English" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/subjects/sub-1"),
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("syncSubjectDelete가 DELETE를 호출한다", () => {
      syncSubjectDelete("user-1", "sub-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/subjects/sub-1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("Enrollments", () => {
    it("syncEnrollmentCreate가 POST를 호출한다", () => {
      syncEnrollmentCreate("user-1", { studentId: "s-1", subjectId: "sub-1" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/enrollments?userId=user-1"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("syncEnrollmentDelete가 DELETE를 호출한다", () => {
      syncEnrollmentDelete("user-1", "e-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/enrollments?id=e-1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("Sessions", () => {
    it("syncSessionCreate가 POST를 호출한다", () => {
      syncSessionCreate("user-1", {
        weekday: 1,
        startsAt: "09:00",
        endsAt: "10:00",
        enrollmentIds: [],
      } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/sessions?userId=user-1"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("syncSessionUpdate가 PUT를 호출한다", () => {
      syncSessionUpdate("user-1", "sess-1", { weekday: 2 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/sessions/sess-1"),
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("syncSessionUpdate body에 teacherId가 포함된다", () => {
      const teacherId = "teacher-uuid-1";
      syncSessionUpdate("user-1", "sess-1", {
        weekday: 1,
        startsAt: "09:00",
        endsAt: "10:00",
        teacherId,
      } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/sessions/sess-1"),
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining(teacherId),
        })
      );
    });

    it("syncSessionUpdate에 teacherId가 없으면 body에도 없다", () => {
      syncSessionUpdate("user-1", "sess-1", { weekday: 2 });
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      expect(body).not.toHaveProperty("teacherId");
    });

    it("syncSessionDelete가 DELETE를 호출한다", () => {
      syncSessionDelete("user-1", "sess-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/sessions?id=sess-1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("syncSessionUpdateAsync 가 PUT /api/sessions/:id/position?userId=... 으로 호출된다 (회귀: userId 누락→400)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await syncSessionUpdateAsync("user-1", "sess-1", {
        weekday: 2,
        startsAt: "10:00",
        endsAt: "11:00",
        yPosition: 1,
      } as any);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("/api/sessions/sess-1/position");
      expect(callArgs[0]).toContain("userId=user-1");
      expect(callArgs[1]).toMatchObject({ method: "PUT" });
      const body = JSON.parse(callArgs[1].body as string);
      expect(body).toEqual({
        weekday: 2,
        time: "10:00",
        endTime: "11:00",
        yPosition: 1,
      });
    });

    it("syncSessionUpdateAsync — userId null이면 fetch 미호출 + false 반환", async () => {
      const ok = await syncSessionUpdateAsync(null, "sess-1", { weekday: 2 } as any);
      expect(ok).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("syncSessionUpdateAsync — userId에 특수문자 있으면 인코딩된다", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await syncSessionUpdateAsync("user with space", "sess-1", {
        weekday: 1,
        startsAt: "09:00",
        endsAt: "10:00",
      } as any);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("userId=user%20with%20space");
    });
  });

  describe("Teachers — profile fields", () => {
    it("syncTeacherCreate body에 profile 필드(email/phone/role/notes)가 포함된다", () => {
      syncTeacherCreate("user-1", {
        name: "김강사",
        color: "#FF0000",
        email: "kim@test.com",
        phone: "010-1234-5678",
        role: "admin",
        notes: "메모",
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.email).toBe("kim@test.com");
      expect(body.phone).toBe("010-1234-5678");
      expect(body.role).toBe("admin");
      expect(body.notes).toBe("메모");
    });

    it("syncTeacherUpdate body에 profile 필드가 포함된다", () => {
      syncTeacherUpdate("user-1", "t-1", {
        email: "updated@test.com",
        notes: "updated notes",
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.email).toBe("updated@test.com");
      expect(body.notes).toBe("updated notes");
    });
  });

  describe("error handling", () => {
    it("fetch 실패 시 에러를 삼키고 crash하지 않는다", () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      expect(() => syncStudentCreate("user-1", { name: "test" })).not.toThrow();
    });

    it("non-ok 응답 시 에러를 삼키고 crash하지 않는다", () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "server error" }),
      });
      expect(() => syncStudentCreate("user-1", { name: "test" })).not.toThrow();
    });
  });

  describe("silent failure 가시성 (Phase D)", () => {
    it("첫 실패 즉시 warning 토스트 1회 노출 (silent failure 방지)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "server error" }),
      });
      syncStudentCreate("user-1", { name: "test" });
      // fire-and-forget이므로 microtask 한 번 양보
      await new Promise((r) => setTimeout(r, 0));
      const calls = vi.mocked(showToast).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0]?.[0]).toBe("warning");
      expect(calls[0]?.[1]).toMatch(/지연|로컬은 안전/);
    });

    it("같은 세션에서 첫 실패 토스트는 1회만 (재실패해도 중복 표시 안 함)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "server error" }),
      });
      syncStudentCreate("user-1", { name: "test1" });
      await new Promise((r) => setTimeout(r, 0));
      syncStudentCreate("user-1", { name: "test2" });
      await new Promise((r) => setTimeout(r, 0));
      // warning 토스트는 1회만
      const warningCalls = vi
        .mocked(showToast)
        .mock.calls.filter((c) => c[0] === "warning");
      expect(warningCalls.length).toBe(1);
    });

    it("3회 누적 실패 시 error 토스트로 격상", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "server error" }),
      });
      // 3회 실패 시뮬레이션 — 각각 별도 호출
      syncStudentCreate("user-1", { name: "t1" });
      await new Promise((r) => setTimeout(r, 0));
      syncStudentCreate("user-1", { name: "t2" });
      await new Promise((r) => setTimeout(r, 0));
      syncStudentCreate("user-1", { name: "t3" });
      await new Promise((r) => setTimeout(r, 0));
      const errorCalls = vi
        .mocked(showToast)
        .mock.calls.filter((c) => c[0] === "error");
      expect(errorCalls.length).toBe(1);
      expect(errorCalls[0]?.[1]).toMatch(/3회 실패|인터넷 연결/);
    });

    it("실패 후 성공 시 success 복구 토스트 1회 + 카운터 리셋", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "server error" }),
      });
      syncStudentCreate("user-1", { name: "fail" });
      await new Promise((r) => setTimeout(r, 0));
      // 다음 호출은 성공
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      syncStudentCreate("user-1", { name: "ok" });
      await new Promise((r) => setTimeout(r, 0));
      const successCalls = vi
        .mocked(showToast)
        .mock.calls.filter((c) => c[0] === "success");
      expect(successCalls.length).toBe(1);
      expect(successCalls[0]?.[1]).toMatch(/복구/);
    });

    it("실패 토스트가 아직 안 떴을 때 성공해도 복구 토스트는 안 띄움", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      syncStudentCreate("user-1", { name: "ok" });
      await new Promise((r) => setTimeout(r, 0));
      const successCalls = vi
        .mocked(showToast)
        .mock.calls.filter((c) => c[0] === "success");
      expect(successCalls.length).toBe(0);
    });
  });

  describe("Outbox 통합 — 모든 entity (회귀: 손실 방지)", () => {
    it("syncStudentCreate가 POST URL/method/body를 fetch에 정상 전달", () => {
      syncStudentCreate("user-1", { name: "Kim" });
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/api/students?userId=user-1");
      expect(call[1]).toMatchObject({ method: "POST" });
      const body = JSON.parse(call[1].body as string);
      expect(body.name).toBe("Kim");
    });

    it("syncSubjectUpdate / syncSubjectDelete URL+method 검증", () => {
      syncSubjectUpdate("user-1", "sub-1", { name: "수학", color: "#fff" });
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("/api/subjects/sub-1?userId=user-1"),
        expect.objectContaining({ method: "PUT" }),
      );
      mockFetch.mockClear();
      syncSubjectDelete("user-1", "sub-1");
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("/api/subjects/sub-1?userId=user-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("syncEnrollmentCreate / syncEnrollmentDelete URL+method 검증", () => {
      syncEnrollmentCreate("user-1", { studentId: "s1", subjectId: "sub1" });
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("/api/enrollments?userId=user-1"),
        expect.objectContaining({ method: "POST" }),
      );
      mockFetch.mockClear();
      syncEnrollmentDelete("user-1", "e-1");
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("/api/enrollments?id=e-1&userId=user-1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("syncTeacherSubjectAdd / Remove (M:N) URL+body 검증", async () => {
      const { syncTeacherSubjectAdd, syncTeacherSubjectRemove } = await import(
        "../apiSync"
      );
      syncTeacherSubjectAdd("user-1", "t-1", "sub-1");
      const addCall = mockFetch.mock.calls[0];
      expect(addCall[0]).toContain("/api/teacher-subjects?userId=user-1");
      expect(addCall[1].method).toBe("POST");
      expect(JSON.parse(addCall[1].body as string)).toEqual({
        teacherId: "t-1",
        subjectId: "sub-1",
      });

      mockFetch.mockClear();
      syncTeacherSubjectRemove("user-1", "t-1", "sub-1");
      const removeCall = mockFetch.mock.calls[0];
      expect(removeCall[1].method).toBe("DELETE");
      expect(JSON.parse(removeCall[1].body as string)).toEqual({
        teacherId: "t-1",
        subjectId: "sub-1",
      });
    });
  });

  describe("getContextLabel — 사용자 친화 라벨", () => {
    it("session:create → '수업 추가'", () => {
      expect(getContextLabel("session:create")).toBe("수업 추가");
    });

    it("session:update → '수업 위치 변경'", () => {
      expect(getContextLabel("session:update")).toBe("수업 위치 변경");
    });

    it("student:delete → '학생 삭제'", () => {
      expect(getContextLabel("student:delete")).toBe("학생 삭제");
    });

    it("매핑 없는 context → fallback '변경'", () => {
      expect(getContextLabel("unknown:thing")).toBe("변경");
    });
  });

  describe("getLastFailureContext — 토스트/indicator에 실패 종류 노출", () => {
    it("idle 상태 → null", () => {
      expect(getLastFailureContext()).toBeNull();
    });

    it("실패 시 latest context 기록", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "boom" }),
      });
      syncSessionCreate("user-1", { id: "s1" } as any);
      await new Promise((r) => setTimeout(r, 10));
      expect(getLastFailureContext()).toBe("session:create");
    });

    it("성공 후 null로 reset", async () => {
      // 첫 실패
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
      syncSessionCreate("user-1", { id: "s1" } as any);
      // fire-and-forget fetch resolve + onSyncFailure state update 대기.
      // setTimeout(10ms) 고정은 CI fresh 환경(Ubuntu)에서 timing-dependent flaky.
      // vi.waitFor로 retry pattern — 최대 500ms까지 polling.
      await vi.waitFor(() => {
        expect(getLastFailureContext()).toBe("session:create");
      }, { timeout: 500, interval: 10 });
      // 다음 호출 성공
      mockFetch.mockResolvedValueOnce({ ok: true });
      syncStudentCreate("user-1", { id: "stu-1", name: "A" } as any);
      await vi.waitFor(() => {
        expect(getLastFailureContext()).toBeNull();
      }, { timeout: 500, interval: 10 });
    });
  });
});
