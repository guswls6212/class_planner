import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// PDFDownloadButton mock — UAT 2026-05-22 dropdown 제거 후 단순 button
vi.mock("../../../../components/molecules/PDFDownloadButton", () => ({
  default: ({
    viewLabel,
    onDownload,
  }: {
    viewLabel?: string;
    onDownload: () => void;
    isDownloading: boolean;
  }) => (
    <button onClick={onDownload} aria-label={`${viewLabel ?? "시간표"} PDF`}>
      PDF
    </button>
  ),
}));

import ScheduleActionBar from "../ScheduleActionBar";

const baseProps = {
  viewLabel: "주간 시간표",
  onOpenPdfDialog: vi.fn(),
  isDownloading: false,
  onDownloadStart: vi.fn(),
  onDownloadEnd: vi.fn(),
  onSaveTemplate: vi.fn(),
  onApplyTemplate: vi.fn(),
  isSaving: false,
};

describe("ScheduleActionBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PDF 다운로드 버튼을 렌더한다", () => {
    render(<ScheduleActionBar {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /주간 시간표 PDF/ }),
    ).toBeInTheDocument();
  });

  it("legacy TemplateMenu(저장/적용 트리거)는 렌더되지 않는다", () => {
    render(<ScheduleActionBar {...baseProps} />);
    expect(screen.queryByText("템플릿 저장 트리거")).toBeNull();
    expect(screen.queryByText("템플릿 적용 트리거")).toBeNull();
  });

  it("공유 링크는 더 이상 렌더되지 않는다 (schedule-share-button-removal)", () => {
    render(<ScheduleActionBar {...baseProps} />);
    expect(screen.queryByRole("link", { name: /공유/ })).toBeNull();
  });

  it("PDF 버튼 클릭 시 onOpenPdfDialog 호출", () => {
    const onOpenPdfDialog = vi.fn();
    render(<ScheduleActionBar {...baseProps} onOpenPdfDialog={onOpenPdfDialog} />);
    fireEvent.click(screen.getByRole("button", { name: /주간 시간표 PDF/ }));
    expect(onOpenPdfDialog).toHaveBeenCalledTimes(1);
  });

  it("viewMode='daily' → PDF 버튼 렌더 X (라벨 불일치 회피)", () => {
    render(<ScheduleActionBar {...baseProps} viewMode="daily" />);
    expect(
      screen.queryByRole("button", { name: /주간 시간표 PDF/ }),
    ).toBeNull();
  });

  it("viewMode='monthly' → PDF 버튼 렌더 X", () => {
    render(<ScheduleActionBar {...baseProps} viewMode="monthly" />);
    expect(
      screen.queryByRole("button", { name: /주간 시간표 PDF/ }),
    ).toBeNull();
  });
});
