/**
 * 로그인 시 anonymous localStorage 데이터와 서버 데이터 충돌 처리.
 *
 * - checkLoginDataConflict: 어떤 상황인지 판단
 * - applyServerChoice: 서버 데이터 사용 (anonymous 삭제)
 * - applyLocalDataChoice: 로컬 데이터 사용 (anonymous → user-scoped 복사)
 *
 * NOTE(v1): applyLocalDataChoice는 students/subjects만 서버에 업로드한다.
 * sessions/enrollments는 ID 재매핑 복잡도로 인해 별도 Phase에서 full-sync 구현 예정.
 */

import { ANONYMOUS_STORAGE_KEY } from "../localStorageCrud";
import type { ClassPlannerData } from "../localStorageCrud";
import { syncStudentCreate, syncSubjectCreate } from "../apiSync";
import { logger } from "../logger";

export type MigrationResult =
  | { action: "use-server" }
  | { action: "upload-local" }
  | { action: "conflict"; localData: ClassPlannerData; serverData: ClassPlannerData };

function isEmptyData(data: ClassPlannerData): boolean {
  return (
    data.students.length === 0 &&
    data.subjects.length === 0 &&
    data.sessions.length === 0
  );
}

function getAnonymousData(): ClassPlannerData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ANONYMOUS_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ClassPlannerData;
  } catch {
    logger.warn("handleLoginDataMigration - anonymous 데이터 파싱 실패");
    return null;
  }
}

export function checkLoginDataConflict(serverData: ClassPlannerData): MigrationResult {
  const anonymousData = getAnonymousData();

  if (!anonymousData || isEmptyData(anonymousData)) {
    return { action: "use-server" };
  }

  if (isEmptyData(serverData)) {
    return { action: "upload-local" };
  }

  return { action: "conflict", localData: anonymousData, serverData };
}

export function applyServerChoice(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ANONYMOUS_STORAGE_KEY);
  logger.info("handleLoginDataMigration - 서버 데이터 선택, anonymous 삭제");
}

export function applyLocalDataChoice(userId: string): void {
  if (typeof window === "undefined") return;

  const raw = localStorage.getItem(ANONYMOUS_STORAGE_KEY);
  if (!raw) {
    logger.warn("handleLoginDataMigration - applyLocalDataChoice 호출 시 anonymous 데이터 없음");
    return;
  }

  // 1. user-scoped 키로 복사
  localStorage.setItem(`classPlannerData:${userId}`, raw);

  // 2. anonymous 키 삭제
  localStorage.removeItem(ANONYMOUS_STORAGE_KEY);

  // 3. 서버 업로드 (fire-and-forget)
  try {
    const data = JSON.parse(raw) as ClassPlannerData;
    for (const student of data.students) {
      syncStudentCreate(userId, { name: student.name });
    }
    for (const subject of data.subjects) {
      syncSubjectCreate(userId, { name: subject.name, color: subject.color || "#3b82f6" });
    }
  } catch {
    logger.warn("handleLoginDataMigration - 서버 업로드 중 오류 (무시, localStorage는 정상)");
  }

  logger.info("handleLoginDataMigration - 로컬 데이터 선택 완료", { userId });
}
