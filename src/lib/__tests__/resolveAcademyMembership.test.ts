import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetServiceRoleClient } = vi.hoisted(() => ({
  mockGetServiceRoleClient: vi.fn(),
}));

vi.mock("../supabaseServiceRole", () => ({
  getServiceRoleClient: mockGetServiceRoleClient,
}));

import { resolveAcademyMembership } from "../resolveAcademyMembership";

describe("resolveAcademyMembership", () => {
  const mockSingle = vi.fn();
  const mockEqAcademy = vi.fn();
  const mockEqUser = vi.fn();
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();

  const buildChain = () => {
    mockSelect.mockReturnValue({ eq: mockEqUser });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockGetServiceRoleClient.mockReturnValue({ from: mockFrom });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    buildChain();
  });

  it("단일 학원 — academyId와 role을 반환한다", async () => {
    mockEqUser.mockReturnValue({
      data: [{ academy_id: "academy-1", role: "member" }],
      error: null,
    });

    const result = await resolveAcademyMembership("user-1");
    expect(result).toEqual({ academyId: "academy-1", role: "member" });
  });

  it("여러 학원 — owner 우선순위로 반환한다", async () => {
    mockEqUser.mockReturnValue({
      data: [
        { academy_id: "academy-member", role: "member" },
        { academy_id: "academy-admin", role: "admin" },
        { academy_id: "academy-owner", role: "owner" },
      ],
      error: null,
    });

    const result = await resolveAcademyMembership("user-multi");
    expect(result).toEqual({ academyId: "academy-owner", role: "owner" });
  });

  it("preferredAcademyId가 유효하면 해당 학원을 반환한다", async () => {
    // First call: preferred academy lookup (with .eq chain for academy_id + .single)
    const preferredSingle = vi.fn().mockResolvedValue({
      data: { academy_id: "preferred-acad", role: "admin" },
    });
    const preferredEqAcademy = vi.fn().mockReturnValue({ single: preferredSingle });
    const preferredEqUser = vi.fn().mockReturnValue({ eq: preferredEqAcademy });

    mockSelect.mockReturnValue({ eq: preferredEqUser });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockGetServiceRoleClient.mockReturnValue({ from: mockFrom });

    const result = await resolveAcademyMembership("user-2", "preferred-acad");
    expect(result).toEqual({ academyId: "preferred-acad", role: "admin" });
  });

  it("preferredAcademyId가 멤버가 아닌 학원이면 우선순위 정렬로 fallback한다", async () => {
    let callCount = 0;

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // preferred lookup — returns no data
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        // fallback: all memberships
        return {
          eq: vi.fn().mockReturnValue({
            data: [
              { academy_id: "academy-owner", role: "owner" },
              { academy_id: "academy-member", role: "member" },
            ],
            error: null,
          }),
        };
      }),
    }));

    const result = await resolveAcademyMembership("user-3", "not-a-member-acad");
    expect(result).toEqual({ academyId: "academy-owner", role: "owner" });
  });

  it("학원이 없으면 에러를 던진다", async () => {
    mockEqUser.mockReturnValue({
      data: [],
      error: null,
    });

    await expect(resolveAcademyMembership("user-no-academy")).rejects.toThrow(
      "온보딩이 완료되지 않은 사용자"
    );
  });

  it("DB 에러 시 에러를 던진다", async () => {
    mockEqUser.mockReturnValue({
      data: null,
      error: new Error("DB connection failed"),
    });

    await expect(resolveAcademyMembership("user-db-error")).rejects.toThrow(
      "온보딩이 완료되지 않은 사용자"
    );
  });
});
