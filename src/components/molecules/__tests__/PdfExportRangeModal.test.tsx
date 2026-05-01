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
