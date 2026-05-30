/**
 * commitEntityDeleteOnServer: 5 entity (student/teacher/subject/session) 의 server
 * DELETE + pendingDeletes 정리 만 담당하는 generic helper — 4 management hook
 * (useStudent/Teacher/Subject ManagementLocal + useIntegratedDataLocal session 분기)
 * 의 internal helper 4개를 1 shared 함수로 통합.
 *
 * 의존성:
 *   - lib/pendingDeletes (removePendingDelete + PendingDeleteEntityType)
 *   - lib/logger
 *   - fetch (global)
 *   - non-goal: localStorage 정리, UI state — caller 의 책임.
 *
 * 동작:
 *   - userId null (anonymous) → server 호출 skip, pendingDeletes 즉시 정리.
 *   - response.ok → onAfterDelete (entity-specific 후처리, best-effort) → pendingDeletes 정리.
 *   - 4xx/5xx → pendingDeletes 유지 (recovery hook 이 다음 mount 재시도).
 *   - network 오류 → pendingDeletes 유지.
 *
 * race window 0 — fetch await 후에만 removePendingDelete (ADR-012, UAT 2026-05-09
 * 김요섭/강지원/박태환 부활 사고).
 *
 * 결정 history:
 *   - ADR-002 Cohesion Sweep Phase 2 Step 1 (2026-05-28): 4 hook 의 internal helper
 *     (commitStudentDeleteOnServer / commitTeacherDeleteOnServer /
 *     commitSubjectDeleteOnServer / commitSessionDeleteOnServer) 통합. API path
 *     `/api/{entityType}s/{id}` 패턴 통일 + student share-tokens revoke 는
 *     onAfterDelete callback 으로 분리.
 */

import { logger } from "../../lib/logger";
import {
  removePendingDelete,
  type PendingDeleteEntityType,
} from "../../lib/pendingDeletes";

export interface CommitEntityDeleteOptions {
  /**
   * response.ok 후 entity-specific 후처리 — best-effort. 실패해도 무시
   * (entity 삭제는 이미 성공). 예: student 의 share-tokens access-code revoke.
   */
  onAfterDelete?: (userId: string, id: string) => Promise<void>;
  /**
   * 로그 메시지의 사용자 친화 라벨 (한국어 권장). 미지정 시 entityType 사용.
   * 예: "학생", "강사", "과목", "세션".
   */
  entityLabel?: string;
}

/**
 * Server 에 entity DELETE 요청 + pendingDeletes 정리. race window 0.
 *
 * @returns true: server commit 성공 + pendingDeletes 정리됨. false: server 실패
 *   (pendingDeletes 유지, recovery hook 이 재시도).
 */
export async function commitEntityDeleteOnServer(
  userId: string | null,
  entityType: PendingDeleteEntityType,
  id: string,
  options: CommitEntityDeleteOptions = {},
): Promise<boolean> {
  const { onAfterDelete, entityLabel } = options;
  const label = entityLabel ?? entityType;
  if (!userId) {
    removePendingDelete(entityType, id);
    return true;
  }
  try {
    const url = `/api/${entityType}s/${id}?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url, { method: "DELETE" });
    if (!response.ok) {
      logger.warn(`${label} 삭제 commit 실패 — pendingDeletes 유지`, {
        id,
        status: response.status,
      });
      return false;
    }
  } catch (err) {
    logger.warn(`${label} 삭제 commit 네트워크 오류 — pendingDeletes 유지`, {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
  if (onAfterDelete) {
    try {
      await onAfterDelete(userId, id);
    } catch {
      // ignore — best-effort 후처리 (entity 삭제는 이미 성공)
    }
  }
  removePendingDelete(entityType, id);
  return true;
}
