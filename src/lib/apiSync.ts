/**
 * 클라이언트 CRUD 결과를 서버와 동기화하는 fire-and-forget 유틸리티.
 *
 * - userId가 null이면 (익명 사용자) 서버 호출 스킵
 * - API 실패 시 에러 로그만 남기고 UI는 영향받지 않음
 * - localStorage가 SSOT이며 서버 동기화는 백그라운드
 */

import { logger } from "./logger";
import type { Session } from "../lib/planner";

type AnyObject = Record<string, unknown>;

function fireAndForget(promise: Promise<Response>, context: string): void {
  promise
    .then((res) => {
      if (!res.ok) {
        res.json().catch(() => null).then((body) => {
          logger.error(`apiSync ${context} 실패`, { status: res.status, body });
        });
      }
    })
    .catch((err) => {
      logger.error(`apiSync ${context} 네트워크 오류`, undefined, err as Error);
    });
}

// ===== Students =====

export function syncStudentCreate(
  userId: string | null,
  data: { name: string }
): void {
  if (!userId) return;
  fireAndForget(
    fetch(`/api/students?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "student:create"
  );
}

export function syncStudentUpdate(
  userId: string | null,
  id: string,
  data: { name?: string }
): void {
  if (!userId) return;
  fireAndForget(
    fetch(`/api/students/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "student:update"
  );
}

export function syncStudentDelete(userId: string | null, id: string): void {
  if (!userId) return;
  fireAndForget(
    fetch(
      `/api/students/${id}?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    ),
    "student:delete"
  );
}

// ===== Subjects =====

export function syncSubjectCreate(
  userId: string | null,
  data: { name: string; color: string }
): void {
  if (!userId) return;
  fireAndForget(
    fetch(`/api/subjects?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "subject:create"
  );
}

export function syncSubjectUpdate(
  userId: string | null,
  id: string,
  data: { name?: string; color?: string }
): void {
  if (!userId) return;
  fireAndForget(
    fetch(`/api/subjects/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "subject:update"
  );
}

export function syncSubjectDelete(userId: string | null, id: string): void {
  if (!userId) return;
  fireAndForget(
    fetch(
      `/api/subjects/${id}?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    ),
    "subject:delete"
  );
}

// ===== Enrollments =====

export function syncEnrollmentCreate(
  userId: string | null,
  data: { studentId: string; subjectId: string }
): void {
  if (!userId) return;
  fireAndForget(
    fetch(`/api/enrollments?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "enrollment:create"
  );
}

export function syncEnrollmentDelete(userId: string | null, id: string): void {
  if (!userId) return;
  fireAndForget(
    fetch(
      `/api/enrollments?id=${id}&userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    ),
    "enrollment:delete"
  );
}

// ===== Sessions =====

export function syncSessionCreate(
  userId: string | null,
  data: Omit<Session, "id">
): void {
  if (!userId) return;
  fireAndForget(
    fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "session:create"
  );
}

export function syncSessionUpdate(
  userId: string | null,
  id: string,
  data: Partial<Omit<Session, "id">>
): void {
  if (!userId) return;
  fireAndForget(
    fetch(`/api/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    }),
    "session:update"
  );
}

export function syncSessionDelete(userId: string | null, id: string): void {
  if (!userId) return;
  fireAndForget(
    fetch(`/api/sessions?id=${id}`, { method: "DELETE" }),
    "session:delete"
  );
}
