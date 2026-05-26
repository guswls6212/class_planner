export type TourPlacement = "top" | "bottom" | "left" | "right" | "auto";

export type TourRole = "owner" | "admin" | "member";

export interface TourStep {
  id: string;
  targetSelector: string;
  targetPath?: string;
  title: string;
  description: string;
  placement?: TourPlacement;
  /** "core" (anonymous + login 공통) 또는 "login" (login 전용) */
  segment: "core" | "login";
  /** undefined = 모든 role 노출. 명시 시 해당 role 만 노출. */
  roles?: TourRole[];
}

export const CORE_STEPS: TourStep[] = [
  {
    id: "students",
    targetSelector: '[data-tour="students"]',
    title: "여기서 학생을 관리해요",
    description: "학생 추가 / 검색 / 학년별 분류를 할 수 있어요.",
    placement: "right",
    segment: "core",
    roles: ["owner", "admin"],
  },
  {
    id: "subjects",
    targetSelector: '[data-tour="subjects"]',
    title: "과목 등록",
    description: "영어, 수학, 국어 등 학원에서 가르치는 과목을 등록해요.",
    placement: "right",
    segment: "core",
    roles: ["owner", "admin"],
  },
  {
    id: "teachers",
    targetSelector: '[data-tour="teachers"]',
    title: "강사 등록",
    description: "본인이 직접 가르치면 본인을, 다른 분이 가르치면 그 분을 등록해요.",
    placement: "right",
    segment: "core",
    roles: ["owner", "admin"],
  },
  {
    id: "schedule",
    targetSelector: '[data-tour="schedule"]',
    title: "시간표 만드는 곳",
    description: "학생 + 과목 + 강사 + 요일 + 시간을 조합해 수업을 등록하면 시간표가 만들어져요.",
    placement: "right",
    segment: "core",
    roles: ["owner", "admin"],
  },
  {
    id: "schedule-grid",
    targetSelector: '[data-tour="schedule-grid"]',
    targetPath: "/schedule",
    title: "수업 블록 이동",
    description: "등록된 수업 블록에 마우스를 올리면 왼쪽 위에 드래그 아이콘이 나타나요. 그 아이콘을 끌어 다른 시간으로 옮길 수 있어요. 한 수업에 여러 학생을 등록하면 그룹 수업도 만들 수 있어요.",
    placement: "auto",
    segment: "core",
    roles: ["owner", "admin"],
  },
  {
    id: "export-admin",
    targetSelector: '[data-tour="export"]',
    targetPath: "/schedule",
    title: "PDF 인쇄",
    description: "PDF 1장으로 시간표를 인쇄해 학생·학부모에게 전달할 수 있어요. 학생별 공유 링크는 설정 → 학원 정보에서 만들 수 있어요. (튜토리얼을 다시 보려면 설정 → 도움말)",
    placement: "auto",
    segment: "core",
    roles: ["owner", "admin"],
  },
  {
    id: "export-teacher",
    targetSelector: '[data-tour="export"]',
    targetPath: "/teacher-schedule",
    title: "본인 시간표 PDF",
    description: "본인 수업만 모은 시간표를 PDF 한 장으로 인쇄할 수 있어요.",
    placement: "auto",
    segment: "core",
    roles: ["member"],
  },
];

/**
 * 로그인 사용자 전용 step. 모두 Phase 1 매핑 (phase1-release-readiness § 13 영역).
 * 사용자 verify (2026-05-26): "anonymous 본 후 7/N 부터 자연 연결" 제안 채택.
 */
export const LOGIN_STEPS: TourStep[] = [
  {
    id: "academy-info",
    targetSelector: '[data-tour="academy-info"]',
    targetPath: "/settings",
    title: "학원 정보와 권한",
    description: "학원 이름과 멤버 권한 (원장 / 관리자 / 강사) 을 관리해요.",
    placement: "auto",
    segment: "login",
    roles: ["owner"],
  },
  {
    id: "teacher-invite",
    targetSelector: '[data-tour="teacher-invite"]',
    targetPath: "/settings",
    title: "강사 초대",
    description: "초대 링크를 만들어 카톡이나 이메일로 보내면 강사가 자동으로 학원에 합류해요.",
    placement: "auto",
    segment: "login",
    roles: ["owner", "admin"],
  },
  {
    id: "share-link",
    targetSelector: '[data-tour="share-link"]',
    targetPath: "/settings",
    title: "학생·학부모 공유",
    description: "공유 링크와 6자리 코드를 만들어 학생이나 학부모에게 시간표를 보여줄 수 있어요.",
    placement: "auto",
    segment: "login",
    roles: ["owner", "admin"],
  },
  {
    id: "academy-switch",
    targetSelector: '[data-tour="academy-switch"]',
    title: "다른 학원 전환",
    description: "여러 학원을 운영하거나 다른 학원에 강사로 참여 중이면 사이드바 상단 학원 버튼으로 전환할 수 있어요.",
    placement: "right",
    segment: "login",
  },
  {
    id: "attendance",
    targetSelector: '[data-tour="attendance"]',
    title: "출결 관리",
    description: "사이드바 출결 메뉴에서 오늘과 이번 주 수업의 학생별 출결을 기록해요.",
    placement: "right",
    segment: "login",
  },
  {
    id: "data-history",
    targetSelector: '[data-tour="data-history"]',
    targetPath: "/settings",
    title: "데이터 복구",
    description: "실수로 삭제한 학생이나 수업도 시점별로 되돌릴 수 있어요. 30일 자동 백업.",
    placement: "auto",
    segment: "login",
    roles: ["owner", "admin"],
  },
];

export const ALL_STEPS: TourStep[] = [...CORE_STEPS, ...LOGIN_STEPS];

/**
 * 로그인 여부에 따른 활성 step 목록 — anonymous 는 CORE 만, login 은 CORE + LOGIN 모두.
 * @deprecated role 기반 filter 가 필요한 경우 getTourStepsForRole 사용.
 */
export function getTourSteps(isLoggedIn: boolean): TourStep[] {
  return isLoggedIn ? ALL_STEPS : CORE_STEPS;
}

/**
 * role 기반 step filter — owner / admin / member 별 visible step 만 반환.
 * anonymous (role null) 는 owner 가정 (이전 동작 호환 — 학원 운영자 관점 step 표시).
 */
export function getTourStepsForRole(
  isLoggedIn: boolean,
  role: TourRole | null,
): TourStep[] {
  const base = isLoggedIn ? ALL_STEPS : CORE_STEPS;
  const effectiveRole: TourRole = role ?? "owner";
  return base.filter((s) => !s.roles || s.roles.includes(effectiveRole));
}

export const TOUR_FLAG_KEY_PREFIX = "onboarding_completed_";
export const TOUR_LOGIN_FLAG_KEY_PREFIX = "onboarding_login_completed_";
export const TOUR_START_EVENT = "class-planner:start-tour";
export const TOUR_TARGET_WAIT_MS = 5000;
export const TOUR_AUTO_START_DELAY_MS = 1000;

export function getTourFlagKey(userId: string | null | undefined): string {
  return `${TOUR_FLAG_KEY_PREFIX}${userId || "anonymous"}`;
}

export function getTourLoginFlagKey(userId: string | null | undefined): string {
  return `${TOUR_LOGIN_FLAG_KEY_PREFIX}${userId || "anonymous"}`;
}

/**
 * @deprecated Use CORE_STEPS / LOGIN_STEPS / ALL_STEPS / getTourSteps / getTourStepsForRole.
 */
export const TOUR_STEPS = CORE_STEPS;
