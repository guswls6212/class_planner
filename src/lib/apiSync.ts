/**
 * 클라이언트 CRUD 결과를 서버와 동기화하는 fire-and-forget 유틸리티.
 *
 * - userId가 null이면 (익명 사용자) 서버 호출 스킵
 * - API 실패 시 exponential backoff 재시도 (max 10회, delay 최대 30s)
 * - 첫 실패 시점에 즉시 dismissible warning toast 1회 노출 (silent failure 방지).
 *   3회 누적 시 더 강한 "동기화 중단 위험" 토스트로 격상.
 * - 재성공 시 상태 리셋 + 복구 success toast 1회 (이전에 실패 toast가 떴던 경우만)
 * - localStorage가 SSOT이며 서버 동기화는 백그라운드
 */

import { logger } from "./logger";
import { showToast, showError } from "./toast";
import { enqueueOutbox } from "./syncOutbox";
import { deleteSessionFromLocal } from "./localStorageCrud";
import { getKoMessage } from "./errors/messages.ko";
import {
  validateStudentInput,
  validateSubjectInput,
  validateTeacherInput,
} from "./validation/profileSchemas";
import type { Session } from "../lib/planner";

/**
 * "ghost session" cleanup — server에 없는 sessionId를 localStorage에서 제거.
 * PUT/DELETE 응답이 404일 때 발화.
 *
 * 토스트는 같은 cleanup이 빠르게 여러 번 발생할 때 노이즈 방지를 위해
 * 200ms 디바운스로 묶어 한 번에 표시 ("N개 수업이 서버에 없어 정리됨").
 *
 * ⚠️ Race guard (2026-05-04): syncSessionCreate 직후 PUT /position이 POST보다
 * 먼저 도달해 404를 받는 race로 방금 만든 session이 즉시 삭제되는 사고가 있었음.
 * 30초 이내 syncSessionCreate된 sessionId는 cleanup 보류 — POST가 도착할 시간을
 * 충분히 주고, 진짜 ghost(오래된 잔재)만 제거.
 */
const GHOST_CLEANUP_GRACE_MS = 30_000;
const recentCreatesById = new Map<string, number>();
function markRecentCreate(sessionId: string): void {
  recentCreatesById.set(sessionId, Date.now());
}
function isWithinCreateGrace(sessionId: string): boolean {
  const ts = recentCreatesById.get(sessionId);
  if (ts == null) return false;
  return Date.now() - ts < GHOST_CLEANUP_GRACE_MS;
}

let pendingGhostCount = 0;
let pendingGhostTimer: ReturnType<typeof setTimeout> | null = null;
function cleanupGhostSession(sessionId: string): void {
  // 최근 POST 진행 중이면 보류 (race 보호)
  if (isWithinCreateGrace(sessionId)) {
    logger.debug("ghost cleanup 보류 (최근 생성 — POST race)", { sessionId });
    return;
  }
  try {
    const result = deleteSessionFromLocal(sessionId);
    if (!result.success) return;
  } catch (err) {
    logger.error("ghost cleanup 실패", { sessionId }, err as Error);
    return;
  }
  pendingGhostCount++;
  if (pendingGhostTimer) clearTimeout(pendingGhostTimer);
  pendingGhostTimer = setTimeout(() => {
    showToast(
      "info",
      `${pendingGhostCount}개 수업이 서버에 없어 정리됐습니다`,
    );
    pendingGhostCount = 0;
    pendingGhostTimer = null;
  }, 200);
}

// ===== sync context 라벨 (사용자 친화 표시용) =====

/**
 * fireAndForget의 context 문자열 → 한국어 사용자 표시 라벨.
 * 토스트 / 모달에서 "어떤 작업이 동기화 실패했는지" 보여주기 위한 lookup.
 *
 * Convention: "{entity}:{verb}" — entity별 verb (create/update/delete 등) 매핑.
 * 매핑 없는 경우 fallback "변경" 사용 (예외 안전).
 */
const CONTEXT_LABELS: Record<string, string> = {
  "session:create": "수업 추가",
  "session:update": "수업 위치 변경",
  "session:delete": "수업 삭제",
  "student:create": "학생 추가",
  "student:update": "학생 정보 수정",
  "student:delete": "학생 삭제",
  "subject:create": "과목 추가",
  "subject:update": "과목 정보 수정",
  "subject:delete": "과목 삭제",
  "enrollment:create": "수강 등록",
  "enrollment:delete": "수강 취소",
  "teacher:create": "강사 추가",
  "teacher:update": "강사 정보 수정",
  "teacher:delete": "강사 삭제",
  "teacher-subject:add": "강사 담당 과목 추가",
  "teacher-subject:remove": "강사 담당 과목 제거",
};

export function getContextLabel(context: string): string {
  return CONTEXT_LABELS[context] ?? "변경";
}

// ===== 재시도 큐 상태 =====

let consecutiveFailures = 0;
let firstFailToastShown = false;
let escalatedToastShown = false;
/** retry 10회 모두 소진 후 silent 포기 상태. onSyncSuccess 시 false로 reset. */
let gaveUp = false;
/**
 * 가장 최근 실패한 sync의 context — 토스트/indicator에 어떤 작업이 실패했는지
 * 표시하기 위함. 여러 entity 연속 실패 시 마지막 것만 보임 (단순화) — outbox
 * 모달이 전체 리스트를 보여주므로 토스트는 representative 한 개로 충분.
 */
let lastFailureContext: string | null = null;
/**
 * fireAndForget이 5xx/network 오류 시 스케줄한 retry setTimeout id 추적.
 * test isolation 보장 — __resetSyncStateForTests에서 일괄 clearTimeout.
 * production에선 retry 정상 동작 (set add/delete만 추가, 동작 무영향).
 *
 * 도입 배경: 2026-05-11 dev CI에서 'TypeError: Cannot read properties of
 * undefined (reading 'then')' 반복 발생. 5xx mock test 종료 후 1초 retry
 * callback이 vi.restoreAllMocks 거친 mockFetch() 호출 → undefined.then().
 */
const pendingRetryTimers = new Set<ReturnType<typeof setTimeout>>();

// ===== 사용자 노출용 sync 상태 (헤더 indicator 등 영구 visible UI) =====

export type SyncStatus = "idle" | "failed_retrying" | "failed_giving_up";

const syncStatusEvents = new EventTarget();

function deriveStatus(): SyncStatus {
  if (consecutiveFailures === 0) return "idle";
  if (gaveUp) return "failed_giving_up";
  return "failed_retrying";
}

let lastDispatchedStatus: SyncStatus = "idle";

function notifySyncStatusChange(): void {
  const next = deriveStatus();
  if (next === lastDispatchedStatus) return;
  lastDispatchedStatus = next;
  syncStatusEvents.dispatchEvent(
    new CustomEvent("change", { detail: next }),
  );
}

/**
 * 현재 sync 상태 — React 외부에서 한 번만 읽을 때.
 * React 컴포넌트는 useSyncStatus() hook 사용.
 */
export function getSyncStatus(): SyncStatus {
  return deriveStatus();
}

/**
 * sync 상태 변경 listener 등록. unsubscribe 함수 반환.
 */
export function subscribeSyncStatus(
  callback: (status: SyncStatus) => void,
): () => void {
  const handler = (e: Event) => {
    callback((e as CustomEvent<SyncStatus>).detail);
  };
  syncStatusEvents.addEventListener("change", handler);
  return () => syncStatusEvents.removeEventListener("change", handler);
}

// ===== self-sync 이벤트 (사용자 본인 변경 감지) =====
//
// 사용자가 sessions/students/etc. 변경을 발사할 때마다 server-side trigger가
// `academies.schedule_updated_at`을 bump 함. useScheduleMeta가 30초마다 polling
// 으로 그 timestamp를 fetch하는데, 본인 변경도 같이 잡혀서 banner가 잘못 뜸.
//
// 해결: sync 성공 시 selfSyncEvents에 dispatch → useScheduleMeta가 구독 →
// "마지막 본인 sync" 시각 기록. polling 결과의 server timestamp가 그 시각의
// 윈도우 안이면 본인 변경으로 판단 → 자동 ack (banner 발화 안 함).

const selfSyncEvents = new EventTarget();

/**
 * 본인 sync 발사 이벤트 listener 등록. unsubscribe 함수 반환.
 *
 * useScheduleMeta가 구독해서 lastSelfSyncAt timestamp 갱신.
 */
export function subscribeSelfSync(callback: () => void): () => void {
  const handler = () => callback();
  selfSyncEvents.addEventListener("self-sync", handler);
  return () => selfSyncEvents.removeEventListener("self-sync", handler);
}

/**
 * 본인 sync 신호 — 같은 탭의 EventTarget + 다른 탭/페이지 reload 후를 위한 localStorage.
 *
 * - EventTarget: 같은 탭의 useScheduleMeta가 즉시 구독 (실시간 ref 갱신)
 * - localStorage: 다른 탭의 useScheduleMeta가 storage event로 받음 + page reload
 *   직후 mount fallback에 사용 (이전 세션의 self-sync 시각 복구)
 */
export const SELF_SYNC_STORAGE_KEY = "class_planner_last_self_sync";

/**
 * 본인 sync 신호를 dispatch한다 — apiSync 함수가 아닌 경로(fullDataMigration 등
 * 직접 fetch 사용)에서도 본인 변경을 useScheduleMeta가 인지하도록 export.
 *
 * 호출 시점: sessions(또는 schedule_updated_at trigger source) INSERT/UPDATE/DELETE
 * 성공 직후. server timestamp가 SELF_SYNC_WINDOW_MS(10초) 안으로 들어와야 자동 ack.
 */
export function notifySelfSync(): void {
  selfSyncEvents.dispatchEvent(new CustomEvent("self-sync"));
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SELF_SYNC_STORAGE_KEY, String(Date.now()));
    } catch {
      // QuotaExceededError 등은 silent — 본인 변경 감지는 best-effort
    }
  }
}

function onSyncSuccess(): void {
  // 본인 변경 신호 — useScheduleMeta가 구독해서 lastSelfSyncAt 갱신.
  // 성공한 모든 sync(POST/PUT/DELETE)에서 발사하면 server timestamp bump 시점과
  // 본인 sync 시점이 거의 일치 → 다음 polling tick에서 윈도우 안으로 잡힘.
  notifySelfSync();

  if (consecutiveFailures > 0) {
    consecutiveFailures = 0;
    if (firstFailToastShown || escalatedToastShown) {
      // 사용자가 이전 실패 토스트를 봤을 가능성이 있을 때만 복구 알림.
      showToast("success", "서버 동기화가 정상 복구됐습니다.");
    }
    firstFailToastShown = false;
    escalatedToastShown = false;
    gaveUp = false;
    lastFailureContext = null;
    notifySyncStatusChange();
  }
}

function onSyncFailure(context: string): void {
  consecutiveFailures++;
  lastFailureContext = context;
  const label = getContextLabel(context);
  if (consecutiveFailures === 1 && !firstFailToastShown) {
    firstFailToastShown = true;
    // 첫 실패 즉시 — silent failure 방지. 어떤 작업인지 사용자에게 알림.
    showToast(
      "warning",
      `${label} 동기화가 지연되고 있어요. 로컬은 안전하며 자동 재시도 중입니다.`,
    );
  } else if (consecutiveFailures >= 3 && !escalatedToastShown) {
    escalatedToastShown = true;
    showToast(
      "error",
      `${label} 동기화 3회 실패 — 헤더의 "재시도 중" 표시를 클릭해 큐를 확인하세요.`,
    );
  }
  logger.error(`apiSync ${context} 실패 (연속 ${consecutiveFailures}회)`);
  notifySyncStatusChange();
}

/**
 * 현재 가장 최근 실패한 sync의 라벨. 헤더 indicator/모달에서 표시용.
 * 실패 없을 때 null.
 */
export function getLastFailureContext(): string | null {
  return lastFailureContext;
}

function onSyncGiveUp(context: string): void {
  gaveUp = true;
  logger.error(`apiSync ${context} 10회 retry 후 포기`);
  notifySyncStatusChange();
}

/**
 * 테스트 전용 — 모듈 상태 리셋. production에서 호출 금지.
 */
export function __resetSyncStateForTests(): void {
  consecutiveFailures = 0;
  firstFailToastShown = false;
  escalatedToastShown = false;
  gaveUp = false;
  lastFailureContext = null;
  lastDispatchedStatus = "idle";
  pendingGhostCount = 0;
  if (pendingGhostTimer) {
    clearTimeout(pendingGhostTimer);
    pendingGhostTimer = null;
  }
  // pending retry setTimeout 정리 — test 끝난 후 callback이 reset된 mockFetch
  // 호출하면서 'undefined.then' TypeError 발생하는 leak 방지 (2026-05-11 dev CI).
  for (const t of pendingRetryTimers) clearTimeout(t);
  pendingRetryTimers.clear();
  recentCreatesById.clear();
}

/**
 * exponential backoff: 1s → 2s → 4s → … (최대 30초)
 */
function calcDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30_000);
}

/**
 * 10회 retry 후 포기 시점에 sync 항목을 outbox에 저장하기 위한 메타데이터.
 * 호출자가 전달하면 fireAndForget이 retry exhaust 시점에 enqueueOutbox 호출.
 *
 * 5xx/network 오류만 보관 (4xx는 retry/큐잉 무의미 — 드롭).
 */
export interface OutboxRequestMeta {
  /** dedup용 unique id (entity id 기반 권장) */
  id: string;
  userId: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  body?: unknown;
}

function fireAndForget(
  makeRequest: () => Promise<Response>,
  context: string,
  attempt = 0,
  outboxMeta?: OutboxRequestMeta,
  /**
   * 서버가 404 응답한 경우 호출. PUT/DELETE에서 sessionId가 server에 없는
   * "ghost" 상태를 의미. 호출자가 localStorage에서 해당 항목 정리하여 다음
   * 시도부터 발생하지 않도록.
   */
  onGhost?: () => void,
): void {
  makeRequest()
    .then((res) => {
      if (!res.ok) {
        res
          .json()
          .catch(() => null)
          .then((body) => {
            logger.error(`apiSync ${context} HTTP 오류`, {
              status: res.status,
              body,
            });
          });
        // 404 → ghost (server에 항목 없음). retry 무의미 + outbox 부적격.
        if (res.status === 404 && onGhost) {
          onGhost();
          // 카운터 리셋 — 다음 정상 호출에 영향 없게
          onSyncSuccess();
          return;
        }
        // ⚠️ 4xx fast-fail (2026-05-04): 4xx는 client/data 자체 문제라 retry 무의미.
        // 이전엔 10회 retry 폭주 + 그 동안 indicator "재시도 중" 유지 → 사용자가
        // indicator 클릭하면 outbox 비어있어 (4xx는 outbox 부적격) "큐 비어있는데
        // 왜 indicator 보임?" 혼란 발생. 즉시 give-up으로 한 사이클 단축.
        if (res.status >= 400 && res.status < 500) {
          onSyncFailure(context);
          onSyncGiveUp(context);
          return;
        }
        onSyncFailure(context);
        if (attempt < 9) {
          const delay = calcDelay(attempt);
          const timerId = setTimeout(() => {
            pendingRetryTimers.delete(timerId);
            fireAndForget(makeRequest, context, attempt + 1, outboxMeta, onGhost);
          }, delay);
          pendingRetryTimers.add(timerId);
        } else {
          onSyncGiveUp(context);
          // 5xx만 outbox 보관 (4xx는 위에서 fast-fail 처리됨)
          if (outboxMeta && res.status >= 500) {
            enqueueOutbox(outboxMeta.userId, {
              id: outboxMeta.id,
              context,
              method: outboxMeta.method,
              url: outboxMeta.url,
              body: outboxMeta.body,
            });
          }
        }
      } else {
        onSyncSuccess();
      }
    })
    .catch((err) => {
      logger.error(`apiSync ${context} 네트워크 오류`, undefined, err as Error);
      onSyncFailure(context);
      if (attempt < 9) {
        const delay = calcDelay(attempt);
        const timerId = setTimeout(() => {
          pendingRetryTimers.delete(timerId);
          fireAndForget(makeRequest, context, attempt + 1, outboxMeta, onGhost);
        }, delay);
        pendingRetryTimers.add(timerId);
      } else {
        onSyncGiveUp(context);
        // 네트워크 오류 — 보관 (다음 페이지 진입 시 재시도)
        if (outboxMeta) {
          enqueueOutbox(outboxMeta.userId, {
            id: outboxMeta.id,
            context,
            method: outboxMeta.method,
            url: outboxMeta.url,
            body: outboxMeta.body,
          });
        }
      }
    });
}

// ===== Students =====

export function syncStudentCreate(
  userId: string | null,
  data: { id?: string; name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): void {
  if (!userId) return;
  // Phase 3: 송신 직전 검증 — UI 우회(devtools 등) 방지. 실패 시 toast + return.
  const v = validateStudentInput(data);
  if (!v.ok) {
    logger.warn("syncStudentCreate: validation failed", { code: v.code });
    showError(getKoMessage(v.code));
    return;
  }
  const safe = v.data;
  const url = `/api/students?userId=${encodeURIComponent(userId)}`;
  // Local-first: client UUID 포함 그대로 전송. server는 받은 id를 INSERT에 사용
  // → 후속 PUT /api/students/{id} 시 id 매칭 보장 (이전엔 server가 자체 id 발급
  // 하여 client localStorage와 불일치 → ghost 누적, PUT 404 무한 루프).
  const body = {
    ...(data.id && { id: data.id }),
    name: safe.name,
    gender: safe.gender,
    birthDate: safe.birthDate,
    grade: safe.grade,
    school: safe.school,
    phone: safe.phone,
  };
  const makeRequest = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  fireAndForget(makeRequest, "student:create", 0, {
    // outbox dedup: client id 있으면 그대로 사용 (재시도 시 idempotent)
    id: data.id ? `student:create:${data.id}` : makeOutboxId("student:create"),
    userId,
    method: "POST",
    url,
    body,
  });
}

/**
 * Awaitable student create — 응답으로 server가 반환한 student id를 돌려준다.
 *
 * Idempotent server 계약: server `POST /api/students`가 id 충돌 시 *기존 row의
 * id*를 반환. 클라이언트는 응답 id가 보낸 id와 다르면 localStorage(students +
 * enrollments[].studentId)를 reconcile해야 함. 호출자(useStudentManagementLocal.
 * addStudent) 책임.
 *
 * 실패 시 (네트워크 down / 5xx) `null` 반환 + 기존 fire-and-forget outbox로 재시도.
 */
export async function syncStudentCreateAsync(
  userId: string | null,
  data: { id: string; name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): Promise<{ id: string } | null> {
  if (!userId) return null;
  const v = validateStudentInput(data);
  if (!v.ok) {
    logger.warn("syncStudentCreateAsync: validation failed", { code: v.code });
    showError(getKoMessage(v.code));
    return null;
  }
  const safeBody = { ...data, ...v.data };
  const url = `/api/students?userId=${encodeURIComponent(userId)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBody),
    });
    if (!res.ok) {
      syncStudentCreate(userId, data);
      return null;
    }
    const payload = (await res.json()) as { success?: boolean; data?: { id?: string } };
    const serverId = payload?.data?.id;
    if (!serverId) {
      syncStudentCreate(userId, data);
      return null;
    }
    return { id: serverId };
  } catch {
    syncStudentCreate(userId, data);
    return null;
  }
}

export function syncStudentUpdate(
  userId: string | null,
  id: string,
  data: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): void {
  if (!userId) return;
  const v = validateStudentInput(data, { partial: true });
  if (!v.ok) {
    logger.warn("syncStudentUpdate: validation failed", { code: v.code, id });
    showError(getKoMessage(v.code));
    return;
  }
  const safe = v.data;
  const url = `/api/students/${id}?userId=${encodeURIComponent(userId)}`;
  const body = {
    name: safe.name,
    gender: safe.gender,
    birthDate: safe.birthDate,
    grade: safe.grade,
    school: data.school,
    phone: data.phone,
  };
  const makeRequest = () =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  fireAndForget(makeRequest, "student:update", 0, {
    id: `student:update:${id}`,
    userId,
    method: "PUT",
    url,
    body,
  });
}

export function syncStudentDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const url = `/api/students/${id}?userId=${encodeURIComponent(userId)}`;
  const makeRequest = () => fetch(url, { method: "DELETE" });
  fireAndForget(makeRequest, "student:delete", 0, {
    id: `student:delete:${id}`,
    userId,
    method: "DELETE",
    url,
  });
}

// ===== Subjects =====

export function syncSubjectCreate(
  userId: string | null,
  data: { id?: string; name: string; color: string }
): void {
  if (!userId) return;
  const v = validateSubjectInput(data);
  if (!v.ok) {
    logger.warn("syncSubjectCreate: validation failed", { code: v.code });
    showError(getKoMessage(v.code));
    return;
  }
  const safe = v.data;
  const url = `/api/subjects?userId=${encodeURIComponent(userId)}`;
  // Local-first: client UUID 포함 그대로 전송. id mismatch ghost 방지.
  const body = {
    ...(data.id && { id: data.id }),
    name: safe.name,
    color: data.color,
  };
  const makeRequest = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  fireAndForget(makeRequest, "subject:create", 0, {
    id: data.id ? `subject:create:${data.id}` : makeOutboxId("subject:create"),
    userId,
    method: "POST",
    url,
    body,
  });
}

/**
 * Awaitable subject create. 응답 id가 보낸 id와 다르면 호출자가
 * localStorage(subjects + enrollments[].subjectId)를 reconcile.
 */
export async function syncSubjectCreateAsync(
  userId: string | null,
  data: { id: string; name: string; color: string }
): Promise<{ id: string } | null> {
  if (!userId) return null;
  const v = validateSubjectInput(data);
  if (!v.ok) {
    logger.warn("syncSubjectCreateAsync: validation failed", { code: v.code });
    showError(getKoMessage(v.code));
    return null;
  }
  const safeBody = { ...data, ...v.data };
  const url = `/api/subjects?userId=${encodeURIComponent(userId)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBody),
    });
    if (!res.ok) {
      syncSubjectCreate(userId, data);
      return null;
    }
    const payload = (await res.json()) as { success?: boolean; data?: { id?: string } };
    const serverId = payload?.data?.id;
    if (!serverId) {
      syncSubjectCreate(userId, data);
      return null;
    }
    return { id: serverId };
  } catch {
    syncSubjectCreate(userId, data);
    return null;
  }
}

export function syncSubjectUpdate(
  userId: string | null,
  id: string,
  data: { name?: string; color?: string }
): void {
  if (!userId) return;
  const v = validateSubjectInput(data, { partial: true });
  if (!v.ok) {
    logger.warn("syncSubjectUpdate: validation failed", { code: v.code, id });
    showError(getKoMessage(v.code));
    return;
  }
  const safeBody = { ...data, ...v.data };
  const url = `/api/subjects/${id}?userId=${encodeURIComponent(userId)}`;
  const makeRequest = () =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBody),
    });
  fireAndForget(makeRequest, "subject:update", 0, {
    id: `subject:update:${id}`,
    userId,
    method: "PUT",
    url,
    body: safeBody,
  });
}

export function syncSubjectDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const url = `/api/subjects/${id}?userId=${encodeURIComponent(userId)}`;
  const makeRequest = () => fetch(url, { method: "DELETE" });
  fireAndForget(makeRequest, "subject:delete", 0, {
    id: `subject:delete:${id}`,
    userId,
    method: "DELETE",
    url,
  });
}

// ===== Enrollments =====

export function syncEnrollmentCreate(
  userId: string | null,
  data: { id?: string; studentId: string; subjectId: string }
): void {
  if (!userId) return;
  const url = `/api/enrollments?userId=${encodeURIComponent(userId)}`;
  const makeRequest = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  // outbox dedup: client id 있으면 그대로 사용 (재시도 시 idempotent)
  fireAndForget(makeRequest, "enrollment:create", 0, {
    id: data.id ? `enrollment:create:${data.id}` : makeOutboxId("enrollment:create"),
    userId,
    method: "POST",
    url,
    body: data,
  });
}

/**
 * Awaitable enrollment create — 응답으로 server가 반환한 enrollment id를 돌려준다.
 *
 * Idempotent server 계약: server `POST /api/enrollments`가 (student_id, subject_id)
 * UNIQUE 충돌 시 *기존 row의 id*를 200으로 반환. 클라이언트는 이 응답 id가
 * 보낸 id와 다르면 localStorage(enrollments + sessions[].enrollmentIds)를
 * reconcile해야 함. 호출자(useIntegratedDataLocal.addEnrollment) 책임.
 *
 * 실패 시 (네트워크 down / 5xx) `null` 반환 + 기존 fire-and-forget outbox로 재시도.
 */
export async function syncEnrollmentCreateAsync(
  userId: string | null,
  data: { id: string; studentId: string; subjectId: string }
): Promise<{ id: string } | null> {
  if (!userId) return null;
  const url = `/api/enrollments?userId=${encodeURIComponent(userId)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      // 네트워크 도달했으나 server 5xx — outbox로 재시도 위임
      syncEnrollmentCreate(userId, data);
      return null;
    }
    const payload = (await res.json()) as { success?: boolean; data?: { id?: string } };
    const serverId = payload?.data?.id;
    if (!serverId) {
      syncEnrollmentCreate(userId, data);
      return null;
    }
    return { id: serverId };
  } catch {
    // fetch 자체 실패 (offline 등) — outbox 위임
    syncEnrollmentCreate(userId, data);
    return null;
  }
}

export function syncEnrollmentDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const url = `/api/enrollments?id=${id}&userId=${encodeURIComponent(userId)}`;
  const makeRequest = () => fetch(url, { method: "DELETE" });
  fireAndForget(makeRequest, "enrollment:delete", 0, {
    id: `enrollment:delete:${id}`,
    userId,
    method: "DELETE",
    url,
  });
}

// ===== Sessions =====
// sessions는 사고 직접 영향 받은 도메인 — outbox 통합으로 데이터 손실 방지.

function makeOutboxId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}:${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function syncSessionCreate(
  userId: string | null,
  /**
   * Local-first: client UUID(`Session.id`) 포함 그대로 전송. 서버는 받은 id를
   * INSERT에 사용 → 후속 PUT /position 등의 id 매칭 보장 (이전엔 server가
   * 자체 id 발급하여 client localStorage와 불일치 → ghost 누적).
   * 추적: client가 새로 만든 session이 ghost cleanup으로 즉시 삭제되던 사고.
   */
  data: Session | Omit<Session, "id">
): void {
  if (!userId) return;
  const url = `/api/sessions?userId=${encodeURIComponent(userId)}`;
  const makeRequest = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  const dataId = (data as Session).id;
  // race guard: 후속 PUT /position 등이 POST보다 먼저 도달해 404 받을 때
  // ghost cleanup이 즉시 삭제하던 사고 방지. 30s 동안 cleanup 보류.
  if (dataId) markRecentCreate(dataId);
  fireAndForget(makeRequest, "session:create", 0, {
    id: dataId ? `session:create:${dataId}` : makeOutboxId("session:create"),
    userId,
    method: "POST",
    url,
    body: data,
  });
}

export function syncSessionUpdate(
  userId: string | null,
  id: string,
  data: Partial<Omit<Session, "id">>
): void {
  if (!userId) return;
  // ⚠️ Bug fix (2026-05-04): 이전엔 URL에 ?userId= 쿼리 누락 → server PUT handler가
  // userId required 체크에서 400 반환. 모든 modal-edit + 일부 bulk drag sync가
  // silent failure (omni-radar 04:37 14건 PUT 400 확인). 동일 사고가 PR #194에서
  // syncSessionUpdateAsync에서 fix됐지만 fire-and-forget version은 누락됐음.
  const url = `/api/sessions/${id}?userId=${encodeURIComponent(userId)}`;
  const body = { id, ...data };
  const makeRequest = () =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  fireAndForget(
    makeRequest,
    "session:update",
    0,
    {
      // 같은 세션의 update는 마지막 것만 남도록 entity id를 outbox key로 사용
      id: `session:update:${id}`,
      userId,
      method: "PUT",
      url,
      body,
    },
    () => cleanupGhostSession(id),
  );
}

/** awaitable 버전 — drag-drop 완료 후 서버 sync 결과를 확인할 때 사용.
 *  위치 전용 엔드포인트(/position)를 사용하며 필드명도 API 스펙에 맞춤.
 *
 *  ⚠️ Bug fix (2026-05-04): URL에 ?userId= 쿼리 누락으로 모든 호출이 400 반환되어
 *  drag-drop으로 위치/시간 변경한 sessions이 서버에 반영되지 않던 회귀.
 *  omni-radar 로그(5/3 4건 PUT 400)로 확정.
 */
export async function syncSessionUpdateAsync(
  userId: string | null,
  id: string,
  data: Partial<Omit<Session, "id">>
): Promise<boolean> {
  if (!userId) return false;
  const url = `/api/sessions/${id}/position?userId=${encodeURIComponent(userId)}`;
  const body = {
    weekday: data.weekday,
    time: data.startsAt, // API 필드명: time (= startsAt)
    endTime: data.endsAt, // API 필드명: endTime (= endsAt)
    yPosition: data.yPosition,
  };
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // 404 → ghost session — localStorage 정리
    if (res.status === 404) cleanupGhostSession(id);
    if (res.ok) {
      onSyncSuccess();
      return true;
    }
    // 4xx (404 제외) — bad request, 데이터 자체 문제. retry 무의미 → outbox X
    // 5xx — server 일시 장애. outbox에 보관해 다음 페이지 진입 시 재시도.
    onSyncFailure("session:update");
    if (res.status >= 500) {
      enqueueOutbox(userId, {
        id: `session:update:${id}`,
        context: "session:update",
        method: "PUT",
        url,
        body,
      });
    }
    return false;
  } catch (err) {
    // 네트워크 오류 — outbox 보관
    onSyncFailure("session:update");
    enqueueOutbox(userId, {
      id: `session:update:${id}`,
      context: "session:update",
      method: "PUT",
      url,
      body,
    });
    logger.error("syncSessionUpdateAsync 네트워크 오류", { id }, err as Error);
    return false;
  }
}

export function syncSessionDelete(userId: string | null, id: string): void {
  if (!userId) return;
  // ⚠️ Bug fix (2026-05-04): URL에 ?userId= 누락 → server DELETE handler가
  // userId required 체크 → 400 반복. omni-radar 05:23~05:25 다수 DELETE 400 확인.
  // PR #205의 syncSessionUpdate fix와 동일 패턴이지만 syncSessionDelete는
  // 누락됐었음.
  const url = `/api/sessions?id=${id}&userId=${encodeURIComponent(userId)}`;
  const makeRequest = () => fetch(url, { method: "DELETE" });
  fireAndForget(
    makeRequest,
    "session:delete",
    0,
    {
      id: `session:delete:${id}`,
      userId,
      method: "DELETE",
      url,
    },
    // DELETE 404 — 이미 server에 없으니 localStorage 정리는 무의미하지만
    // 일관성을 위해 ghost cleanup 호출 (이미 제거된 상태라 noop)
    () => cleanupGhostSession(id),
  );
}

// ===== Teachers =====

export function syncTeacherCreate(
  userId: string | null,
  data: {
    id?: string;
    name: string;
    color: string;
    userId?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    notes?: string | null;
  }
): void {
  if (!userId) return;
  const v = validateTeacherInput({ name: data.name, email: data.email, phone: data.phone });
  if (!v.ok) {
    logger.warn("syncTeacherCreate: validation failed", { code: v.code });
    showError(getKoMessage(v.code));
    return;
  }
  const safe = v.data;
  const url = `/api/teachers?userId=${encodeURIComponent(userId)}`;
  // Local-first: client UUID 포함 그대로 전송. id mismatch ghost 방지.
  const body = {
    ...(data.id && { id: data.id }),
    name: safe.name,
    color: data.color,
    userId: data.userId,
    email: safe.email ?? data.email,
    phone: safe.phone ?? data.phone,
    role: data.role,
    notes: data.notes,
  };
  const makeRequest = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  fireAndForget(makeRequest, "teacher:create", 0, {
    id: data.id ? `teacher:create:${data.id}` : makeOutboxId("teacher:create"),
    userId,
    method: "POST",
    url,
    body,
  });
}

/**
 * Awaitable teacher create. 응답 id가 보낸 id와 다르면 호출자가
 * localStorage(teachers + sessions[].teacherId)를 reconcile.
 */
export async function syncTeacherCreateAsync(
  userId: string | null,
  data: {
    id: string;
    name: string;
    color: string;
    userId?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    notes?: string | null;
  }
): Promise<{ id: string } | null> {
  if (!userId) return null;
  const v = validateTeacherInput({ name: data.name, email: data.email, phone: data.phone });
  if (!v.ok) {
    logger.warn("syncTeacherCreateAsync: validation failed", { code: v.code });
    showError(getKoMessage(v.code));
    return null;
  }
  const safeBody = { ...data, name: v.data.name ?? data.name };
  const url = `/api/teachers?userId=${encodeURIComponent(userId)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBody),
    });
    if (!res.ok) {
      syncTeacherCreate(userId, data);
      return null;
    }
    const payload = (await res.json()) as { success?: boolean; data?: { id?: string } };
    const serverId = payload?.data?.id;
    if (!serverId) {
      syncTeacherCreate(userId, data);
      return null;
    }
    return { id: serverId };
  } catch {
    syncTeacherCreate(userId, data);
    return null;
  }
}

export function syncTeacherUpdate(
  userId: string | null,
  id: string,
  data: {
    name?: string;
    color?: string;
    userId?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    notes?: string | null;
  }
): void {
  if (!userId) return;
  const v = validateTeacherInput(
    { name: data.name, email: data.email, phone: data.phone },
    { partial: true },
  );
  if (!v.ok) {
    logger.warn("syncTeacherUpdate: validation failed", { code: v.code, id });
    showError(getKoMessage(v.code));
    return;
  }
  const safeBody = { ...data, ...(v.data.name !== undefined && { name: v.data.name }) };
  const url = `/api/teachers/${id}?userId=${encodeURIComponent(userId)}`;
  const makeRequest = () =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBody),
    });
  fireAndForget(makeRequest, "teacher:update", 0, {
    id: `teacher:update:${id}`,
    userId,
    method: "PUT",
    url,
    body: safeBody,
  });
}

export function syncTeacherDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const url = `/api/teachers/${id}?userId=${encodeURIComponent(userId)}`;
  const makeRequest = () => fetch(url, { method: "DELETE" });
  fireAndForget(makeRequest, "teacher:delete", 0, {
    id: `teacher:delete:${id}`,
    userId,
    method: "DELETE",
    url,
  });
}

export function syncTeacherSubjectAdd(
  userId: string | null,
  teacherId: string,
  subjectId: string
): void {
  if (!userId) return;
  const url = `/api/teacher-subjects?userId=${encodeURIComponent(userId)}`;
  const body = { teacherId, subjectId };
  const makeRequest = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  fireAndForget(makeRequest, "teacher:subject:add", 0, {
    // (teacherId, subjectId) M:N pair는 idempotent — 같은 pair add 중복 시 마지막만 keep
    id: `teacher:subject:add:${teacherId}:${subjectId}`,
    userId,
    method: "POST",
    url,
    body,
  });
}

export function syncTeacherSubjectRemove(
  userId: string | null,
  teacherId: string,
  subjectId: string
): void {
  if (!userId) return;
  const url = `/api/teacher-subjects?userId=${encodeURIComponent(userId)}`;
  const body = { teacherId, subjectId };
  const makeRequest = () =>
    fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  fireAndForget(makeRequest, "teacher:subject:remove", 0, {
    id: `teacher:subject:remove:${teacherId}:${subjectId}`,
    userId,
    method: "DELETE",
    url,
    body,
  });
}
