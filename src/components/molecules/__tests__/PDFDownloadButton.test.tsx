/**
 * PDFDownloadButton 테스트
 *
 * 핵심 검증 사항:
 * 1. 버튼이 올바르게 렌더링된다
 * 2. 버튼 클릭 시 onDownload 콜백이 호출된다
 * 3. 생성 중에는 로딩 상태(disabled)가 표시된다
 * 4. 에러 발생 시 showError가 호출된다
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PDFDownloadButton from "../PDFDownloadButton";

const mockShowError = vi.fn();
vi.mock("@/lib/toast", () => ({
  showError: (...args: unknown[]) => mockShowError(...args),
  showToast: vi.fn(),
}));

describe("PDFDownloadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowError.mockClear();
  });

  it("초기 렌더 시 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <PDFDownloadButton
          onDownload={vi.fn()}
          isDownloading={false}
          onDownloadStart={vi.fn()}
          onDownloadEnd={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(
      <PDFDownloadButton
        onDownload={vi.fn()}
        isDownloading={false}
        onDownloadStart={vi.fn()}
        onDownloadEnd={vi.fn()}
      />
    );

    expect(container.firstChild).toBeDefined();
  });

  it("isDownloading=true 일 때 버튼이 비활성화되어야 한다", () => {
    render(
      <PDFDownloadButton
        onDownload={vi.fn()}
        isDownloading={true}
        onDownloadStart={vi.fn()}
        onDownloadEnd={vi.fn()}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("isDownloading=true 일 때 '다운로드 중...' 텍스트를 표시해야 한다", () => {
    render(
      <PDFDownloadButton
        onDownload={vi.fn()}
        isDownloading={true}
        onDownloadStart={vi.fn()}
        onDownloadEnd={vi.fn()}
      />
    );

    expect(screen.getByText("다운로드 중...")).toBeDefined();
  });

  it("isDownloading=false 일 때 '시간표 다운로드' 텍스트를 표시해야 한다", () => {
    render(
      <PDFDownloadButton
        onDownload={vi.fn()}
        isDownloading={false}
        onDownloadStart={vi.fn()}
        onDownloadEnd={vi.fn()}
      />
    );

    expect(screen.getByText("시간표 다운로드")).toBeDefined();
  });

  it("버튼 클릭 시 onDownloadStart와 onDownload가 호출되어야 한다", async () => {
    const onDownloadStart = vi.fn();
    const onDownloadEnd = vi.fn();
    const onDownload = vi.fn().mockResolvedValue(undefined);

    render(
      <PDFDownloadButton
        onDownload={onDownload}
        isDownloading={false}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await vi.waitFor(() => {
      expect(onDownload).toHaveBeenCalledTimes(1);
    });

    expect(onDownloadStart).toHaveBeenCalledTimes(1);
    expect(onDownloadEnd).toHaveBeenCalledTimes(1);
  });

  it("다운로드 성공 후 onDownloadEnd 가 호출되어야 한다", async () => {
    const onDownloadStart = vi.fn();
    const onDownloadEnd = vi.fn();
    const onDownload = vi.fn().mockResolvedValue(undefined);

    render(
      <PDFDownloadButton
        onDownload={onDownload}
        isDownloading={false}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await vi.waitFor(() => {
      expect(onDownloadEnd).toHaveBeenCalledTimes(1);
    });
  });

  it("다운로드 실패 시에도 onDownloadEnd 가 호출되어야 한다 (finally 보장)", async () => {
    const onDownload = vi.fn().mockRejectedValueOnce(new Error("PDF error"));
    const onDownloadStart = vi.fn();
    const onDownloadEnd = vi.fn();

    render(
      <PDFDownloadButton
        onDownload={onDownload}
        isDownloading={false}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await vi.waitFor(() => {
      expect(onDownloadEnd).toHaveBeenCalledTimes(1);
    });

    expect(mockShowError).toHaveBeenCalledWith("PDF 다운로드에 실패했습니다.");
  });
});
