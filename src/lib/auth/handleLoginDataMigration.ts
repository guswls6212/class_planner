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

export interface LocalDataChoiceResult {
  /** 정책 위반 등으로 서버 동기화 실패한 레코드 — caller 가 toast 로 표면화. */
  failed: { entity: string; message: string }[];
  /** 서버에 동기화된 핵심 엔티티 수 (students+subjects+enrollments+sessions). */
  totalSynced: number;
}

export async function applyLocalDataChoice(
  userId: string,
  serverData: ClassPlannerData
): Promise<LocalDataChoiceResult> {
  if (typeof window === "undefined") return { failed: [], totalSynced: 0 };

  // anonymous 키 우선, 없으면 userId 키 데이터를 소스로 사용
  const anonymousData = getAnonymousData();
  const localData = anonymousData ?? getUserKeyData();
  if (!localData) {
    throw new Error("로컬 데이터를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
  }

  // 1. 전체 마이그레이션 파이프라인 실행
  const result = await migrateLocalDataToServer(userId, localData, serverData);
  const totalSynced =
    result.syncedCounts.students +
    result.syncedCounts.subjects +
    result.syncedCounts.enrollments +
    result.syncedCounts.sessions;
  logger.info("handleLoginDataMigration - 마이그레이션 결과", {
    success: result.success,
    syncedCounts: result.syncedCounts,
    errorCount: result.errors.length,
  });

  // 부분 실패여도 throw 하지 않는다.
  // (이전: !result.success 면 throw → 아래 step 2-5 미실행 → step 5 의 anonymous 정리
  //  도달 못함. 정책상 영원히 실패하는 레코드가 매 로그인 재flood + 무한 spinner 유발.
  //  2026-05-29 migration-partial-failure-resilience 사고 — 방아쇠는 강사 미배정 세션이었고
  //  그 정책[/api/sessions POST teacher_id 필수]은 같은 cycle 에서 완화됐지만, 다른 영구
  //  실패 레코드[필수 필드 누락 등]도 같은 lock 을 유발하므로 회복력 자체를 유지한다.)
  // 대신 성공분은 서버 기준으로 반영하고, 실패 레코드는 caller 로 반환해 toast 로 알린다.

  // 2. 서버에서 최신 데이터 re-fetch (병렬)
  const [studentsRes, subjectsRes, sessionsRes, enrollmentsRes, teachersRes] =
    await Promise.allSettled([
      fetch(`/api/students?userId=${userId}`),
      fetch(`/api/subjects?userId=${userId}`),
      fetch(`/api/sessions?userId=${userId}`),
      fetch(`/api/enrollments?userId=${userId}`),
      fetch(`/api/teachers?userId=${encodeURIComponent(userId)}`),
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
  const teachers = await parseJson(teachersRes);

  // 3. supabase_user_id 설정 (getStorageKey()가 올바른 키를 반환하도록)
  localStorage.setItem("supabase_user_id", userId);

  // 4. 서버 최신 데이터를 localStorage에 저장
  setClassPlannerData({
    students,
    subjects,
    sessions,
    enrollments,
    teachers,
    version: "1.0",
    lastModified: new Date().toISOString(),
  });

  // 5. anonymous 키 삭제 — userId 키 소스인 경우 삭제 불필요 (서버 데이터로 이미 갱신됨)
  //    1개라도 동기화됐으면 삭제해 재flood loop 를 끊는다. 0개(전부 실패)면 보존 —
  //    transient(네트워크) 전체 실패일 수 있어 다음 로그인 재시도 여지를 남긴다.
  if (anonymousData) {
    if (totalSynced > 0 || anonymousData.students.length === 0) {
      localStorage.removeItem(ANONYMOUS_STORAGE_KEY);
    } else {
      logger.warn("handleLoginDataMigration - 동기화된 데이터 없음, anonymous 키 보존", {
        errors: result.errors,
      });
    }
  }

  logger.info("handleLoginDataMigration - 로컬 데이터 선택 완료", {
    userId,
    totalSynced,
    failedCount: result.errors.length,
  });

  return {
    failed: result.errors.map((e) => ({ entity: e.entity, message: e.message })),
    totalSynced,
  };
}
