/**
 * 로그인 시 anonymous localStorage 데이터와 서버 데이터 충돌 처리.
 *
 * - checkLoginDataConflict: 어떤 상황인지 판단
 * - applyServerChoice: 서버 데이터 사용 (anonymous 삭제)
 * - applyLocalDataChoice: 로컬 데이터 전체를 서버에 동기화 (full-sync 파이프라인 실행)
 *
 * NOTE(v2): applyLocalDataChoice는 students/subjects/enrollments/sessions 전체를
 * 서버에 업로드한다. ID 재매핑 + 중복 제거 로직은 fullDataMigration.ts에 위임.
 * 마이그레이션 완료 후 서버 데이터를 re-fetch하여 localStorage를 최신 상태로 갱신한다.
 */

import { ANONYMOUS_STORAGE_KEY, setClassPlannerData } from "../localStorageCrud";
import type { ClassPlannerData } from "../localStorageCrud";
import { migrateLocalDataToServer } from "./fullDataMigration";
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

export async function applyLocalDataChoice(
  userId: string,
  serverData: ClassPlannerData
): Promise<void> {
  if (typeof window === "undefined") return;

  const anonymousData = getAnonymousData();
  if (!anonymousData) {
    logger.warn("handleLoginDataMigration - applyLocalDataChoice 호출 시 anonymous 데이터 없음");
    return;
  }

  // 1. 전체 마이그레이션 파이프라인 실행
  const result = await migrateLocalDataToServer(userId, anonymousData, serverData);
  logger.info("handleLoginDataMigration - 마이그레이션 결과", {
    success: result.success,
    syncedCounts: result.syncedCounts,
    errorCount: result.errors.length,
  });

  // 2. 서버에서 최신 데이터 re-fetch (병렬)
  const [studentsRes, subjectsRes, sessionsRes, enrollmentsRes] =
    await Promise.allSettled([
      fetch(`/api/students?userId=${userId}`),
      fetch(`/api/subjects?userId=${userId}`),
      fetch(`/api/sessions?userId=${userId}`),
      fetch(`/api/enrollments?userId=${userId}`),
    ]);

  const parseJson = async (settled: PromiseSettledResult<Response>) => {
    if (settled.status === "rejected") return [];
    try {
      const json = await settled.value.json();
      return json.success ? (json.data ?? []) : [];
    } catch {
      return [];
    }
  };

  const students = await parseJson(studentsRes);
  const subjects = await parseJson(subjectsRes);
  const sessions = await parseJson(sessionsRes);
  const enrollments = await parseJson(enrollmentsRes);

  // 3. supabase_user_id 설정 (getStorageKey()가 올바른 키를 반환하도록)
  localStorage.setItem("supabase_user_id", userId);

  // 4. 서버 최신 데이터를 localStorage에 저장
  setClassPlannerData({
    students,
    subjects,
    sessions,
    enrollments,
    version: "1.0",
    lastModified: new Date().toISOString(),
  });

  // 5. anonymous 키 삭제 — 전혀 동기화된 데이터가 없으면 보존
  const totalSynced =
    result.syncedCounts.students +
    result.syncedCounts.subjects +
    result.syncedCounts.enrollments +
    result.syncedCounts.sessions;
  if (totalSynced > 0 || anonymousData.students.length === 0) {
    localStorage.removeItem(ANONYMOUS_STORAGE_KEY);
  } else {
    logger.warn("handleLoginDataMigration - 동기화된 데이터 없음, anonymous 키 보존", {
      errors: result.errors,
    });
  }

  logger.info("handleLoginDataMigration - 로컬 데이터 선택 완료", { userId });
}
