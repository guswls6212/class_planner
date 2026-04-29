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

import { ANONYMOUS_STORAGE_KEY, getClassPlannerData, setClassPlannerData } from "../localStorageCrud";
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
    data.sessions.length === 0 &&
    data.enrollments.length === 0
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

// userId 키(classPlannerData:{userId})에서 데이터를 읽는다.
// 호출 시점에 supabase_user_id가 이미 localStorage에 설정되어 있어야 한다.
function getUserKeyData(): ClassPlannerData | null {
  if (typeof window === "undefined") return null;
  const data = getClassPlannerData();
  return isEmptyData(data) ? null : data;
}

export function checkLoginDataConflict(serverData: ClassPlannerData): MigrationResult {
  const anonymousData = getAnonymousData();

  // anonymous 키 데이터가 있으면 기존 로직 그대로
  if (anonymousData && !isEmptyData(anonymousData)) {
    if (isEmptyData(serverData)) {
      return { action: "upload-local" };
    }
    return { action: "conflict", localData: anonymousData, serverData };
  }

  // anonymous 없음 → userId 키 데이터 확인 (온보딩 전 로그인 상태에서 입력한 데이터)
  const userKeyData = getUserKeyData();
  if (userKeyData) {
    if (isEmptyData(serverData)) {
      return { action: "upload-local" };
    }
    // 서버에 이미 데이터가 있으면 use-server로 처리.
    // userId 키는 이전 서버 동기화 데이터이므로 충돌 모달이 불필요하다.
    // anonymous 키와 달리 "로그인 전 입력한 미동기화 데이터"가 아님.
    return { action: "use-server" };
  }

  return { action: "use-server" };
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

  // anonymous 키 우선, 없으면 userId 키 데이터를 소스로 사용
  const anonymousData = getAnonymousData();
  const localData = anonymousData ?? getUserKeyData();
  if (!localData) {
    throw new Error("로컬 데이터를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
  }

  // 1. 전체 마이그레이션 파이프라인 실행
  const result = await migrateLocalDataToServer(userId, localData, serverData);
  logger.info("handleLoginDataMigration - 마이그레이션 결과", {
    success: result.success,
    syncedCounts: result.syncedCounts,
    errorCount: result.errors.length,
  });

  if (!result.success) {
    const failedEntities = result.errors.map((e) => `${e.entity}: ${e.message}`).join(", ");
    throw new Error(`데이터 동기화에 실패했습니다: ${failedEntities}`);
  }

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
    teachers: [],
    version: "1.0",
    lastModified: new Date().toISOString(),
  });

  // 5. anonymous 키 삭제 — userId 키 소스인 경우 삭제 불필요 (서버 데이터로 이미 갱신됨)
  if (anonymousData) {
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
  }

  logger.info("handleLoginDataMigration - 로컬 데이터 선택 완료", { userId });
}
