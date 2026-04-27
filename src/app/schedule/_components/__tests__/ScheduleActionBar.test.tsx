import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../components/molecules/PDFDownloadButton", () => ({
  default: ({
    viewLabel,
    onDownload,
  }: {
    viewLabel?: string;
    onDownload: () => void;
    isDownloading: boolean;
    onDownloadStart: () => void;
    onDownloadEnd: () => void;
  }) => (
    <button onClick={onDownload} aria-label={`${viewLabel ?? "시간표"} PDF 다운로드`}>
      {viewLabel ?? "시간표"} PDF 다운로드
    </button>
  ),
}));

vi.mock("../../../../components/molecules/TemplateMenu", () => ({
  TemplateMenu: ({
    onSave,
    onApply,
  }: {
    onSave: () => void;
    onApply: () => void;
    isSaving?: boolean;
  }) => (
    <div>
      <button onClick={onSave}>템플릿 저장 트리거</button>
      <button onClick={onApply}>템플릿 적용 트리거</button>
    </div>
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import ScheduleActionBar from "../ScheduleActionBar";

const baseProps = {
  viewLabel: "주간 시간표",
  onOpenPdfDialog: vi.fn(),
  isDownloading: false,
  onDownloadStart: vi.fn(),
  onDownloadEnd: vi.fn(),
  userId: null,
  onSaveTemplate: vi.fn(),
  onApplyTemplate: vi.fn(),
  isSaving: false,
};

describe("ScheduleActionBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PDF 다운로드 버튼을 렌더한다", () => {
    render(<ScheduleActionBar {...baseProps} />);
    expect(screen.getByText("주간 시간표 PDF 다운로드")).toBeDefined();
  });

  it("userId가 null이면 TemplateMenu와 공유 링크가 없다", () => {
    render(<ScheduleActionBar {...baseProps} userId={null} />);
    expect(screen.queryByText("템플릿 저장 트리거")).toBeNull();
    expect(screen.queryByRole("link", { name: /공유/ })).toBeNull();
  });

  it("userId가 있으면 TemplateMenu가 렌더된다", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" />);
    expect(screen.getByText("템플릿 저장 트리거")).toBeDefined();
    expect(screen.getByText("템플릿 적용 트리거")).toBeDefined();
  });

  it("userId가 있으면 공유 링크가 렌더된다", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" />);
    expect(screen.getByRole("link", { name: /공유/ })).toBeDefined();
  });

  it("TemplateMenu의 저장 트리거 클릭 시 onSaveTemplate이 호출된다", () => {
    const onSaveTemplate = vi.fn();
    render(<ScheduleActionBar {...baseProps} userId="user-1" onSaveTemplate={onSaveTemplate} />);
    fireEvent.click(screen.getByText("템플릿 저장 트리거"));
    expect(onSaveTemplate).toHaveBeenCalledTimes(1);
  });

  it("TemplateMenu의 적용 트리거 클릭 시 onApplyTemplate이 호출된다", () => {
    const onApplyTemplate = vi.fn();
    render(<ScheduleActionBar {...baseProps} userId="user-1" onApplyTemplate={onApplyTemplate} />);
    fireEvent.click(screen.getByText("템플릿 적용 트리거"));
    expect(onApplyTemplate).toHaveBeenCalledTimes(1);
  });

  it("PDF 버튼 클릭 시 onOpenPdfDialog 호출", () => {
    const onOpenPdfDialog = vi.fn();
    render(<ScheduleActionBar {...baseProps} onOpenPdfDialog={onOpenPdfDialog} />);
    fireEvent.click(screen.getByRole("button", { name: /PDF 다운로드/ }));
    expect(onOpenPdfDialog).toHaveBeenCalledTimes(1);
  });

  it("HelpTooltip이 렌더되지 않는다 (i 버튼 제거됨)", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" />);
    expect(screen.queryByRole("button", { name: /도움말/ })).toBeNull();
  });
});
