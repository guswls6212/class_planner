// Mock data for P4 layout prototypes — 실 schedule 페이지와 무관.
// 17명 학생, 3명 강사, 5개 세션으로 실제 학원 환경 모사.

export interface MockStudent {
  id: string;
  name: string;
}

export interface MockTeacher {
  id: string;
  name: string;
  color: string;
}

export interface MockSession {
  id: string;
  weekday: number; // 0=월
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  subject: string;
  students: string[];
  bg: string;
  fg: string;
}

export const MOCK_STUDENTS: MockStudent[] = [
  { id: "s1", name: "강지원" },
  { id: "s2", name: "고경현" },
  { id: "s3", name: "이창섭" },
  { id: "s4", name: "김진홍" },
  { id: "s5", name: "박지호" },
  { id: "s6", name: "조민수" },
  { id: "s7", name: "이현진" },
  { id: "s8", name: "남궁민수" },
  { id: "s9", name: "남궁현진" },
  { id: "s10", name: "남궁지원" },
  { id: "s11", name: "남궁경현" },
  { id: "s12", name: "남궁창섭" },
  { id: "s13", name: "남궁진홍" },
  { id: "s14", name: "남궁지호" },
  { id: "s15", name: "남궁승민" },
  { id: "s16", name: "남궁승건" },
  { id: "s17", name: "남궁남궁" },
];

export const MOCK_TEACHERS: MockTeacher[] = [
  { id: "t1", name: "김선생", color: "#3B82F6" },
  { id: "t2", name: "이선생", color: "#EC4899" },
  { id: "t3", name: "박선생", color: "#10B981" },
];

export const MOCK_SESSIONS: MockSession[] = [
  {
    id: "ses1",
    weekday: 1,
    startHour: 10,
    startMin: 0,
    endHour: 11,
    endMin: 0,
    subject: "중등수학",
    students: ["고경현", "강지원"],
    bg: "#FEF3C7",
    fg: "#92400E",
  },
  {
    id: "ses2",
    weekday: 3,
    startHour: 14,
    startMin: 0,
    endHour: 15,
    endMin: 30,
    subject: "중등영어",
    students: ["박지호"],
    bg: "#DBEAFE",
    fg: "#1E40AF",
  },
  {
    id: "ses3",
    weekday: 4,
    startHour: 16,
    startMin: 0,
    endHour: 17,
    endMin: 0,
    subject: "중등사회",
    students: ["이현진", "조민수"],
    bg: "#CCFBF1",
    fg: "#115E59",
  },
  {
    id: "ses4",
    weekday: 0,
    startHour: 19,
    startMin: 0,
    endHour: 20,
    endMin: 30,
    subject: "고등수학",
    students: ["남궁민수"],
    bg: "#FEE2E2",
    fg: "#991B1B",
  },
  {
    id: "ses5",
    weekday: 5,
    startHour: 11,
    startMin: 0,
    endHour: 12,
    endMin: 30,
    subject: "초등영어",
    students: ["남궁지원", "남궁창섭", "남궁승민"],
    bg: "#EDE9FE",
    fg: "#5B21B6",
  },
];

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
export const PROTOTYPE_DATE_LABEL = "2026.05.04 — 10";
