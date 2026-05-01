import { describe, it, expect, vi, beforeEach } from "vitest";

// jsPDF mock — 폰트 등록 메서드 스파이
const addFileToVFSMock = vi.fn();
const addFontMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const setTextColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setLineWidthMock = vi.fn();
const setFillColorMock = vi.fn();
const textMock = vi.fn();
const lineMock = vi.fn();
const rectMock = vi.fn();
const saveMock = vi.fn();
const addPageMock = vi.fn();

const circlesMock = vi.fn();
const getTextWidthMock = vi.fn().mockReturnValue(10);
const setLineDashPatternMock = vi.fn();

vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    addFileToVFS: addFileToVFSMock,
    addFont: addFontMock,
    setFont: setFontMock,
    setFontSize: setFontSizeMock,
    setTextColor: setTextColorMock,
    setDrawColor: setDrawColorMock,
    setLineWidth: setLineWidthMock,
    setFillColor: setFillColorMock,
    text: textMock,
    line: lineMock,
    rect: rectMock,
    circle: circlesMock,
    save: saveMock,
    addPage: addPageMock,
    getTextWidth: getTextWidthMock,
    setLineDashPattern: setLineDashPatternMock,
    internal: { scaleFactor: 1 },
  })),
}));

// 폰트 base64 mock (실제 base64 대신 짧은 문자열)
vi.mock("../fonts/pretendard-regular", () => ({
  PRETENDARD_REGULAR_BASE64: "MOCK_REGULAR_BASE64",
}));
vi.mock("../fonts/pretendard-bold", () => ({
  PRETENDARD_BOLD_BASE64: "MOCK_BOLD_BASE64",
}));

import { renderSchedulePdf } from "../PdfRenderer";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";

const emptySessions: Session[] = [];
const emptySubjects: Subject[] = [];
const emptyStudents: Student[] = [];
const emptyEnrollments: Enrollment[] = [];
const emptyTeachers: Teacher[] = [];

describe("renderSchedulePdf — 폰트 등록", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Pretendard Regular를 VFS에 등록한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers);
    expect(addFileToVFSMock).toHaveBeenCalledWith(
      "Pretendard-Regular.ttf",
      "MOCK_REGULAR_BASE64"
    );
  });

  it("Pretendard Bold를 VFS에 등록한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers);
    expect(addFileToVFSMock).toHaveBeenCalledWith(
      "Pretendard-Bold.ttf",
      "MOCK_BOLD_BASE64"
    );
  });

  it("addFont를 Pretendard normal/bold 두 번 호출한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers);
    expect(addFontMock).toHaveBeenCalledWith(
      "Pretendard-Regular.ttf",
      "Pretendard",
      "normal"
    );
    expect(addFontMock).toHaveBeenCalledWith(
      "Pretendard-Bold.ttf",
      "Pretendard",
      "bold"
    );
  });

  it("초기 폰트를 Pretendard normal로 설정한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers);
    expect(setFontMock).toHaveBeenCalledWith("Pretendard", "normal");
  });

  it("doc.save를 호출한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers, {
      academyName: "테스트학원",
    });
    expect(saveMock).toHaveBeenCalledWith("테스트학원_전체시간표.pdf");
  });
});

describe("renderSchedulePdf — weekRange 옵션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("weekRange가 있으면 주 단위로 addPage 호출 (3주 → addPage 2번)", () => {
    renderSchedulePdf(
      emptySessions,
      emptySubjects,
      emptyStudents,
      emptyEnrollments,
      emptyTeachers,
      {
        academyName: "테스트학원",
        weekRange: { startDate: "2026-04-13", endDate: "2026-05-03" }, // 3주
      }
    );
    expect(addPageMock).toHaveBeenCalledTimes(2);
  });

  it("weekRange 미제공 시 단일 페이지 — addPage 미호출 (역호환)", () => {
    renderSchedulePdf(
      emptySessions,
      emptySubjects,
      emptyStudents,
      emptyEnrollments,
      emptyTeachers,
      {}
    );
    expect(addPageMock).not.toHaveBeenCalled();
  });

  it("weekRange 있을 때 filename에 날짜 범위 포함", () => {
    renderSchedulePdf(
      emptySessions,
      emptySubjects,
      emptyStudents,
      emptyEnrollments,
      emptyTeachers,
      {
        academyName: "학원",
        weekRange: { startDate: "2026-04-13", endDate: "2026-04-19" },
      }
    );
    expect(saveMock).toHaveBeenCalledWith(expect.stringContaining("2026-04-13"));
  });

  it("weekRange 있을 때 filename에 academyName 포함", () => {
    renderSchedulePdf(
      emptySessions,
      emptySubjects,
      emptyStudents,
      emptyEnrollments,
      emptyTeachers,
      {
        academyName: "우리학원",
        weekRange: { startDate: "2026-04-13", endDate: "2026-04-19" },
      }
    );
    expect(saveMock).toHaveBeenCalledWith(expect.stringContaining("우리학원"));
  });
});

describe("renderSchedulePdf — teachers 파라미터", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("teachers 배열 포함 시 예외 없이 실행된다", () => {
    const teachers: Teacher[] = [
      { id: "t1", name: "김선생", color: "#a78bfa" },
      { id: "t2", name: "이선생", color: "#34d399" },
    ];
    expect(() =>
      renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, teachers)
    ).not.toThrow();
  });

  it("teachers와 세션이 있을 때 예외 없이 실행된다", () => {
    const teachers: Teacher[] = [
      { id: "t1", name: "김선생", color: "#a78bfa" },
    ];
    const sessions: Session[] = [
      {
        id: "s1",
        weekday: 0,
        startsAt: "10:00",
        endsAt: "11:00",
        weekStartDate: "2026-04-13",
        teacherId: "t1",
        enrollmentIds: [],
      },
    ];
    expect(() =>
      renderSchedulePdf(sessions, emptySubjects, emptyStudents, emptyEnrollments, teachers)
    ).not.toThrow();
  });

  it("title 옵션이 있으면 doc.save 호출 시 filename 옵션이 우선 적용된다", () => {
    const teachers: Teacher[] = [{ id: "t1", name: "김선생", color: "#a78bfa" }];
    renderSchedulePdf(
      emptySessions,
      emptySubjects,
      emptyStudents,
      emptyEnrollments,
      teachers,
      {
        filename: "김선생_시간표_2026-04-13.pdf",
        title: "김선생 선생님 시간표",
      }
    );
    expect(saveMock).toHaveBeenCalledWith("김선생_시간표_2026-04-13.pdf");
  });
});

describe("renderSchedulePdf — 시간 라벨 스타일 A (가독성 개선)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("30분 슬롯에는 '·' 점이 출력된다 (숫자 ':30' 대신)", () => {
    renderSchedulePdf([], [], [], [], []);
    const textArgs = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textArgs).toContain("·");
    expect(textArgs).not.toContain("9:30"); // 숫자 라벨은 정시에만
  });

  it("정시 라벨(예: '10:00')은 여전히 출력된다", () => {
    renderSchedulePdf([], [], [], [], []);
    const textArgs = (textMock.mock.calls as [string][]).map(([t]) => t);
    expect(textArgs).toContain("10:00");
  });

  it("30분 슬롯에서 점선 패턴이 설정된다 (setLineDashPattern 호출)", () => {
    vi.clearAllMocks();
    renderSchedulePdf([], [], [], [], []);
    expect(setLineDashPatternMock).toHaveBeenCalled();
  });
});

describe("renderSchedulePdf — 학생 필터 모드 (가독성 개선)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const teacher: Teacher[] = [{ id: "t1", name: "이강사", color: "#7c3aed" }];

  it("filterStudentId 없으면 강사 legend circle이 그려진다", () => {
    const sessions: Session[] = [
      { id: "s1", weekday: 0, startsAt: "10:00", endsAt: "11:00", weekStartDate: "2026-04-27", enrollmentIds: [], teacherId: "t1" },
    ];
    renderSchedulePdf(sessions, [], [], [], teacher, {});
    expect(circlesMock).toHaveBeenCalled();
  });

  it("filterStudentId 있으면 강사 legend circle이 그려지지 않는다", () => {
    const sessions: Session[] = [
      { id: "s1", weekday: 0, startsAt: "10:00", endsAt: "11:00", weekStartDate: "2026-04-27", enrollmentIds: [], teacherId: "t1" },
    ];
    renderSchedulePdf(sessions, [], [], [], teacher, { filterStudentId: "student-1" });
    // legend용 circle은 없어야 함 (박스 내 도트 circle은 PdfSessionBlock에서)
    expect(circlesMock).not.toHaveBeenCalled();
  });
});

describe("renderSchedulePdf — lane 분할 (겹침 처리)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("같은 weekday·시간대 세션 2개가 서로 다른 x에 rect를 그린다", () => {
    const sessions: Session[] = [
      { id: "s1", weekday: 2, startsAt: "11:00", endsAt: "12:00", weekStartDate: "2026-04-27", enrollmentIds: [], yPosition: 1 },
      { id: "s2", weekday: 2, startsAt: "11:00", endsAt: "16:30", weekStartDate: "2026-04-27", enrollmentIds: [], yPosition: 2 },
    ];
    renderSchedulePdf(sessions, [], [], [], []);

    // rect(x, y, w, h, style) — x 값만 추출 (padding 1mm 포함된 실제 x)
    const xValues = (rectMock.mock.calls as number[][]).map(([x]) => Math.round(x * 10));
    const uniqueX = new Set(xValues);
    expect(uniqueX.size).toBeGreaterThan(1);
  });

  it("단일 세션은 weekday 컬럼 전체 너비로 그려진다", () => {
    const sessions: Session[] = [
      { id: "s1", weekday: 0, startsAt: "10:00", endsAt: "11:00", weekStartDate: "2026-04-27", enrollmentIds: [] },
    ];
    renderSchedulePdf(sessions, [], [], [], []);

    // 7컬럼 기준 각 컬럼 폭 ≈ 262/7 ≈ 37.4mm — rect width가 컬럼 폭에 근접해야 함
    const widths = (rectMock.mock.calls as number[][]).map(([,, w]) => w);
    const maxWidth = Math.max(...widths);
    expect(maxWidth).toBeGreaterThan(30); // 단일 lane이면 컬럼 전체 폭 사용
  });

  it("operatingDays=[0,1,2,3,4,5]이면 6컬럼으로 그려진다 (weekdayCount=6)", () => {
    renderSchedulePdf([], [], [], [], [], { operatingDays: [0, 1, 2, 3, 4, 5] });
    // text 호출 중 요일 라벨(월화수목금토)이 6번 출력되어야 한다
    // textMock.mock.calls에서 "월","화",...,"토" 중 하나 이상이 포함되는지 확인
    const textArgs = (textMock.mock.calls as [string][]).map(([t]) => t);
    const dayLabels = textArgs.filter((t) => ["월","화","수","목","금","토","일"].includes(t));
    expect(dayLabels.length).toBe(6);
  });

  it("operatingDays 미지정이면 기본 7컬럼으로 그려진다", () => {
    renderSchedulePdf([], [], [], [], []);
    const textArgs = (textMock.mock.calls as [string][]).map(([t]) => t);
    const dayLabels = textArgs.filter((t) => ["월","화","수","목","금","토","일"].includes(t));
    expect(dayLabels.length).toBe(7);
  });
});

describe("renderSchedulePdf — yPosition overflow 버그 (fix/pdf-lane-overflow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 버그 재현: 월요일에 혼자 있는 세션의 yPosition=2이면
  // totalLanes=1, laneIndex=1 → x가 화요일 위치로 이동
  it("yPosition이 totalLanes를 초과해도 월요일 세션은 월요일 컬럼 내에 그려진다", () => {
    const sessions: Session[] = [
      // 월요일 혼자 있음 + yPosition=2 (버그 트리거)
      { id: "s1", weekday: 0, startsAt: "20:00", endsAt: "21:00", weekStartDate: "2026-04-27", enrollmentIds: [], yPosition: 2 },
      // 화요일 세션 (비교 기준)
      { id: "s2", weekday: 1, startsAt: "20:30", endsAt: "21:30", weekStartDate: "2026-04-27", enrollmentIds: [], yPosition: 1 },
    ];
    renderSchedulePdf(sessions, [], [], [], []);

    // 7컬럼 기준: dayColWidth = 262/7 ≈ 37.4mm
    // 월요일 컬럼 x 범위: [25, 62.4), 화요일: [62.4, 99.8)
    const MONDAY_COL_END = 10 + 15 + 262 / 7; // ≈ 62.43mm
    const rectXValues = (rectMock.mock.calls as number[][]).map(([x]) => x);
    // s1(월)과 s2(화)가 같은 y에 있지 않으므로 가장 작은 x가 월요일 것
    const minX = Math.min(...rectXValues);
    expect(minX).toBeLessThan(MONDAY_COL_END); // 월요일 컬럼 내
  });

  it("yPosition=3이고 혼자인 세션도 올바른 요일 컬럼 내에 그려진다", () => {
    const sessions: Session[] = [
      { id: "s1", weekday: 2, startsAt: "10:00", endsAt: "11:00", weekStartDate: "2026-04-27", enrollmentIds: [], yPosition: 3 },
    ];
    renderSchedulePdf(sessions, [], [], [], []);

    // 수요일(colIndex=2) x 범위: [25 + 2*37.4, 25 + 3*37.4) = [99.8, 137.2)
    const dayW = 262 / 7;
    const WED_COL_START = 10 + 15 + 2 * dayW;
    const WED_COL_END = WED_COL_START + dayW;
    const rectXValues = (rectMock.mock.calls as number[][]).map(([x]) => x);
    const minX = Math.min(...rectXValues);
    expect(minX).toBeGreaterThanOrEqual(WED_COL_START - 2); // padding 허용
    expect(minX).toBeLessThan(WED_COL_END);
  });

  it("같은 요일에 yPosition이 중복된 두 세션이 다른 lane에 할당된다", () => {
    const sessions: Session[] = [
      { id: "s1", weekday: 0, startsAt: "10:00", endsAt: "11:00", weekStartDate: "2026-04-27", enrollmentIds: [], yPosition: 1 },
      { id: "s2", weekday: 0, startsAt: "10:00", endsAt: "11:00", weekStartDate: "2026-04-27", enrollmentIds: [], yPosition: 1 }, // 중복!
    ];
    renderSchedulePdf(sessions, [], [], [], []);

    const rectXValues = (rectMock.mock.calls as number[][]).map(([x]) => Math.round(x * 10));
    const uniqueX = new Set(rectXValues);
    expect(uniqueX.size).toBeGreaterThan(1); // 서로 다른 lane
  });
});
