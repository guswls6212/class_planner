import { AppError } from "@/lib/errors/AppError";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 세션 가드 스텁 — 라우트 로직 검증용. 실제 토큰 검증만 우회한다.
//   - 호출부가 userId 를 넘기면 그 값을 세션 사용자로 취급 (기존 단정 유지)
//   - 넘기지 않으면 "신원 없음" → 401. 라우트의 옛 계약은 "?userId= 없으면 400"
//     이었는데, 이제 신원 부재는 인증 실패이므로 401 이 맞다.
// 가드의 실제 정책은 아래 두 곳이 검증한다:
//   - src/lib/auth/__tests__/apiAuth.test.ts (가드 단위 — 401/403)
//   - src/app/api/__tests__/session-authz.integration.test.ts (라우트가 가드를 진짜 호출하는지)
vi.mock("@/lib/auth/apiAuth", () => {
  const unauthorized = () =>
    new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  return {
    requireSessionUser: vi.fn(
      async (_request: unknown, claimedUserId?: string | null) =>
        claimedUserId
          ? { ok: true as const, userId: claimedUserId }
          : { ok: false as const, response: unauthorized() }
    ),
    verifyBearerUser: vi.fn(async () => ({
      id: "test-user-id",
      email: "test@example.com",
    })),
    getAuthenticatedUserId: vi.fn(async () => "test-user-id"),
  };
});

import { PUT, DELETE } from "../[id]/route";
import { GET, POST } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockSupabaseFrom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockSupabaseFrom }),
}));

vi.mock("@/lib/resolveAcademyId", () => ({
  resolveAcademyId: vi.fn().mockResolvedValue("test-academy-id"),
}));

const mockRequireRole = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ academyId: "test-academy-id", role: "owner" })
);
const mockRequireOwnTeacher = vi.hoisted(() => vi.fn().mockResolvedValue("test-teacher-id"));
const mockResolveAcademyMembership = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ academyId: "test-academy-id", role: "owner" })
);

vi.mock("@/lib/auth/permissions", () => ({
  requireRole: mockRequireRole,
  requireOwnTeacher: mockRequireOwnTeacher,
  pickAllowedFields: (body: Record<string, unknown>, fields: string[]) =>
    Object.fromEntries(Object.entries(body).filter(([k]) => fields.includes(k))),
}));

vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: mockResolveAcademyMembership,
}));

const mockGetAllTeachers = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockAddTeacher = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "test-teacher-id",
    name: "김강사",
    color: "#6366f1",
    email: null,
    phone: null,
    role: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
);
const mockUpdateTeacher = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "test-teacher-id",
    name: "김강사",
    color: "#6366f1",
    email: "teacher@test.com",
    phone: "010-1234-5678",
    role: "member",
    notes: "메모",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
);
const mockDeleteTeacher = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/application/services/ServiceFactory", () => ({
  ServiceFactory: {
    createTeacherService: () => ({
      getAllTeachers: mockGetAllTeachers,
      addTeacher: mockAddTeacher,
      updateTeacher: mockUpdateTeacher,
      deleteTeacher: mockDeleteTeacher,
    }),
  },
}));

vi.mock("@/lib/server/teacherServiceFactory", () => ({
  getTeacherService: () => ({
    getAllTeachers: mockGetAllTeachers,
    addTeacher: mockAddTeacher,
    updateTeacher: mockUpdateTeacher,
    deleteTeacher: mockDeleteTeacher,
  }),
}));

describe("/api/teachers API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });
    mockGetAllTeachers.mockResolvedValue([]);
    mockAddTeacher.mockResolvedValue({
      id: "test-teacher-id",
      name: "김강사",
      color: "#6366f1",
      email: null,
      phone: null,
      role: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockRequireRole.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
    mockResolveAcademyMembership.mockResolvedValue({ academyId: "test-academy-id", role: "owner" });
    mockRequireOwnTeacher.mockResolvedValue("test-teacher-id");
  });

  describe("GET /api/teachers", () => {
    it("올바른 응답 구조를 반환해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("data");
    });

    it("userId가 없으면 401을 반환해야 한다", async () => {
      const request = new NextRequest("http://localhost:3000/api/teachers");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    it("unlinked=true 파라미터 전달 시 userId가 null인 강사만 반환해야 한다", async () => {
      const linkedTeacher = {
        id: "linked-teacher",
        name: "연결된강사",
        userId: "some-user-id",
        toJSON: () => ({ id: "linked-teacher", name: "연결된강사", userId: "some-user-id" }),
      };
      const unlinkedTeacher = {
        id: "unlinked-teacher",
        name: "미연결강사",
        userId: null,
        toJSON: () => ({ id: "unlinked-teacher", name: "미연결강사", userId: null }),
      };
      mockGetAllTeachers.mockResolvedValueOnce([linkedTeacher, unlinkedTeacher]);

      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user&unlinked=true"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe("unlinked-teacher");
    });

    it("각 teacher에 status 필드 포함 — active, invite_pending, invite_expired, none", async () => {
      const futureDate = "2099-12-31T00:00:00.000Z";

      // t1: active (user_id not null)
      // t2: invite_pending (user_id null, pending invite)
      // t3: invite_expired (user_id null, expired invite)
      // t4: none (user_id null, no invite)
      const makeTeacher = (id: string, name: string, color: string, userId: string | null) => ({
        id,
        name,
        color,
        userId,
        email: null,
        phone: null,
        toJSON: () => ({ id, name, color, userId, email: null, phone: null }),
      });
      const teachers = [
        makeTeacher("t1", "강사1", "#f00", "user-123"),
        makeTeacher("t2", "강사2", "#0f0", null),
        makeTeacher("t3", "강사3", "#00f", null),
        makeTeacher("t4", "강사4", "#ff0", null),
      ];
      mockGetAllTeachers.mockResolvedValueOnce(teachers);

      // pending invite_tokens query: returns t2
      const pendingQueryChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({
                data: [{ teacher_id: "t2", expires_at: futureDate }],
                error: null,
              }),
            }),
          }),
        }),
      };
      // expired invite_tokens query: returns t3
      const expiredQueryChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({
                data: [{ teacher_id: "t3" }],
                error: null,
              }),
            }),
          }),
        }),
      };
      // share_tokens query: empty (no share_only teachers)
      const shareQueryChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };

      // mockSupabaseFrom is called 3 times: pending, expired, share
      mockSupabaseFrom
        .mockReturnValueOnce(pendingQueryChain)
        .mockReturnValueOnce(expiredQueryChain)
        .mockReturnValueOnce(shareQueryChain);

      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(4);

      const t1 = data.data.find((t: { id: string }) => t.id === "t1");
      const t2 = data.data.find((t: { id: string }) => t.id === "t2");
      const t3 = data.data.find((t: { id: string }) => t.id === "t3");
      const t4 = data.data.find((t: { id: string }) => t.id === "t4");

      expect(t1.status).toBe("active");
      expect(t1.inviteExpiresAt).toBeUndefined();

      expect(t2.status).toBe("invite_pending");
      expect(t2.inviteExpiresAt).toBe(futureDate);

      expect(t3.status).toBe("invite_expired");
      expect(t3.inviteExpiresAt).toBeUndefined();

      expect(t4.status).toBe("none");
      expect(t4.inviteExpiresAt).toBeUndefined();
    });

    it("share_tokens에 teacher_id가 연결된 강사는 status='share_only'를 가진다", async () => {
      const makeTeacher = (id: string, name: string, color: string, userId: string | null) => ({
        id,
        name,
        color,
        userId,
        email: null,
        phone: null,
        toJSON: () => ({ id, name, color, userId, email: null, phone: null }),
      });
      // t5: share_only (user_id null, no invite, but share_token with teacher_id)
      // t6: none (no invite, no share)
      const teachers = [
        makeTeacher("t5", "공유강사", "#0ff", null),
        makeTeacher("t6", "강사6", "#fff", null),
      ];
      mockGetAllTeachers.mockResolvedValueOnce(teachers);

      // pending invite_tokens: empty
      const pendingQueryChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
      // expired invite_tokens: empty
      const expiredQueryChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
      // share_tokens: returns t5
      const shareQueryChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({
                  data: [{ teacher_id: "t5" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(pendingQueryChain)
        .mockReturnValueOnce(expiredQueryChain)
        .mockReturnValueOnce(shareQueryChain);

      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);

      const t5 = data.data.find((t: { id: string }) => t.id === "t5");
      const t6 = data.data.find((t: { id: string }) => t.id === "t6");

      expect(t5.status).toBe("share_only");
      expect(t6.status).toBe("none");
    });
  });

  describe("POST /api/teachers", () => {
    it("새 강사를 생성해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김강사", color: "#6366f1" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // 200: idempotent (local-first id reconcile)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty("data");
      expect(mockAddTeacher).toHaveBeenCalledWith(
        expect.objectContaining({ name: "김강사", color: "#6366f1" }),
        "test-academy-id"
      );
    });

    it("member role은 POST에 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=member-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김강사", color: "#6366f1" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("email/phone/role/notes 포함 생성이 가능해야 한다", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({
            name: "김강사",
            color: "#6366f1",
            email: "teacher@test.com",
            phone: "010-1234-5678",
            role: "member",
            notes: "메모",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // 200: idempotent (local-first id reconcile)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAddTeacher).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "김강사",
          color: "#6366f1",
          email: "teacher@test.com",
          phone: "010-1234-5678",
          role: "member",
          notes: "메모",
        }),
        "test-academy-id"
      );
    });

    it("name 또는 color 누락 시 400을 반환해야 한다", async () => {
      // color 누락 (직접 NextResponse string 응답 유지)
      const reqColorMissing = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김강사" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const resColor = await POST(reqColorMissing);
      const dataColor = await resColor.json();
      expect(resColor.status).toBe(400);
      expect(dataColor.success).toBe(false);
      expect(dataColor.error).toBe("Color is required");

      // name 누락 (Phase 4 SSOT helper → AppError → 객체 형식 응답)
      const reqNameMissing = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ color: "#ffffff" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const resName = await POST(reqNameMissing);
      const dataName = await resName.json();
      expect(resName.status).toBe(400);
      expect(dataName.success).toBe(false);
      expect(dataName.error.code).toBe("TEACHER_NAME_REQUIRED");
    });

    it("중복 강사 시 409를 반환해야 한다", async () => {
      mockAddTeacher.mockRejectedValueOnce(
        new AppError("TEACHER_NAME_DUPLICATE", { statusHint: 409 })
      );

      const request = new NextRequest(
        "http://localhost:3000/api/teachers?userId=test-user",
        {
          method: "POST",
          body: JSON.stringify({ name: "김강사", color: "#6366f1" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("TEACHER_NAME_DUPLICATE");
    });
  });

  describe("PUT /api/teachers/[id]", () => {
    it("owner/admin이 강사 정보를 업데이트해야 한다", async () => {
      const teacherId = "test-teacher-id";
      const request = new NextRequest(
        `http://localhost:3000/api/teachers/${teacherId}?userId=test-user`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: "김강사",
            color: "#6366f1",
            email: "teacher@test.com",
            phone: "010-1234-5678",
            role: "member",
            notes: "메모",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: teacherId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdateTeacher).toHaveBeenCalledWith(
        teacherId,
        expect.objectContaining({
          email: "teacher@test.com",
          phone: "010-1234-5678",
          role: "member",
          notes: "메모",
        }),
        "test-academy-id"
      );
    });

    it("member가 자신의 teacher의 email/phone/notes를 업데이트할 수 있다", async () => {
      mockResolveAcademyMembership.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });
      mockRequireOwnTeacher.mockResolvedValueOnce("test-teacher-id");
      mockUpdateTeacher.mockResolvedValueOnce({
        id: "test-teacher-id",
        email: "new@test.com",
        phone: "010-9999-9999",
        notes: "updated",
      });

      const teacherId = "test-teacher-id";
      const request = new NextRequest(
        `http://localhost:3000/api/teachers/${teacherId}?userId=member-user`,
        {
          method: "PUT",
          body: JSON.stringify({ email: "new@test.com", phone: "010-9999-9999", notes: "updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: teacherId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Only allowed fields should be passed
      expect(mockUpdateTeacher).toHaveBeenCalledWith(
        teacherId,
        expect.objectContaining({ email: "new@test.com", phone: "010-9999-9999", notes: "updated" }),
        "test-academy-id"
      );
    });

    it("member가 name/color 등 비허용 필드만 보내면 403을 반환한다", async () => {
      mockResolveAcademyMembership.mockResolvedValueOnce({ academyId: "test-academy-id", role: "member" });
      mockRequireOwnTeacher.mockResolvedValueOnce("test-teacher-id");

      const teacherId = "test-teacher-id";
      const request = new NextRequest(
        `http://localhost:3000/api/teachers/${teacherId}?userId=member-user`,
        {
          method: "PUT",
          body: JSON.stringify({ name: "새이름", color: "#ff0000" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: teacherId }),
      });

      expect(response.status).toBe(403);
    });

    it("DELETE: member role은 403을 반환해야 한다", async () => {
      mockRequireRole.mockRejectedValueOnce(
        new AppError("FORBIDDEN", { statusHint: 403 })
      );

      const teacherId = "test-teacher-id";
      const request = new NextRequest(
        `http://localhost:3000/api/teachers/${teacherId}?userId=member-user`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: teacherId }),
      });
      expect(response.status).toBe(403);
    });

    it("DELETE: owner/admin이 강사를 삭제할 수 있다", async () => {
      const teacherId = "test-teacher-id";
      const request = new NextRequest(
        `http://localhost:3000/api/teachers/${teacherId}?userId=test-user`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: teacherId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
