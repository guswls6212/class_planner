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
    description: "학생 추가 / 검색 / 학년별 분류를 할 수 있어요.",
    placement: "right",
  },
  {
    id: "subjects",
    targetSelector: '[data-tour="subjects"]',
    title: "과목 등록",
    description: "영어, 수학, 국어 등 학원에서 가르치는 과목을 등록해요.",
    placement: "right",
  },
  {
    id: "teachers",
    targetSelector: '[data-tour="teachers"]',
    title: "강사 등록",
    description: "본인이 직접 가르치면 본인을, 다른 분이 가르치면 그 분을 등록해요.",
    placement: "right",
  },
  {
    id: "schedule",
    targetSelector: '[data-tour="schedule"]',
    title: "시간표 만드는 곳",
    description: "학생 + 과목 + 강사 + 요일 + 시간을 조합해 수업을 등록하면 시간표가 만들어져요.",
    placement: "right",
  },
  {
    id: "schedule-grid",
    targetSelector: '[data-tour="schedule-grid"]',
    targetPath: "/schedule",
    title: "수업 블록 이동",
    description: "등록된 수업 블록에 마우스를 올리면 왼쪽 위에 드래그 아이콘이 나타나요. 그 아이콘을 끌어 다른 시간으로 옮길 수 있어요. 같은 시간에 여러 학생이 있으면 자동으로 그룹 수업이 돼요.",
    placement: "auto",
  },
  {
    id: "export",
    targetSelector: '[data-tour="export"]',
    targetPath: "/schedule",
    title: "PDF 인쇄",
    description: "PDF 1장으로 시간표를 인쇄해 학생·학부모에게 전달할 수 있어요. 학생별 공유 링크는 설정 → 학원 정보에서 만들 수 있어요. (튜토리얼을 다시 보려면 설정 → 도움말)",
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
