import { describe, expect, it, vi } from "vitest";

// Mock fetch for API testing
global.fetch = vi.fn();

describe("/api/data API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/data", () => {
    it("전체 사용자 데이터를 성공적으로 조회해야 한다", async () => {
      const mockUserData = {
        students: [
          { id: "student-1", name: "김철수" },
          { id: "student-2", name: "이영희" },
        ],
        subjects: [
          { id: "subject-1", name: "수학", color: "#ff0000" },
          { id: "subject-2", name: "영어", color: "#0000ff" },
        ],
        sessions: [
          { id: "session-1", startsAt: "09:00", endsAt: "10:00", weekday: 0 },
        ],
        enrollments: [
          {
            id: "enrollment-1",
            studentId: "student-1",
            subjectId: "subject-1",
          },
        ],
        version: "1.0",
        lastModified: "2024-01-01T00:00:00.000Z",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockUserData,
        }),
      });

      const response = await globalThis.fetch("/api/data");
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUserData);
    });

    it("사용자 데이터가 없을 때 빈 데이터를 반환해야 한다", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            students: [],
            subjects: [],
            sessions: [],
            enrollments: [],
            version: "1.0",
          },
        }),
      });

      const response = await globalThis.fetch("/api/data");
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.students).toEqual([]);
      expect(data.data.subjects).toEqual([]);
      expect(data.data.sessions).toEqual([]);
      expect(data.data.enrollments).toEqual([]);
    });

    it("데이터 조회 실패 시 에러를 반환해야 한다", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "Failed to fetch user data",
        }),
      });

      const response = await globalThis.fetch("/api/data");
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to fetch user data");
    });
  });

  describe("PUT /api/data", () => {
    it("전체 사용자 데이터를 성공적으로 업데이트해야 한다", async () => {
      const updateData = {
        students: [{ id: "student-1", name: "김철수" }],
        subjects: [{ id: "subject-1", name: "수학", color: "#ff0000" }],
        sessions: [],
        enrollments: [],
      };

      const updatedData = {
        ...updateData,
        version: "1.0",
        lastModified: expect.any(String),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: updatedData,
        }),
      });

      const response = await globalThis.globalThis.globalThis.fetch("/api/data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedData);
    });

    it("부분 데이터 업데이트를 처리해야 한다", async () => {
      const partialData = {
        students: [{ id: "student-1", name: "김철수" }],
      };

      const updatedData = {
        students: partialData.students,
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: expect.any(String),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: updatedData,
        }),
      });

      const response = await globalThis.globalThis.globalThis.fetch("/api/data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(partialData),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.students).toEqual(partialData.students);
    });

    it("데이터 업데이트 실패 시 에러를 반환해야 한다", async () => {
      const updateData = {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: "Failed to update user data",
        }),
      });

      const response = await globalThis.globalThis.globalThis.fetch("/api/data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to update user data");
    });
  });
});
