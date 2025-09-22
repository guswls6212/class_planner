/**
 * 🛠️ Shared Layer - 공통 타입 및 API 타입
 *
 * 이 파일은 모든 레이어에서 공통으로 사용되는 타입들을 정의합니다.
 * API 통신, UI 상태, 유틸리티 타입 등을 포함합니다.
 */

// ===== API 공통 타입 =====

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== UI 상태 타입 =====

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface FormState<T> extends LoadingState {
  data: T;
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ModalState {
  isOpen: boolean;
  data?: any;
}

export interface PanelState {
  isVisible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

// ===== 데이터 동기화 타입 =====

export type SyncScenario =
  | "localOnlyFirstLogin" // 로컬 데이터만 있는 첫 로그인
  | "localAndServerConflict" // 로컬과 서버 데이터 충돌
  | "normalLogin" // 일반 로그인 (데이터 없음)
  | "noData"; // 데이터 없음

export type SyncAction =
  | "importData" // 로컬 데이터를 서버에 업로드
  | "startFresh" // 로컬 데이터 삭제하고 서버의 빈 데이터로 시작
  | "useDeviceData" // 로컬 데이터를 서버에 업로드
  | "useServerData" // 서버 데이터를 로컬에 다운로드
  | "cancelSync"; // 동기화 취소

export interface SyncModalState {
  isOpen: boolean;
  scenario: SyncScenario;
  localData?: any;
  serverData?: any;
}

export interface DataSyncState {
  isSyncing: boolean;
  lastSyncAt?: Date;
  syncError?: string;
}

// ===== 검색 및 필터링 타입 =====

export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

// ===== 시간 관련 타입 =====

export interface TimeSlot {
  startsAt: string; // HH:MM 형식
  endsAt: string; // HH:MM 형식
}

export interface Weekday {
  value: number; // 0: 월요일, 1: 화요일, ..., 6: 일요일
  label: string; // '월', '화', '수', '목', '금', '토', '일'
}

export interface TimeRange {
  start: number; // 분 단위
  end: number; // 분 단위
}

// ===== 드래그 앤 드롭 타입 =====

export interface DragOffset {
  x: number;
  y: number;
}

export interface DropTarget {
  id: string;
  type: "timeSlot" | "session" | "student";
  position: { x: number; y: number };
}

// ===== 테마 및 스타일 타입 =====

export type Theme = "light" | "dark";

export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

export interface UIConstants {
  colors: ColorScheme;
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
}

// ===== 유틸리티 타입 =====

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

// ===== 이벤트 타입 =====

export interface CustomEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
}

export interface EventHandler<T = any> {
  (event: CustomEvent<T>): void;
}

// ===== 설정 타입 =====

export interface AppConfig {
  apiBaseUrl: string;
  appName: string;
  version: string;
  environment: "development" | "staging" | "production";
  features: Record<string, boolean>;
}

export interface UserPreferences {
  theme: Theme;
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}
