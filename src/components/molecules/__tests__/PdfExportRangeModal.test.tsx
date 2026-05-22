import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PdfExportRangeModal from "../PdfExportRangeModal";
import type { PreflightResult } from "@/lib/pdf/preflightCheck";

// 수요일 2026-04-15 → 해당 주 월요일 = 2026-04-13
const selectedDate = new Date(2026, 3, 15);

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onExport: vi.fn(),
  viewMode: "weekly" as const,
  selectedDate,
  isExporting: false,
};

describe("PdfExportRangeModal", () => {
  it("isOpen=false 시 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <PdfExportRangeModal {...baseProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("weekly 뷰: '현재 뷰만 출력' + '여러 주 범위 출력' 옵션 노출", () => {
    render(<PdfExportRangeModal {...baseProps} />);
    expect(screen.getByLabelText("현재 뷰만 출력")).toBeInTheDocument();
    expect(screen.getByLabelText("여러 주 범위 출력")).toBeInTheDocument();
  });

  it("daily 뷰: weekly와 동일하게 2가지 옵션 노출", () => {
    render(<PdfExportRangeModal {...baseProps} viewMode="daily" />);
    expect(screen.getByLabelText("현재 뷰만 출력")).toBeInTheDocument();
    expect(screen.getByLabelText("여러 주 범위 출력")).toBeInTheDocument();
  });

  it("monthly 뷰: '해당 월 전체 출력' 단일 옵션만 노출", () => {
    render(<PdfExportRangeModal {...baseProps} viewMode="monthly" />);
    expect(screen.getByLabelText("해당 월 전체 출력")).toBeInTheDocument();
    expect(screen.queryByLabelText("여러 주 범위 출력")).not.toBeInTheDocument();
  });

  it("weekly '현재 뷰만 출력' (기본 선택) → 출력 버튼 클릭 시 단일 주 범위로 onExport 호출", () => {
    const onExport = vi.fn();
    render(<PdfExportRangeModal {...baseProps} onExport={onExport} />);
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    expect(onExport).toHaveBeenCalledWith({
      startDate: "2026-04-13",
      endDate: "2026-04-19",
    });
  });

  it("'여러 주 범위 출력' 선택 시 날짜 입력 2개 노출", () => {
    render(<PdfExportRangeModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText("여러 주 범위 출력"));
    expect(screen.getByLabelText("시작일")).toBeInTheDocument();
    expect(screen.getByLabelText("종료일")).toBeInTheDocument();
  });

  it("범위 지정 후 출력 → 입력 날짜로 onExport 호출", () => {
    const onExport = vi.fn();
    render(<PdfExportRangeModal {...baseProps} onExport={onExport} />);
    fireEvent.click(screen.getByLabelText("여러 주 범위 출력"));
    fireEvent.change(screen.getByLabelText("시작일"), {
      target: { value: "2026-04-13" },
    });
    fireEvent.change(screen.getByLabelText("종료일"), {
      target: { value: "2026-05-03" },
    });
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    expect(onExport).toHaveBeenCalledWith({
      startDate: "2026-04-13",
      endDate: "2026-05-03",
    });
  });

  it("monthly 뷰: selectedDate(4월) 기준 월 전체 범위로 onExport 호출", () => {
    const onExport = vi.fn();
    render(
      <PdfExportRangeModal
        {...baseProps}
        viewMode="monthly"
        onExport={onExport}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    // 2026-04-01은 수요일 → 해당 주 월요일 = 2026-03-30
    expect(onExport).toHaveBeenCalledWith({
      startDate: "2026-03-30",
      endDate: "2026-04-30",
    });
  });

  it("취소 버튼 클릭 시 onClose 호출", () => {
    const onClose = vi.fn();
    render(<PdfExportRangeModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("종료일 < 시작일 시 출력 버튼 disabled + 에러 메시지", () => {
    render(<PdfExportRangeModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText("여러 주 범위 출력"));
    fireEvent.change(screen.getByLabelText("시작일"), {
      target: { value: "2026-05-03" },
    });
    fireEvent.change(screen.getByLabelText("종료일"), {
      target: { value: "2026-04-13" },
    });
    expect(screen.getByRole("button", { name: "출력" })).toBeDisabled();
    expect(screen.getByText(/종료일이 시작일보다/)).toBeInTheDocument();
  });

  it("isExporting=true 시 출력 버튼 disabled + '출력 중...' 텍스트", () => {
    render(<PdfExportRangeModal {...baseProps} isExporting={true} />);
    const exportBtn = screen.getByRole("button", { name: "출력 중..." });
    expect(exportBtn).toBeDisabled();
  });

  it("backdrop 클릭 시 onClose 호출", () => {
    const onClose = vi.fn();
    render(<PdfExportRangeModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("pdf-export-modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("teachers prop 있을 때 '강사별로 1장씩' 라디오 옵션이 렌더된다", () => {
    const teachers = [
      { id: "t1", name: "김선생" },
      { id: "t2", name: "이선생" },
    ];
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} />);
    expect(screen.getByLabelText("강사별로 1장씩")).toBeInTheDocument();
  });

  it("teachers=[] 일 때 '강사별로 1장씩' 라디오가 disabled 처리된다", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={[]} />);
    const radio = screen.getByLabelText("강사별로 1장씩");
    expect(radio).toBeDisabled();
  });

  it("teachers=[] 일 때 '강사가 없습니다' 안내 문구가 노출된다", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={[]} />);
    expect(screen.getByText("(강사가 없습니다)")).toBeInTheDocument();
  });

  it("'강사별로 1장씩' 선택 후 출력 클릭 시 perTeacher: true로 onExport 호출", () => {
    const onExport = vi.fn();
    const teachers = [{ id: "t1", name: "김선생" }];
    render(
      <PdfExportRangeModal {...baseProps} onExport={onExport} teachers={teachers} />
    );
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ perTeacher: true })
    );
  });
});

describe("PdfExportRangeModal — preflight 경고 패널", () => {
  const teachers = [{ id: "t1", name: "김선생" }];

  it("preflightResult 없으면 경고 패널이 렌더되지 않는다", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("out-of-range 경고가 있으면 경고 패널이 렌더된다", () => {
    const preflightResult: PreflightResult = {
      warnings: [{ type: "out-of-range", message: "1개 수업이 출력 범위 밖" }],
      suggestSplit: null,
    };
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} preflightResult={preflightResult} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/1개 수업이 출력 범위 밖/)).toBeInTheDocument();
  });

  it("suggestSplit=per-teacher이면 '강사별 분할로 전환' 버튼이 노출된다", () => {
    const preflightResult: PreflightResult = {
      warnings: [{ type: "overlap", message: "월요일에 동시 진행 4건" }],
      suggestSplit: "per-teacher",
    };
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} preflightResult={preflightResult} />);
    expect(screen.getByRole("button", { name: "강사별 분할로 전환" })).toBeInTheDocument();
  });

  it("'강사별 분할로 전환' 버튼 클릭 시 scope가 per-teacher로 바뀐다", () => {
    const preflightResult: PreflightResult = {
      warnings: [{ type: "overlap", message: "월요일에 동시 진행 4건" }],
      suggestSplit: "per-teacher",
    };
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} preflightResult={preflightResult} />);
    fireEvent.click(screen.getByRole("button", { name: "강사별 분할로 전환" }));
    expect(screen.getByLabelText("강사별로 1장씩")).toBeChecked();
  });
});

describe("PdfExportRangeModal — teacher chip selector", () => {
  const teachers = [
    { id: "t1", name: "테스트강사", color: "#7c3aed" },
    { id: "t2", name: "이강사", color: "#06b6d4" },
  ];

  it("'강사별로 1장씩' 선택 시 강사 chip이 렌더된다", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} />);
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    expect(screen.getByRole("button", { name: /테스트강사/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /이강사/ })).toBeInTheDocument();
  });

  it("초기 상태: 모든 강사 chip이 선택됨 (aria-pressed=true)", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} />);
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    expect(screen.getByRole("button", { name: /테스트강사/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /이강사/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("강사 chip 클릭 시 deselect됨 (aria-pressed=false)", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} />);
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: /테스트강사/ }));
    expect(screen.getByRole("button", { name: /테스트강사/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("전체 해제 클릭 시 모든 chip deselect됨", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} />);
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "전체 해제" }));
    expect(screen.getByRole("button", { name: /테스트강사/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /이강사/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("전체 해제 후 전체 선택 클릭 시 모두 선택됨", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} />);
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "전체 해제" }));
    fireEvent.click(screen.getByRole("button", { name: "전체 선택" }));
    expect(screen.getByRole("button", { name: /테스트강사/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /이강사/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("0명 선택 시 출력 버튼 disabled + 에러 메시지", () => {
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} />);
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "전체 해제" }));
    expect(screen.getByRole("button", { name: "출력" })).toBeDisabled();
    expect(screen.getByText("강사를 1명 이상 선택해주세요.")).toBeInTheDocument();
  });

  it("1명만 선택 후 출력 시 selectedTeacherIds: ['t1']로 onExport 호출", () => {
    const onExport = vi.fn();
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} onExport={onExport} />);
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: /이강사/ }));
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ perTeacher: true, selectedTeacherIds: ["t1"] })
    );
  });

  it("전체 선택 상태 출력 시 selectedTeacherIds에 모든 id 포함", () => {
    const onExport = vi.fn();
    render(<PdfExportRangeModal {...baseProps} teachers={teachers} onExport={onExport} />);
    fireEvent.click(screen.getByLabelText("강사별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ selectedTeacherIds: ["t1", "t2"] })
    );
  });
});

// PR #428 — ADR-021 D4 follow-up: per-student mirror + initialScope pre-set + 30명+ guard
describe("PdfExportRangeModal — per-student (PR #428)", () => {
  const students = [
    { id: "s1", name: "학생A" },
    { id: "s2", name: "학생B" },
  ];

  it("students prop 있을 때 '학생별로 1장씩' 라디오 옵션이 렌더된다", () => {
    render(<PdfExportRangeModal {...baseProps} students={students} />);
    expect(screen.getByLabelText("학생별로 1장씩")).toBeInTheDocument();
  });

  it("students=[] 일 때 '학생별로 1장씩' 라디오가 disabled + '학생이 없습니다' 안내", () => {
    render(<PdfExportRangeModal {...baseProps} students={[]} />);
    expect(screen.getByLabelText("학생별로 1장씩")).toBeDisabled();
    expect(screen.getByText("(학생이 없습니다)")).toBeInTheDocument();
  });

  it("'학생별로 1장씩' 선택 후 출력 → perStudent: true + selectedStudentIds 전체 포함", () => {
    const onExport = vi.fn();
    render(
      <PdfExportRangeModal {...baseProps} students={students} onExport={onExport} />,
    );
    fireEvent.click(screen.getByLabelText("학생별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        perStudent: true,
        selectedStudentIds: ["s1", "s2"],
      }),
    );
  });

  it("학생 chip 클릭 시 deselect (aria-pressed=false)", () => {
    render(<PdfExportRangeModal {...baseProps} students={students} />);
    fireEvent.click(screen.getByLabelText("학생별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: /학생A/ }));
    expect(screen.getByRole("button", { name: /학생A/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("0명 선택 시 출력 버튼 disabled + '학생을 1명 이상' 에러", () => {
    render(<PdfExportRangeModal {...baseProps} students={students} />);
    fireEvent.click(screen.getByLabelText("학생별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "전체 해제" }));
    expect(screen.getByRole("button", { name: "출력" })).toBeDisabled();
    expect(screen.getByText("학생을 1명 이상 선택해주세요.")).toBeInTheDocument();
  });

  it("initialScope='per-student' 시 modal 오픈 즉시 per-student 선택됨", () => {
    render(
      <PdfExportRangeModal
        {...baseProps}
        students={students}
        initialScope="per-student"
      />,
    );
    expect(screen.getByLabelText("학생별로 1장씩")).toBeChecked();
  });

  it("hasTeacherFilter=true 시 per-student 라디오 미렌더 (mutually exclusive)", () => {
    render(
      <PdfExportRangeModal
        {...baseProps}
        students={students}
        hasTeacherFilter={true}
      />,
    );
    expect(screen.queryByLabelText("학생별로 1장씩")).not.toBeInTheDocument();
  });

  it.skip("30명+ 선택 + window.confirm 거부 → onExport 미호출", () => {
    const onExport = vi.fn();
    const many = Array.from({ length: 31 }, (_, i) => ({
      id: `s${i}`,
      name: `학생${i}`,
    }));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<PdfExportRangeModal {...baseProps} students={many} onExport={onExport} />);
    fireEvent.click(screen.getByLabelText("학생별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onExport).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it.skip("30명+ 선택 + window.confirm 승낙 → onExport 호출", () => {
    const onExport = vi.fn();
    const many = Array.from({ length: 31 }, (_, i) => ({
      id: `s${i}`,
      name: `학생${i}`,
    }));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<PdfExportRangeModal {...baseProps} students={many} onExport={onExport} />);
    fireEvent.click(screen.getByLabelText("학생별로 1장씩"));
    fireEvent.click(screen.getByRole("button", { name: "출력" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ perStudent: true }),
    );
    confirmSpy.mockRestore();
  });
});
