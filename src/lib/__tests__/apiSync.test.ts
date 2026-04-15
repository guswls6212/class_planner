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
  syncSessionDelete,
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

    it("syncSessionDelete가 DELETE를 호출한다", () => {
      syncSessionDelete("user-1", "sess-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/sessions?id=sess-1"),
        expect.objectContaining({ method: "DELETE" })
      );
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
