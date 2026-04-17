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
    save: saveMock,
    addPage: addPageMock,
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
