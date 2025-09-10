/**
 * 데이터 동기화 관련 타입 정의
 * localStorage와 DB 간의 데이터 동기화 정책 및 시나리오 관리
 */

// 기능 타입 정의
export type FeatureType =
  | "addStudent"
  | "addSubject"
  | "addSession"
  | "exportData";

// 기본 데이터 구조 타입
export interface ClassPlannerData {
  students: Array<{
    id: string;
    name: string;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  sessions: Array<{
    id: string;
    enrollmentIds: string[];
    weekday: number;
    startsAt: string;
    endsAt: string;
    room?: string;
  }>;
  enrollments: Array<{
    id: string;
    studentId: string;
    subjectId: string;
  }>;
  lastModified: string;
  version: string;
}

// 데이터 소스 타입
export type DataSource = "local" | "server";

// 데이터 동기화 시나리오
export type SyncScenario =
  | "localOnlyFirstLogin" // 로컬 데이터만 있음, 첫 로그인 (localStorage 있음, DB 없음)
  | "localAndServerConflict" // 로컬과 서버 데이터 모두 있음, 충돌 (localStorage 있음, DB 있음)
  | "normalLogin" // 일반 로그인 (localStorage 없음, DB 있음)
  | "noData"; // 데이터 없음 (localStorage 없음, DB 없음)

// 데이터 동기화 액션
export type SyncAction =
  | "importData" // 로컬 데이터를 서버에 업로드하고 로컬 데이터 삭제
  | "startFresh" // 로컬 데이터 삭제하고 서버의 빈 데이터로 시작
  | "useDeviceData" // 로컬 데이터를 서버에 업로드하고 로컬 데이터 삭제
  | "useServerData" // 서버 데이터를 로컬에 다운로드하고 로컬 데이터 삭제
  | "downloadServer" // 서버 데이터를 로컬에 다운로드
  | "cancelSync"; // 동기화 취소

// 데이터 요약 정보
export interface DataSummary {
  students: number;
  subjects: number;
  sessions: number;
  lastModified: string;
  dataSize: number;
  source: DataSource;
}

// 동기화 모달 상태
export interface SyncModalState {
  isOpen: boolean;
  scenario: SyncScenario;
  localData?: DataSummary;
  serverData?: DataSummary;
}

// 동기화 결과
export interface SyncResult {
  success: boolean;
  action: SyncAction;
  message: string;
  data?: ClassPlannerData;
}

// useDataSync 훅 반환 타입
export interface UseDataSyncReturn {
  // 상태
  syncModal: SyncModalState;
  isSyncing: boolean;

  // 액션
  checkSyncNeeded: () => Promise<SyncScenario>;
  openSyncModal: (
    scenario: SyncScenario,
    localData?: DataSummary,
    serverData?: DataSummary
  ) => void;
  closeSyncModal: () => void;
  executeSync: (action: SyncAction) => Promise<SyncResult>;

  // 유틸리티
  getDataSummary: (data: ClassPlannerData, source?: DataSource) => DataSummary;
  compareData: (local: DataSummary, server: DataSummary) => string;
}

export interface FeatureLimit {
  type: FeatureType;
  freeLimit: number;
  premiumLimit: number;
  currentCount: number;
}

// 기능 가드 훅 인터페이스
export interface UseFeatureGuardReturn {
  // 상태
  isLoggedIn: boolean;
  isPremium: boolean;
  upgradeModal: {
    isOpen: boolean;
    featureType?: FeatureType;
    currentCount?: number;
    limit?: number;
  };

  // 액션
  checkFeatureAccess: (feature: FeatureType, currentCount: number) => boolean;
  showUpgradeModal: (
    feature: FeatureType,
    currentCount: number,
    limit: number
  ) => void;
  closeUpgradeModal: () => void;
  guardFeature: (
    feature: FeatureType,
    currentCount: number,
    limit: number
  ) => void;

  // 유틸리티
  getFeatureLimit: (feature: FeatureType) => FeatureLimit;
}

// 캐시 전략 관련 타입
export interface CacheStrategy {
  useStaleWhileRevalidate: boolean;
  cacheExpiry: number; // 밀리초
  backgroundRefresh: boolean;
}

// Debounce 설정
export interface DebounceConfig {
  delay: number; // 밀리초
  maxWait: number; // 밀리초
  leading: boolean;
  trailing: boolean;
}
