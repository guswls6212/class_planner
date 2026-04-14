/**
 * 클라이언트 CRUD 결과를 서버와 동기화하는 fire-and-forget 유틸리티.
 *
 * - userId가 null이면 (익명 사용자) 서버 호출 스킵
 * - API 실패 시 exponential backoff 재시도 (max 10회, delay 최대 30s)
 * - 3회 연속 실패 시 사용자에게 toast 알림 1회 표시
 * - 재성공 시 상태 리셋
 * - localStorage가 SSOT이며 서버 동기화는 백그라운드
 */

import { logger } from "./logger";
import { showToast } from "./toast";
import type { Session } from "../lib/planner";

// ===== 재시도 큐 상태 =====

let consecutiveFailures = 0;
let toastShown = false;

function onSyncSuccess(): void {
  if (consecutiveFailures > 0) {
    consecutiveFailures = 0;
    toastShown = false;
  }
}

function onSyncFailure(context: string): void {
  consecutiveFailures++;
  if (consecutiveFailures >= 3 && !toastShown) {
    toastShown = true;
    showToast("warning", "서버 동기화 지연 중 — 로컬 데이터는 안전합니다.");
  }
  logger.error(`apiSync ${context} 실패 (연속 ${consecutiveFailures}회)`);
}

/**
 * exponential backoff: 1s → 2s → 4s → … (최대 30초)
 */
function calcDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30_000);
}

function fireAndForget(
  makeRequest: () => Promise<Response>,
  context: string,
  attempt = 0
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
          setTimeout(() => fireAndForget(makeRequest, context, attempt + 1), delay);
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
        setTimeout(() => fireAndForget(makeRequest, context, attempt + 1), delay);
      }
    });
}

// ===== Students =====

export function syncStudentCreate(
  userId: string | null,
  data: { name: string; gender?: string; birthDate?: string }
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/students?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, gender: data.gender, birthDate: data.birthDate }),
    });
  fireAndForget(makeRequest, "student:create");
}

export function syncStudentUpdate(
  userId: string | null,
  id: string,
  data: { name?: string; gender?: string; birthDate?: string }
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/students/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, gender: data.gender, birthDate: data.birthDate }),
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

export function syncSessionCreate(
  userId: string | null,
  data: Omit<Session, "id">
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  fireAndForget(makeRequest, "session:create");
}

export function syncSessionUpdate(
  userId: string | null,
  id: string,
  data: Partial<Omit<Session, "id">>
): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
  fireAndForget(makeRequest, "session:update");
}

export function syncSessionDelete(userId: string | null, id: string): void {
  if (!userId) return;
  const makeRequest = () =>
    fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
  fireAndForget(makeRequest, "session:delete");
}
