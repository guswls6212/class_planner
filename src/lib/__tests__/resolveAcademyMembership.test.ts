import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAcademyMembership } from "../resolveAcademyMembership";

vi.mock("../supabaseServiceRole", () => ({
  getServiceRoleClient: vi.fn(),
}));

import { getServiceRoleClient } from "../supabaseServiceRole";

describe("resolveAcademyMembership", () => {
  const mockClient = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
  });

  it("academyId와 role을 반환한다", async () => {
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { academy_id: "academy-123", role: "owner" },
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await resolveAcademyMembership("user-123");
    expect(result).toEqual({ academyId: "academy-123", role: "owner" });
  });

  it("academy가 없으면 에러를 던진다", async () => {
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("not found"),
            }),
          }),
        }),
      }),
    });

    await expect(resolveAcademyMembership("user-xyz")).rejects.toThrow(
      "온보딩이 완료되지 않은 사용자"
    );
  });
});
