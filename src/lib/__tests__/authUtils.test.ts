import { describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();

vi.mock("../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

import { getAccessToken } from "../authUtils";

describe("authUtils", () => {
  describe("getAccessToken", () => {
    it("세션이 있으면 access_token을 반환한다", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "test-token-123" } },
        error: null,
      });

      const token = await getAccessToken();
      expect(token).toBe("test-token-123");
    });

    it("세션이 없으면 null을 반환한다", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const token = await getAccessToken();
      expect(token).toBeNull();
    });

    it("에러가 발생하면 null을 반환한다", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: "auth error" },
      });

      const token = await getAccessToken();
      expect(token).toBeNull();
    });
  });
});
