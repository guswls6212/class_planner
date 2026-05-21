import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// PDFDownloadButton mock — dropdown 구조 시뮬레이션 (toggle + 가이드 항목)
vi.mock("../../../../components/molecules/PDFDownloadButton", () => ({
  default: ({
    viewLabel,
    onDownload,
    onOpenGuide,
  }: {
    viewLabel?: string;
    onDownload: () => void;
    onOpenGuide?: () => void;
    isDownloading: boolean;
    onDownloadStart: () => void;
    onDownloadEnd: () => void;
  }) => (
    <div>
      <button onClick={onDownload} aria-label={`${viewLabel ?? "시간표"} PDF`}>
        PDF
      </button>
      {onOpenGuide && (
        <button onClick={onOpenGuide} aria-label="PDF 인쇄 가이드">
          인쇄 가이드
        </button>
      )}
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
    expect(
      screen.getByRole("button", { name: /주간 시간표 PDF/ }),
    ).toBeInTheDocument();
  });

  it("userId가 null이면 공유 링크가 없다", () => {
    render(<ScheduleActionBar {...baseProps} userId={null} />);
    expect(screen.queryByRole("link", { name: /공유/ })).toBeNull();
  });

  it("legacy TemplateMenu(저장/적용 트리거)는 렌더되지 않는다", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" />);
    expect(screen.queryByText("템플릿 저장 트리거")).toBeNull();
    expect(screen.queryByText("템플릿 적용 트리거")).toBeNull();
  });

  it("userId가 있으면 공유 링크가 렌더된다", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" />);
    expect(screen.getByRole("link", { name: /공유/ })).toBeDefined();
  });

  it("canManage=false이면 공유 링크가 숨겨진다 (member 역할)", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" canManage={false} />);
    expect(screen.queryByRole("link", { name: /공유/ })).toBeNull();
  });

  it("canManage=true이면 공유 링크가 렌더된다 (owner/admin 역할)", () => {
    render(<ScheduleActionBar {...baseProps} userId="user-1" canManage={true} />);
    expect(screen.getByRole("link", { name: /공유/ })).toBeDefined();
  });

  it("PDF 버튼 클릭 시 onOpenPdfDialog 호출", () => {
    const onOpenPdfDialog = vi.fn();
    render(<ScheduleActionBar {...baseProps} onOpenPdfDialog={onOpenPdfDialog} />);
    fireEvent.click(screen.getByRole("button", { name: /주간 시간표 PDF/ }));
    expect(onOpenPdfDialog).toHaveBeenCalledTimes(1);
  });

  it("PDF 가이드 버튼이 dropdown 안에 렌더된다 (P2 패턴)", () => {
    render(<ScheduleActionBar {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /PDF 인쇄 가이드/ }),
    ).toBeInTheDocument();
  });

  it("PDF 가이드 버튼 클릭 시 가이드 모달이 열린다", () => {
    render(<ScheduleActionBar {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /PDF 인쇄 가이드/ }));
    expect(screen.getByText("PDF 출력 가이드")).toBeInTheDocument();
  });

  it("viewMode='daily' → PDF dropdown 렌더 X (라벨 불일치 회피)", () => {
    render(<ScheduleActionBar {...baseProps} viewMode="daily" />);
    expect(
      screen.queryByRole("button", { name: /주간 시간표 PDF/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /PDF 인쇄 가이드/ }),
    ).toBeNull();
  });

  it("viewMode='monthly' → PDF dropdown 렌더 X", () => {
    render(<ScheduleActionBar {...baseProps} viewMode="monthly" />);
    expect(
      screen.queryByRole("button", { name: /주간 시간표 PDF/ }),
    ).toBeNull();
  });
});
