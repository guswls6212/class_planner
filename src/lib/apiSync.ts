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
import { showToast } from "./toast";
import { enqueueOutbox } from "./syncOutbox";
import type { Session } from "../lib/planner";

// ===== 재시도 큐 상태 =====

let consecutiveFailures = 0;
let firstFailToastShown = false;
let escalatedToastShown = false;
/** retry 10회 모두 소진 후 silent 포기 상태. onSyncSuccess 시 false로 reset. */
let gaveUp = false;

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

function onSyncSuccess(): void {
  if (consecutiveFailures > 0) {
    consecutiveFailures = 0;
    if (firstFailToastShown || escalatedToastShown) {
      // 사용자가 이전 실패 토스트를 봤을 가능성이 있을 때만 복구 알림.
      showToast("success", "서버 동기화가 정상 복구됐습니다.");
    }
    firstFailToastShown = false;
    escalatedToastShown = false;
    gaveUp = false;
    notifySyncStatusChange();
  }
}

function onSyncFailure(context: string): void {
  consecutiveFailures++;
  if (consecutiveFailures === 1 && !firstFailToastShown) {
    firstFailToastShown = true;
    // 첫 실패 즉시 — silent failure 방지. 로컬은 안전하다고 안심시킴.
    showToast(
      "warning",
      "서버 저장이 지연되고 있어요. 로컬은 안전 — 자동 재시도 중입니다.",
    );
  } else if (consecutiveFailures >= 3 && !escalatedToastShown) {
    escalatedToastShown = true;
    showToast(
      "error",
      "서버 동기화 3회 실패 — 인터넷 연결 또는 새로고침을 확인해주세요.",
    );
  }
  logger.error(`apiSync ${context} 실패 (연속 ${consecutiveFailures}회)`);
  notifySyncStatusChange();
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
  lastDispatchedStatus = "idle";
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
        onSyncFailure(context);
        if (attempt < 9) {
          const delay = calcDelay(attempt);
          setTimeout(
            () => fireAndForget(makeRequest, context, attempt + 1, outboxMeta),
            delay,
          );
        } else {
          onSyncGiveUp(context);
          // 5xx만 outbox 보관 (4xx는 데이터 자체가 잘못된 것 → 큐잉 무의미)
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
        setTimeout(
          () => fireAndForget(makeRequest, context, attempt + 1, outboxMeta),
          delay,
        );
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
  data: { name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/students?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        gender: data.gender,
        birthDate: data.birthDate,
        grade: data.grade,
        school: data.school,
        phone: data.phone,
      }),
    });
  fireAndForget(makeRequest, "student:create");
}

export function syncStudentUpdate(
  userId: string | null,
  id: string,
  data: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/students/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        gender: data.gender,
        birthDate: data.birthDate,
        grade: data.grade,
        school: data.school,
        phone: data.phone,
      }),
    });
  fireAndForget(makeRequest, "student:update");
}

export function syncStudentDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/students/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  fireAndForget(makeRequest, "student:delete");
}

// ===== Subjects =====

export function syncSubjectCreate(
  userId: string | null,
  data: { name: string; color: string }
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/subjects?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  fireAndForget(makeRequest, "subject:create");
}

export function syncSubjectUpdate(
  userId: string | null,
  id: string,
  data: { name?: string; color?: string }
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/subjects/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  fireAndForget(makeRequest, "subject:update");
}

export function syncSubjectDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/subjects/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  fireAndForget(makeRequest, "subject:delete");
}

// ===== Enrollments =====

export function syncEnrollmentCreate(
  userId: string | null,
  data: { studentId: string; subjectId: string }
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/enrollments?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  fireAndForget(makeRequest, "enrollment:create");
}

export function syncEnrollmentDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/enrollments?id=${id}&userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  fireAndForget(makeRequest, "enrollment:delete");
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
  data: Omit<Session, "id">
): void {
  if (!userId) return;
  const url = `/api/sessions?userId=${encodeURIComponent(userId)}`;
  const makeRequest = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  fireAndForget(makeRequest, "session:create", 0, {
    id: makeOutboxId("session:create"),
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
  const url = `/api/sessions/${id}`;
  const body = { id, ...data };
  const makeRequest = () =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  fireAndForget(makeRequest, "session:update", 0, {
    // 같은 세션의 update는 마지막 것만 남도록 entity id를 outbox key로 사용
    id: `session:update:${id}`,
    userId,
    method: "PUT",
    url,
    body,
  });
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
  try {
    const res = await fetch(
      `/api/sessions/${id}/position?userId=${encodeURIComponent(userId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekday: data.weekday,
          time: data.startsAt,      // API 필드명: time (= startsAt)
          endTime: data.endsAt,     // API 필드명: endTime (= endsAt)
          yPosition: data.yPosition,
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function syncSessionDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const url = `/api/sessions?id=${id}`;
  const makeRequest = () => fetch(url, { method: "DELETE" });
  fireAndForget(makeRequest, "session:delete", 0, {
    id: `session:delete:${id}`,
    userId,
    method: "DELETE",
    url,
  });
}

// ===== Teachers =====

export function syncTeacherCreate(
  userId: string | null,
  data: {
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
  const makeRequest = () =>
    fetch(`/api/teachers?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  fireAndForget(makeRequest, "teacher:create");
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
  const makeRequest = () =>
    fetch(`/api/teachers/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  fireAndForget(makeRequest, "teacher:update");
}

export function syncTeacherDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/teachers/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  fireAndForget(makeRequest, "teacher:delete");
}

export function syncTeacherSubjectAdd(
  userId: string | null,
  teacherId: string,
  subjectId: string
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/teacher-subjects?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, subjectId }),
    });
  fireAndForget(makeRequest, "teacher:subject:add");
}

export function syncTeacherSubjectRemove(
  userId: string | null,
  teacherId: string,
  subjectId: string
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/teacher-subjects?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, subjectId }),
    });
  fireAndForget(makeRequest, "teacher:subject:remove");
}
