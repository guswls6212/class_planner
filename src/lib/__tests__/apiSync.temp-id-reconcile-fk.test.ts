/**
 * Race-gap regression guard — temp-id reconcile 실패 → stale id POST → FK 위반
 * → outbox 무한 retry (PR #385, omni-radar 2026-05-13).
 *
 * 사고 체인:
 *   인라인 새 학생 추가 → createStudent await 동안 temp id 노출 → 사용자가 같은
 *   학생 재선택 → reconcile 안 된 stale studentId 로 enrollment:create POST →
 *   server FK 위반(student_id 가 DB 에 없음) → 4xx/5xx → outbox 적재 → 다음 페이지
 *   진입마다 같은 stale entry 영구 재시도(무한 retry).
 *
 * 두 줄의 방어선을 잠근다:
 *   1) apiSync.fireAndForget 4xx fast-fail — FK 위반(400/409)은 retry/큐잉 무의미라
 *      outbox 에 절대 적재되지 않는다(무한 retry 의 진입점 차단). 5xx(일시 server
 *      장애)만 retry exhaust 후 적재 → 4xx vs 5xx 분기가 가드의 핵심.
 *   2) syncOutbox.flushOutbox — 어쩌다 outbox 에 stale entry 가 들어가더라도, flush
 *      시 4xx 면 1회 시도 후 drop(다음 진입에 재발사 X). 5xx 만 보관해 재시도.
 *
 * upstream sanitize 가드(sanitizeStudentIds / sanitizeTempEnrollments)는
 * 별도 spec 에서 stale id 가 POST 페이로드에 도달하는 것 자체를 차단한다.
 * 본 spec 은 그 가드가 뚫렸을 때(회귀)에도 '무한 retry' 로 번지지 않음을 보장한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("../toast", () => ({
  showToast: vi.fn(),
  showError: vi.fn(),
}));

import { syncEnrollmentCreate, __resetSyncStateForTests } from "../apiSync";
import { getOutboxSize, getOutboxEntries, flushOutbox } from "../syncOutbox";

const USER_ID = "user-race-385";

// setupTests.ts 가 localStorage 를 bare vi.fn() 으로 모킹하므로, 실제 enqueue/read 가
// 동작하도록 인메모리 store 로 재정의(syncOutbox.test.ts 와 동일 패턴).
const lsStore = new Map<string, string>();

let mockFetch: ReturnType<typeof vi.fn>;

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

  mockFetch = vi.fn();
  global.fetch = mockFetch;
  __resetSyncStateForTests();
});

afterEach(() => {
  // pending retry setTimeout leak 정리(reset 된 mockFetch 를 늦게 호출하는 것 방지).
  __resetSyncStateForTests();
  vi.useRealTimers();
  vi.restoreAllMocks();
  lsStore.clear();
});

// fire-and-forget 이므로 첫 .then() 체인이 끝나도록 microtask 를 양보.
async function flushMicrotasks(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe("apiSync — temp-id reconcile FK 위반 → outbox 무한 retry 가드 (PR #385)", () => {
  describe("방어선 1: 4xx FK 위반은 outbox 에 적재되지 않음 (무한 retry 진입점 차단)", () => {
    it("stale studentId enrollment:create 가 400(FK 위반) 받으면 outbox size 0 — 재시도 큐잉 안 됨", async () => {
      // 400: FK 위반(student_id 가 server 에 없음) 시뮬레이션.
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error_code: "FK_VIOLATION" }),
      });

      syncEnrollmentCreate(USER_ID, {
        id: "enr-stale-1",
        studentId: "temp-student-stale", // reconcile 실패한 temp id
        subjectId: "subj-1",
      });
      await flushMicrotasks();

      // POST 는 1회만 발사(4xx fast-fail — retry setTimeout 스케줄 X).
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // 핵심 회귀 가드: 4xx 는 outbox 부적격 → 다음 페이지 진입에 재발사 안 됨.
      expect(getOutboxSize(USER_ID)).toBe(0);
    });

    it("409(UNIQUE/FK 충돌)도 동일하게 outbox 에 적재되지 않음", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error_code: "ENROLLMENT_CONFLICT" }),
      });

      syncEnrollmentCreate(USER_ID, {
        id: "enr-stale-2",
        studentId: "temp-student-stale-2",
        subjectId: "subj-1",
      });
      await flushMicrotasks();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(getOutboxSize(USER_ID)).toBe(0);
    });

    it("403(권한) 같은 다른 4xx 도 outbox 적재 안 됨 (전 4xx 일관)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "forbidden" }),
      });

      syncEnrollmentCreate(USER_ID, {
        id: "enr-stale-3",
        studentId: "temp-student-stale-3",
        subjectId: "subj-1",
      });
      await flushMicrotasks();

      expect(getOutboxSize(USER_ID)).toBe(0);
    });
  });

  describe("방어선 1 대비군: 5xx(일시 server 장애)는 retry exhaust 후 outbox 보관 — 4xx 와 분기 검증", () => {
    it("500 응답은 10회 retry 소진 후 outbox 에 1건 적재 (다음 진입 재시도 위임)", async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "server error" }),
      });

      syncEnrollmentCreate(USER_ID, {
        id: "enr-5xx-1",
        studentId: "temp-student-5xx",
        subjectId: "subj-1",
      });

      // fireAndForget 은 attempt<9 일 때 setTimeout(backoff) 으로 재시도 스케줄.
      // backoff 최대 30s, 총 10회 시도 → 충분히 advance + microtask flush 반복.
      for (let i = 0; i < 12; i++) {
        await vi.advanceTimersByTimeAsync(30_000);
      }

      // 4xx 와 달리 5xx 는 retry exhaust 시점에 outbox 보관.
      expect(getOutboxSize(USER_ID)).toBe(1);
      const entries = getOutboxEntries(USER_ID);
      expect(entries[0]?.context).toBe("enrollment:create");
      expect(entries[0]?.method).toBe("POST");
      // dedup id 는 client id 기반 → 재진입 시 중복 누적 방지.
      expect(entries[0]?.id).toBe("enrollment:create:enr-5xx-1");
    });
  });

  describe("방어선 2: outbox 에 이미 들어간 stale entry 도 flush 4xx 면 drop (무한 누적 방지)", () => {
    it("outbox 에 stale enrollment entry → flush 시 server 400 → drop + 다음 flush 재발사 0", async () => {
      // 어쩌다 outbox 에 stale entry 가 적재된 상태를 직접 시드(5xx 경로 등으로).
      lsStore.set(
        `class_planner_${USER_ID}_sync_outbox`,
        JSON.stringify([
          {
            id: "enrollment:create:enr-stale-flush",
            context: "enrollment:create",
            method: "POST",
            url: `/api/enrollments?userId=${USER_ID}`,
            body: { id: "enr-stale-flush", studentId: "temp-gone", subjectId: "subj-1" },
            queuedAt: new Date().toISOString(),
          },
        ]),
      );
      expect(getOutboxSize(USER_ID)).toBe(1);

      // 1차 flush: server 가 FK 위반으로 400 → 4xx drop.
      mockFetch.mockResolvedValue({ ok: false, status: 400 });
      const first = await flushOutbox(USER_ID);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(first.failed).toBe(1);
      expect(first.sent).toBe(0);
      // drop 됨 — 무한 retry 의 핵심 차단점.
      expect(getOutboxSize(USER_ID)).toBe(0);

      // 2차 flush(다음 페이지 진입 모사): 큐가 비어 fetch 미발사 — 재발사 0.
      mockFetch.mockClear();
      const second = await flushOutbox(USER_ID);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(second).toEqual({ sent: 0, failed: 0, expired: 0 });
    });

    it("대비: 같은 entry 가 flush 5xx 면 보관되어 다음 flush 에 재시도 (4xx drop 과 분기)", async () => {
      lsStore.set(
        `class_planner_${USER_ID}_sync_outbox`,
        JSON.stringify([
          {
            id: "enrollment:create:enr-5xx-flush",
            context: "enrollment:create",
            method: "POST",
            url: `/api/enrollments?userId=${USER_ID}`,
            body: { id: "enr-5xx-flush", studentId: "s-real", subjectId: "subj-1" },
            queuedAt: new Date().toISOString(),
          },
        ]),
      );

      mockFetch.mockResolvedValue({ ok: false, status: 503 });
      const first = await flushOutbox(USER_ID);
      expect(first).toEqual({ sent: 0, failed: 0, expired: 0 });
      // 5xx 는 보관 — 다음 진입에 재시도 가능해야 한다.
      expect(getOutboxSize(USER_ID)).toBe(1);

      // 2차 flush 에서 server 회복(200) → 정상 전송 + 큐 비워짐.
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      const second = await flushOutbox(USER_ID);
      expect(second.sent).toBe(1);
      expect(getOutboxSize(USER_ID)).toBe(0);
    });
  });
});