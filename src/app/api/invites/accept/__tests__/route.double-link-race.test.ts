import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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


// Race-gap regression: member-double-link-409 (UAT finding S-20.2b, 2026-05-30).
//
// Scenario: a teacher-invite token is accepted concurrently (or re-forwarded)
// after the teacher record has ALREADY been linked to another account. The
// second accept must NOT silently leave a reusable token behind.
//
// SSOT under test: src/app/api/invites/accept/route.ts:96-119
//   - teachers.update({user_id}).eq(id).is('user_id', null)  ← single-link guard
//   - on linkError (e.g. UNIQUE INDEX uniq_teachers_academy_user 23505):
//       1. mark invite_tokens.used_by / used_at  (anti-orphan, lines 107-110)
//       2. return 409 { error: 'TEACHER_ALREADY_LINKED' }
//
// The pre-existing route.test.ts already checks the 409 status. What is NOT
// locked in there (and is the actual race-gap) is the loser-token-consumption
// invariant: the losing accept must still burn its token so the same link
// cannot be retried/reused. These tests pin that behavior.

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { mockFrom, mockGetUserById } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUserById: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({
    from: mockFrom,
    auth: { admin: { getUserById: mockGetUserById } },
  }),
}));

import { POST } from "../route";

const VALID_FUTURE = new Date(Date.now() + 86_400_000).toISOString();

/**
 * Builds a fresh `client.from()` router for one accept call.
 *
 * @param tokenId            invite_tokens.id (asserted on the consumed-token UPDATE)
 * @param linkError          error object returned by teachers.update().eq().is()
 *                           — null = won the link race; {code:'23505'} = lost it
 * @returns spies needed to assert downstream writes deterministically
 */
function buildClientRouter(opts: {
  tokenId: string;
  teacherId: string;
  linkError: { code: string } | null;
}) {
  // invite_tokens UPDATE — used both for the anti-orphan write (loser) and the
  // normal "mark consumed" write (winner). We capture the .eq() arg to prove
  // the *correct* token row was burned.
  const inviteTokensUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const inviteTokensUpdate = vi.fn().mockReturnValue({ eq: inviteTokensUpdateEq });

  const memberInsert = vi.fn().mockResolvedValue({ error: null });

  const teachersUpdateIs = vi.fn().mockResolvedValue({ error: opts.linkError });
  const teachersUpdateEq = vi.fn().mockReturnValue({ is: teachersUpdateIs });
  const teachersUpdate = vi.fn().mockReturnValue({ eq: teachersUpdateEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === "invite_tokens") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: opts.tokenId,
                academy_id: "acad-race",
                role: "member",
                expires_at: VALID_FUTURE,
                used_by: null,
                created_by: "owner-user",
                teacher_id: opts.teacherId,
                email: null,
                academies: { name: "레이스학원" },
              },
              error: null,
            }),
          }),
        }),
        update: inviteTokensUpdate,
      };
    }
    if (table === "academy_members") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              // not yet a member of this academy
              single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
            }),
          }),
        }),
        insert: memberInsert,
      };
    }
    if (table === "teachers") {
      return { update: teachersUpdate };
    }
    return {};
  });

  return {
    inviteTokensUpdate,
    inviteTokensUpdateEq,
    memberInsert,
    teachersUpdate,
    teachersUpdateEq,
    teachersUpdateIs,
  };
}

function acceptRequest(userId: string, token: string) {
  return new NextRequest(`http://localhost/api/invites/accept?userId=${userId}`, {
    method: "POST",
    body: JSON.stringify({ token }),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/invites/accept — member double-link race (S-20.2b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("race loser (teacher already linked, 23505): returns 409 AND burns its own token (no orphaned reusable token)", async () => {
    const tokenId = `tok-loser-${crypto.randomUUID()}`;
    const teacherId = `teacher-${crypto.randomUUID()}`;
    const spies = buildClientRouter({
      tokenId,
      teacherId,
      linkError: { code: "23505" }, // UNIQUE INDEX uniq_teachers_academy_user
    });

    const res = await POST(acceptRequest("loser-user", "race-token"));
    const body = await res.json();

    // 409 with the exact error contract
    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toBe("TEACHER_ALREADY_LINKED");

    // The link was attempted with the single-link guard `.is('user_id', null)`.
    expect(spies.teachersUpdate).toHaveBeenCalledWith({ user_id: "loser-user" });
    expect(spies.teachersUpdateEq).toHaveBeenCalledWith("id", teacherId);
    expect(spies.teachersUpdateIs).toHaveBeenCalledWith("user_id", null);

    // CORE INVARIANT: even though the link failed, the loser's token is consumed
    // (used_by / used_at set) on THIS token row — prevents an orphaned, reusable token.
    expect(spies.inviteTokensUpdate).toHaveBeenCalledTimes(1);
    const consumedPayload = spies.inviteTokensUpdate.mock.calls[0][0];
    expect(consumedPayload).toMatchObject({ used_by: "loser-user" });
    expect(typeof consumedPayload.used_at).toBe("string");
    expect(spies.inviteTokensUpdateEq).toHaveBeenCalledWith("id", tokenId);
  });

  it("race winner (teacher currently unlinked): links teacher exactly once, consumes token, returns 200", async () => {
    const tokenId = `tok-winner-${crypto.randomUUID()}`;
    const teacherId = `teacher-${crypto.randomUUID()}`;
    const spies = buildClientRouter({
      tokenId,
      teacherId,
      linkError: null, // guard matched the unlinked row → link succeeds
    });

    const res = await POST(acceptRequest("winner-user", "race-token"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.academyId).toBe("acad-race");

    // teacher linked exactly once with the winner's userId
    expect(spies.teachersUpdate).toHaveBeenCalledTimes(1);
    expect(spies.teachersUpdate).toHaveBeenCalledWith({ user_id: "winner-user" });

    // token consumed exactly once on the correct row
    expect(spies.inviteTokensUpdate).toHaveBeenCalledTimes(1);
    expect(spies.inviteTokensUpdateEq).toHaveBeenCalledWith("id", tokenId);
    const consumedPayload = spies.inviteTokensUpdate.mock.calls[0][0];
    expect(consumedPayload).toMatchObject({ used_by: "winner-user" });
  });

  it("two near-simultaneous accepts of the same teacher invite: exactly one 200 link + one 409, both tokens consumed", async () => {
    const teacherId = `teacher-${crypto.randomUUID()}`;

    // Accept #1 — wins the link race (teacher row still unlinked).
    const tokenIdA = `tok-A-${crypto.randomUUID()}`;
    const spiesA = buildClientRouter({ tokenId: tokenIdA, teacherId, linkError: null });
    const resA = await POST(acceptRequest("user-A", "shared-token"));
    const bodyA = await resA.json();

    // Accept #2 — loses; the unique index now rejects the second link.
    const tokenIdB = `tok-B-${crypto.randomUUID()}`;
    const spiesB = buildClientRouter({ tokenId: tokenIdB, teacherId, linkError: { code: "23505" } });
    const resB = await POST(acceptRequest("user-B", "shared-token"));
    const bodyB = await resB.json();

    // Exactly one success, exactly one 409 — never two links, never two failures.
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(bodyA.success).toBe(true);
    expect(bodyB.success).toBe(false);
    expect(bodyB.error).toBe("TEACHER_ALREADY_LINKED");

    // Both accepts burned their own distinct token rows — no reusable leftover.
    expect(spiesA.inviteTokensUpdateEq).toHaveBeenCalledWith("id", tokenIdA);
    expect(spiesB.inviteTokensUpdateEq).toHaveBeenCalledWith("id", tokenIdB);
    expect(spiesA.inviteTokensUpdate).toHaveBeenCalledTimes(1);
    expect(spiesB.inviteTokensUpdate).toHaveBeenCalledTimes(1);
  });
});