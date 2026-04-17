import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../components/molecules/HelpTooltip", () => ({
  HelpTooltip: ({ label }: { label: string; content: string }) => (
    <button aria-label={label}>도움말</button>
  ),
}));

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
    <button onClick={onDownload}>
      {viewLabel ?? "시간표"} PDF 다운로드
    </button>
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
  onDownload: vi.fn(),
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

  it("userId가 null이면 템플릿/공유 버튼이 없다", () => {
    render(<ScheduleActionBar {...baseProps} userId={null} />);
    expect(screen.queryByText("현재 주를 템플릿으로 저장")).toBeNull();
    expect(screen.queryByText("저장된 템플릿 적용하기")).toBeNull();
    expect(screen.queryByText("공유 링크")).toBeNull();
  });

  it("userId가 있으면 템플릿·공유 버튼이 모두 렌더된다", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" />);
    expect(screen.getByText("현재 주를 템플릿으로 저장")).toBeDefined();
    expect(screen.getByText("저장된 템플릿 적용하기")).toBeDefined();
    expect(screen.getByText("공유 링크")).toBeDefined();
  });

  it("템플릿 저장 버튼 클릭 시 onSaveTemplate이 호출된다", () => {
    const onSaveTemplate = vi.fn();
    render(<ScheduleActionBar {...baseProps} userId="user-1" onSaveTemplate={onSaveTemplate} />);
    fireEvent.click(screen.getByText("현재 주를 템플릿으로 저장"));
    expect(onSaveTemplate).toHaveBeenCalledTimes(1);
  });

  it("템플릿 적용 버튼 클릭 시 onApplyTemplate이 호출된다", () => {
    const onApplyTemplate = vi.fn();
    render(<ScheduleActionBar {...baseProps} userId="user-1" onApplyTemplate={onApplyTemplate} />);
    fireEvent.click(screen.getByText("저장된 템플릿 적용하기"));
    expect(onApplyTemplate).toHaveBeenCalledTimes(1);
  });

  it("userId가 있을 때 템플릿 버튼 옆에 도움말 버튼이 있다", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" />);
    const helpBtns = screen.getAllByRole("button", { name: /도움말/ });
    expect(helpBtns.length).toBeGreaterThanOrEqual(1);
  });
});
