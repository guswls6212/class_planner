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
} from "../apiSync";

describe("apiSync", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.fetch = mockFetch;
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
      syncStudentUpdate("user-1", "s-1", { name: "Updated" });
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
});
