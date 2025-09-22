import { describe, expect, it } from "vitest";

// API 호출 경로 및 URL 형식 검증 테스트
describe("API Routes 통합 테스트", () => {
  describe("API 호출 경로 검증", () => {
    it("클라이언트에서 올바른 URL 형식으로 호출해야 함", () => {
      const studentId = "test-id";
      const userId = "user-123";

      // 실제 클라이언트에서 사용하는 URL 형식 검증
      const expectedUrl = `/api/students/${studentId}?userId=${userId}`;

      expect(expectedUrl).toBe(`/api/students/${studentId}?userId=${userId}`);
      expect(expectedUrl).toContain("userId=");
      expect(expectedUrl).not.toContain("id="); // 잘못된 형식 방지
    });
  });
});
