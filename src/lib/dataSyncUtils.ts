import { getKSTTime } from "./timeUtils";
/**
 * 데이터 동기화 유틸리티 함수들
 * localStorage와 DB 간의 데이터 처리 및 비교 로직
 */

import type {
  ClassPlannerData,
  DataSource,
  DataSummary,
  SyncScenario,
} from "../types/dataSyncTypes";

/**
 * 데이터 요약 정보 생성
 */

export const createDataSummary = (
  data: ClassPlannerData,
  source: DataSource
): DataSummary => {
  const students = data?.students?.length || 0;
  const subjects = data?.subjects?.length || 0;
  const sessions = data?.sessions?.length || 0;
  const lastModified = data?.lastModified || getKSTTime();
  const dataSize = JSON.stringify(data).length;

  return {
    students,
    subjects,
    sessions,
    lastModified,
    dataSize,
    source,
  };
};

/**
 * 데이터 요약 정보를 사용자 친화적인 문자열로 변환
 */
export const formatDataSummary = (summary: DataSummary): string => {
  const { students, subjects, sessions, lastModified } = summary;
  const date = new Date(lastModified);
  const timeAgo = getTimeAgo(date);

  return `학생 ${students}명, 과목 ${subjects}개, 수업 ${sessions}개 (마지막 수정: ${timeAgo})`;
};

/**
 * 두 데이터 요약 정보 비교
 */
export const compareDataSummaries = (
  local: DataSummary,
  server: DataSummary
): string => {
  const localStr = formatDataSummary(local);
  const serverStr = formatDataSummary(server);

  return `로컬: ${localStr}\n서버: ${serverStr}`;
};

/**
 * 시간 경과 계산 (예: "2시간 전", "3일 전")
 */
export const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? "방금 전" : `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString("ko-KR");
  }
};

/**
 * 데이터 동기화 시나리오 판단
 */
export const determineSyncScenario = (
  hasLocalData: boolean,
  hasServerData: boolean
): SyncScenario => {
  if (hasLocalData && !hasServerData) {
    return "localOnlyFirstLogin";
  } else if (!hasLocalData && hasServerData) {
    return "normalLogin";
  } else if (hasLocalData && hasServerData) {
    return "localAndServerConflict";
  } else {
    return "noData";
  }
};

/**
 * localStorage에서 데이터 로드
 */
export const loadFromLocalStorage = (
  key: string = "classPlannerData"
): ClassPlannerData | null => {
  try {
    // 먼저 통합된 데이터 키로 시도
    const unifiedData = localStorage.getItem(key);
    if (unifiedData) {
      return JSON.parse(unifiedData);
    }

    // 통합된 데이터가 없으면 개별 키들에서 데이터 수집
    const sessions = localStorage.getItem("sessions");
    const enrollments = localStorage.getItem("enrollments");
    const students = localStorage.getItem("students");
    const subjects = localStorage.getItem("subjects");

    if (sessions || enrollments || students || subjects) {
      const data: ClassPlannerData = {
        students: students ? JSON.parse(students) : [],
        subjects: subjects ? JSON.parse(subjects) : [],
        sessions: sessions ? JSON.parse(sessions) : [],
        enrollments: enrollments ? JSON.parse(enrollments) : [],
        lastModified: getKSTTime(),
        version: "1.0",
      };
      return data;
    }

    return null;
  } catch (error) {
    console.error("localStorage에서 데이터 로드 실패:", error);
    return null;
  }
};

/**
 * localStorage에 데이터 저장
 */
export const saveToLocalStorage = (
  data: ClassPlannerData,
  key: string = "classPlannerData"
): boolean => {
  try {
    const dataWithTimestamp = {
      ...data,
      lastModified: getKSTTime(),
      source: "localStorage" as DataSource,
    };
    localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
    return true;
  } catch (error) {
    console.error("localStorage에 데이터 저장 실패:", error);
    return false;
  }
};

/**
 * localStorage에서 데이터 삭제
 */
export const removeFromLocalStorage = (
  key: string = "classPlannerData"
): boolean => {
  try {
    // 통합된 데이터 키 삭제
    localStorage.removeItem(key);

    // 개별 키들도 삭제
    localStorage.removeItem("sessions");
    localStorage.removeItem("enrollments");
    localStorage.removeItem("students");
    localStorage.removeItem("subjects");

    return true;
  } catch (error) {
    console.error("localStorage에서 데이터 삭제 실패:", error);
    return false;
  }
};

/**
 * 데이터 유효성 검사
 */

export const validateData = (data: unknown): data is ClassPlannerData => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 기본 구조 확인
  const hasStudents = Array.isArray(obj.students);
  const hasSubjects = Array.isArray(obj.subjects);
  const hasSessions = Array.isArray(obj.sessions);

  return hasStudents && hasSubjects && hasSessions;
};

/**
 * 데이터 병합 (충돌 해결용)
 */
export const mergeData = (
  localData: ClassPlannerData,
  serverData: ClassPlannerData,
  strategy: "local" | "server" | "merge"
): ClassPlannerData => {
  if (strategy === "local") {
    return localData;
  } else if (strategy === "server") {
    return serverData;
  } else {
    // 병합 전략: 최신 데이터 우선, 그 다음 로컬 데이터 우선
    const localTime = new Date(localData.lastModified || 0);
    const serverTime = new Date(serverData.lastModified || 0);

    if (serverTime > localTime) {
      return serverData;
    } else {
      return localData;
    }
  }
};

/**
 * 데이터 크기 확인 (localStorage 제한 체크)
 */
export const checkDataSize = (
  data: ClassPlannerData
): { isValid: boolean; size: number; limit: number } => {
  const jsonString = JSON.stringify(data);
  const size = jsonString.length;
  const limit = 5 * 1024 * 1024; // 5MB 제한

  return {
    isValid: size < limit,
    size,
    limit,
  };
};

/**
 * 데이터 백업 생성
 */
export const createDataBackup = (data: ClassPlannerData): string => {
  const backup = {
    timestamp: getKSTTime(),
    data,
    version: "1.0",
  };

  return JSON.stringify(backup);
};

/**
 * 데이터 백업 복원
 */
export const restoreDataBackup = (
  backupString: string
): ClassPlannerData | null => {
  try {
    const backup = JSON.parse(backupString);
    return backup.data;
  } catch (error) {
    console.error("백업 복원 실패:", error);
    return null;
  }
};
