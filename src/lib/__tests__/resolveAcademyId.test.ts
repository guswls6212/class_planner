import { describe, expect, it, vi } from "vitest";

const mockSingle = vi.fn();
const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
const mockEq = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock("../supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { resolveAcademyId } from "../resolveAcademyId";

describe("resolveAcademyId", () => {
  it("academy_members에서 academy_id를 반환한다", async () => {
    mockSingle.mockResolvedValue({
      data: { academy_id: "academy-123" },
      error: null,
    });

    const result = await resolveAcademyId("user-1");
    expect(result).toBe("academy-123");
    expect(mockFrom).toHaveBeenCalledWith("academy_members");
    expect(mockSelect).toHaveBeenCalledWith("academy_id");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("매핑이 없으면 에러를 던진다", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    await expect(resolveAcademyId("unknown-user")).rejects.toThrow(
      "사용자(unknown-user)에 매핑된 학원을 찾을 수 없습니다"
    );
  });
});
