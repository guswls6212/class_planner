/**
 * Race-gap regression guard: template-apply-reconcile (UAT audit 2026-05-30, finding §7).
 *
 * 템플릿 적용(applyTemplateUtil)은 `await updateData(local)` 로 localStorage 를 먼저
 * 갱신한 뒤, 새 session/enrollment 를 fire-and-forget 로 서버에 동기화한다
 * (templateHelpers.ts:85-92). 이때 핵심 reconcile 계약은:
 *
 *   1. 각 newSession/newEnrollment 가 **client UUID(local 에 저장된 그 id)** 를 그대로
 *      서버에 전송한다 → 서버가 그 id 로 INSERT → 새로고침 후 GET 응답의 id 가
 *      localStorage 와 일치 (ghost/중복 0). client id 를 안 실으면 서버가 자체 id 를
 *      발급해 localStorage 와 어긋나고 ghost 누적 → 이 회귀가 정확히 P0 데이터 사고.
 *
 *   2. 오프라인 적용 후 재연결 시: fire-and-forget 이 retry 소진 후 outbox 에 적재할 때
 *      **deterministic id**(`session:create:${id}` / `enrollment:create:${id}`) 를 쓰므로
 *      같은 항목을 다시 dispatch 해도 outbox 가 무한 누적되지 않고(dedup), 다음 페이지
 *      진입의 flushOutbox 가 동일 client id 로 재전송해 reconcile 한다.
 *
 * 본 spec 은 이 두 계약을 결정적으로 잠근다. (실제 멀티탭/새로고침-vs-init 타이밍 race 는
 * vitest 단위로 안정 재현 불가하나, reconcile 의 토대인 client-UUID 전파 + outbox
 * dedup + flush 는 결정적으로 검증 가능.)
 *
 * 대상: src/app/schedule/_utils/templateHelpers.ts (applyTemplateUtil),
 *      src/lib/apiSync.ts (syncSessionCreate/syncEnrollmentCreate outbox id),
 *      src/lib/syncOutbox.ts (enqueueOutbox dedup / flushOutbox).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, Subject } from "@/lib/planner";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";

// ─── logger 노이즈 차단 ──────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── apiSync 의 fire-and-forget create 를 spy 로 대체 ──────────
// applyTemplateUtil 이 무엇을 어떤 id 로 dispatch 하는지 결정적으로 관찰.
vi.mock("@/lib/apiSync", () => ({
  syncSessionCreate: vi.fn(),
  syncEnrollmentCreate: vi.fn(),
}));

import { applyTemplateUtil } from "../templateHelpers";
import { syncSessionCreate, syncEnrollmentCreate } from "@/lib/apiSync";
import {
  enqueueOutbox,
  flushOutbox,
  getOutboxEntries,
  getOutboxSize,
} from "@/lib/syncOutbox";

// ─── setupTests.ts 가 localStorage 를 vi.fn() 더미로 모킹 → 인메모리 store 재정의 ──
const lsStore = new Map<string, string>();

beforeEach(() => {
  lsStore.clear();
  vi.spyOn(window.localStorage, "getItem").mockImplementation(
    (k) => lsStore.get(k) ?? null,
  );
  vi.spyOn(window.localStorage, "setItem").mockImplementation((k, v) => {
    lsStore.set(k, v);
  });
  vi.spyOn(window.localStorage, "removeItem").mockImplementation((k) => {
    lsStore.delete(k);
  });
  vi.mocked(syncSessionCreate).mockClear();
  vi.mocked(syncEnrollmentCreate).mockClear();
});

afterEach(() => {
  lsStore.clear();
  vi.restoreAllMocks();
});

// ─── 결정적 fixtures ─────────────────────────────────────────
const USER_ID = "user-reconcile-1";

const subject = (id: string, name: string): Subject => ({
  id,
  name,
  color: "#abc",
});

/** id 를 g-0, g-1, ... 로 결정적 생성 (buildApplyTemplate 가 내부에서 crypto.randomUUID
 *  를 쓰지만, applyTemplateUtil 은 generateId override 를 노출하지 않으므로 결정적 id 는
 *  세션 자체 비교가 아니라 "전송한 id == 로컬에 머지된 id" 동치로 검증한다. */

const templateSession = (
  weekday: number,
  startsAt: string,
  subjectId: string,
  studentIds: string[],
): ScheduleTemplate["templateData"]["sessions"][number] => ({
  weekday,
  startsAt,
  endsAt: "10:00",
  subjectId,
  subjectName: subjectId,
  subjectColor: "#abc",
  studentIds,
  studentNames: studentIds,
  yPosition: 1,
});

const makeTemplate = (
  sessions: ScheduleTemplate["templateData"]["sessions"],
): ScheduleTemplate => ({
  id: "tpl-reconcile",
  name: "재동기화 템플릿",
  description: null,
  templateData: { version: "1.0", sessions },
  slotIndex: 0,
  createdBy: USER_ID,
  createdAt: "2026-05-30T00:00:00Z",
  updatedAt: "2026-05-30T00:00:00Z",
});

const baseParams = (
  template: ScheduleTemplate,
  overrides: Partial<Parameters<typeof applyTemplateUtil>[0]> = {},
) => ({
  template,
  weekFilteredSessions: [] as Session[],
  sessions: [] as Session[],
  subjects: [subject("sub-math", "수학"), subject("sub-eng", "영어")],
  students: [
    { id: "st-1", name: "학생1" },
    { id: "st-2", name: "학생2" },
  ],
  teachers: [{ id: "tc-1", name: "강사1", color: "#000" }],
  enrollments: [] as Array<{ id: string; studentId: string; subjectId: string }>,
  currentWeekStart: "2026-05-25",
  updateData: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("template-apply-reconcile (race-gap 회귀 가드)", () => {
  describe("applyTemplateUtil — local commit 후 fire-and-forget sync dispatch", () => {
    it("새 session 마다 syncSessionCreate 를 정확히 1회씩 dispatch 한다 (누락/중복 0)", async () => {
      localStorage.setItem("supabase_user_id", USER_ID);
      const tpl = makeTemplate([
        templateSession(0, "09:00", "sub-math", ["st-1"]),
        templateSession(1, "09:00", "sub-eng", ["st-2"]),
      ]);

      const result = await applyTemplateUtil(baseParams(tpl));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.newSessionsCount).toBe(2);
      // session 2개 → syncSessionCreate 2회 (1:1, 누락도 중복도 없음)
      expect(syncSessionCreate).toHaveBeenCalledTimes(2);
    });

    it("local 머지에 들어간 session id 와 서버로 보낸 id 가 동일하다 (client-UUID 전파 — ghost 방지)", async () => {
      localStorage.setItem("supabase_user_id", USER_ID);
      const tpl = makeTemplate([templateSession(0, "09:00", "sub-math", ["st-1"])]);

      const updateData = vi.fn().mockResolvedValue(undefined);
      const result = await applyTemplateUtil(baseParams(tpl, { updateData }));
      expect(result.ok).toBe(true);

      // (a) localStorage 머지 payload 에 들어간 새 session id 추출
      const mergedPayload = updateData.mock.calls[0][0] as {
        sessions: Session[];
      };
      expect(mergedPayload.sessions).toHaveLength(1);
      const localId = mergedPayload.sessions[0].id;

      // (b) 서버로 fire-and-forget dispatch 한 session id 추출
      const dispatched = vi.mocked(syncSessionCreate).mock.calls[0][1] as Session;
      const dispatchedId = dispatched.id;

      // 둘이 같아야 reconcile 성립 — 서버가 이 id 로 INSERT → 새로고침 후 GET id 일치.
      // 서로 다르면 server 가 자체 id 발급 → localStorage 와 어긋나 ghost 누적.
      expect(dispatchedId).toBe(localId);
      expect(dispatchedId).toBeTruthy();
    });

    it("새 enrollment 도 client id 를 그대로 서버로 dispatch 한다 (enrollment reconcile)", async () => {
      localStorage.setItem("supabase_user_id", USER_ID);
      // enrollment 가 기존에 없으므로 2명 → 신규 enrollment 2개 생성
      const tpl = makeTemplate([
        templateSession(0, "09:00", "sub-math", ["st-1", "st-2"]),
      ]);

      const updateData = vi.fn().mockResolvedValue(undefined);
      const result = await applyTemplateUtil(baseParams(tpl, { updateData }));
      expect(result.ok).toBe(true);

      const mergedPayload = updateData.mock.calls[0][0] as {
        sessions: Session[];
        enrollments?: Array<{ id: string; studentId: string; subjectId: string }>;
      };
      const localEnrollmentIds = (mergedPayload.enrollments ?? []).map((e) => e.id);
      expect(localEnrollmentIds.length).toBe(2);

      // 서버로 보낸 enrollment id 들
      expect(syncEnrollmentCreate).toHaveBeenCalledTimes(2);
      const dispatchedEnrollmentIds = vi
        .mocked(syncEnrollmentCreate)
        .mock.calls.map((c) => (c[1] as { id?: string }).id);

      // local 머지 id 집합 == 서버 dispatch id 집합 (전부 reconcile 가능)
      expect(new Set(dispatchedEnrollmentIds)).toEqual(new Set(localEnrollmentIds));
    });

    it("기존 enrollment 재사용 시 그 학생은 신규 enrollment sync 를 발사하지 않는다 (중복 enrollment POST 0)", async () => {
      localStorage.setItem("supabase_user_id", USER_ID);
      const tpl = makeTemplate([
        templateSession(0, "09:00", "sub-math", ["st-1", "st-2"]),
      ]);
      // st-1 은 이미 enrollment 보유 → 재사용. st-2 만 신규.
      const params = baseParams(tpl, {
        enrollments: [{ id: "enr-existing", studentId: "st-1", subjectId: "sub-math" }],
      });

      const result = await applyTemplateUtil(params);
      expect(result.ok).toBe(true);

      // 신규 enrollment 는 st-2 1개만 → syncEnrollmentCreate 1회
      expect(syncEnrollmentCreate).toHaveBeenCalledTimes(1);
      const onlyDispatched = vi.mocked(syncEnrollmentCreate).mock.calls[0][1] as {
        studentId: string;
      };
      expect(onlyDispatched.studentId).toBe("st-2");
    });

    it("local updateData 실패(throw) 시 ok:false 를 반환하고 서버 sync 를 발사하지 않는다 (부분 적용 방지)", async () => {
      localStorage.setItem("supabase_user_id", USER_ID);
      const tpl = makeTemplate([templateSession(0, "09:00", "sub-math", ["st-1"])]);
      const updateData = vi.fn().mockRejectedValue(new Error("local write failed"));

      const result = await applyTemplateUtil(baseParams(tpl, { updateData }));

      expect(result.ok).toBe(false);
      // local 이 실패했는데 서버에만 보내면 local/server 불일치 → dispatch 0 이어야 함
      expect(syncSessionCreate).not.toHaveBeenCalled();
      expect(syncEnrollmentCreate).not.toHaveBeenCalled();
    });
  });

  describe("오프라인 적용 → 재연결 reconcile (outbox dedup + flush)", () => {
    // fire-and-forget 이 network 실패 retry 소진 후 호출하는 enqueueOutbox 를 직접 모사.
    // 핵심: deterministic id (`session:create:${id}`) 라서 같은 항목 재적재해도 1개로 dedup.
    const sessionOutboxEntry = (sessionId: string) => ({
      id: `session:create:${sessionId}`,
      context: "session:create",
      method: "POST" as const,
      url: `/api/sessions?userId=${USER_ID}`,
      body: { id: sessionId, weekday: 0, startsAt: "09:00", endsAt: "10:00" },
    });

    it("오프라인 적용 후 같은 세션이 여러 번 outbox 에 들어가도 무한 누적되지 않는다 (deterministic id dedup)", () => {
      // 적용 직후 offline → 그 다음 페이지 진입에서 또 같은 client id 로 dispatch 되는
      // 상황을 모사. PR #385 회귀(같은 entry 무한 누적)가 재발하면 size 가 늘어난다.
      enqueueOutbox(USER_ID, sessionOutboxEntry("sess-A"));
      enqueueOutbox(USER_ID, sessionOutboxEntry("sess-A")); // 재적재 (재진입/재시도)
      enqueueOutbox(USER_ID, sessionOutboxEntry("sess-A"));

      expect(getOutboxSize(USER_ID)).toBe(1);
      expect(getOutboxEntries(USER_ID)[0].id).toBe("session:create:sess-A");
    });

    it("서로 다른 세션은 각각 별개 entry 로 보관된다 (id 격리)", () => {
      enqueueOutbox(USER_ID, sessionOutboxEntry("sess-A"));
      enqueueOutbox(USER_ID, sessionOutboxEntry("sess-B"));
      expect(getOutboxSize(USER_ID)).toBe(2);
    });

    it("재연결 후 flushOutbox 가 보관된 적용 세션을 동일 client id 로 재전송하고 outbox 를 비운다", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = mockFetch;

      enqueueOutbox(USER_ID, sessionOutboxEntry("sess-A"));
      enqueueOutbox(USER_ID, sessionOutboxEntry("sess-B"));
      expect(getOutboxSize(USER_ID)).toBe(2);

      const res = await flushOutbox(USER_ID);

      expect(res.sent).toBe(2);
      expect(getOutboxSize(USER_ID)).toBe(0); // 전부 reconcile → 큐 비움

      // 재전송 body 가 client id 를 그대로 실어야 reconcile 성립
      const sentBodies = mockFetch.mock.calls.map(
        (c) => JSON.parse((c[1] as { body: string }).body),
      );
      const sentIds = sentBodies.map((b) => b.id).sort();
      expect(sentIds).toEqual(["sess-A", "sess-B"]);
    });

    it("재연결 시 서버가 여전히 5xx 면 outbox 에 보관해 다음 진입에 다시 reconcile 시도한다 (데이터 손실 X)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
      global.fetch = mockFetch;

      enqueueOutbox(USER_ID, sessionOutboxEntry("sess-A"));
      const res = await flushOutbox(USER_ID);

      expect(res.sent).toBe(0);
      // 5xx 는 일시 장애 → 보관 (drop 하면 적용 세션이 서버에 영영 안 감 = 손실)
      expect(getOutboxSize(USER_ID)).toBe(1);
    });
  });
});
