export type TourPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface TourStep {
  id: string;
  targetSelector: string;
  targetPath?: string;
  title: string;
  description: string;
  placement?: TourPlacement;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "students",
    targetSelector: '[data-tour="students"]',
    title: "여기서 학생을 관리해요",
    description: "학생 추가 / 검색 / 학년별 분류. 엑셀 일괄 import 도 가능합니다.",
    placement: "right",
  },
  {
    id: "subjects",
    targetSelector: '[data-tour="subjects"]',
    title: "과목과 강사 등록",
    description: "과목 = 영어 / 수학 / 국어 등. 강사 메뉴는 바로 옆 — 본인이거나 다른 분.",
    placement: "right",
  },
  {
    id: "schedule",
    targetSelector: '[data-tour="schedule"]',
    title: "시간표 만드는 곳",
    description: "학생 + 과목 + 강사 + 요일 + 시간 → 드래그앤드롭으로 배치합니다.",
    placement: "right",
  },
  {
    id: "schedule-grid",
    targetSelector: '[data-tour="schedule-grid"]',
    targetPath: "/schedule",
    title: "수업 블록 드래그 + 그룹화",
    description: "블록 드래그로 시간 이동. 같은 시간 여러 학생 = 그룹 수업.",
    placement: "auto",
  },
  {
    id: "export",
    targetSelector: '[data-tour="export"]',
    targetPath: "/schedule",
    title: "인쇄 + 학생 공유",
    description: "PDF 1장 인쇄 + share-link 으로 학생 / 학부모에게 공유합니다.",
    placement: "auto",
  },
];

export const TOUR_FLAG_KEY_PREFIX = "onboarding_completed_";
export const TOUR_START_EVENT = "class-planner:start-tour";
export const TOUR_TARGET_WAIT_MS = 5000;
export const TOUR_AUTO_START_DELAY_MS = 1000;

export function getTourFlagKey(userId: string | null | undefined): string {
  return `${TOUR_FLAG_KEY_PREFIX}${userId || "anonymous"}`;
}
