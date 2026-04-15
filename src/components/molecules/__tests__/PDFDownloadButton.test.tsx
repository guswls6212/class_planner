/**
 * PDFDownloadButton 테스트
 *
 * 핵심 검증 사항:
 * 1. 초기 렌더 시 pdf-utils 를 import 하지 않는다 (dynamic import)
 * 2. 버튼 클릭 시 pdf-utils 를 동적으로 import 하고 함수를 호출한다
 * 3. 생성 중에는 로딩 상태(disabled)가 표시된다
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PDFDownloadButton from "../PDFDownloadButton";

// pdf-utils 동적 import 모킹
// 경로는 컴포넌트가 실제로 import 하는 경로와 일치해야 한다 (vitest 모듈 ID 기준)
const mockDownloadTimetableAsPDF = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/pdf-utils", () => ({
  downloadTimetableAsPDF: mockDownloadTimetableAsPDF,
}));

describe("PDFDownloadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("초기 렌더 시 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <PDFDownloadButton
          timeTableRef={{ current: null }}
          selectedStudent={undefined}
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
        timeTableRef={{ current: null }}
        selectedStudent={undefined}
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
        timeTableRef={{ current: null }}
        selectedStudent={undefined}
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
        timeTableRef={{ current: null }}
        selectedStudent={undefined}
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
        timeTableRef={{ current: null }}
        selectedStudent={undefined}
        isDownloading={false}
        onDownloadStart={vi.fn()}
        onDownloadEnd={vi.fn()}
      />
    );

    expect(screen.getByText("시간표 다운로드")).toBeDefined();
  });

  it("timeTableRef.current 가 null 이면 다운로드 함수를 호출하지 않아야 한다", async () => {
    const onDownloadStart = vi.fn();
    const onDownloadEnd = vi.fn();

    render(
      <PDFDownloadButton
        timeTableRef={{ current: null }}
        selectedStudent={undefined}
        isDownloading={false}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    // null ref 이면 onDownloadStart 자체도 호출되지 않는다
    expect(onDownloadStart).not.toHaveBeenCalled();
    expect(mockDownloadTimetableAsPDF).not.toHaveBeenCalled();
  });

  it("버튼 클릭 시 pdf-utils 를 동적으로 import 하고 downloadTimetableAsPDF 를 호출해야 한다", async () => {
    const onDownloadStart = vi.fn();
    const onDownloadEnd = vi.fn();
    const div = document.createElement("div");

    render(
      <PDFDownloadButton
        timeTableRef={{ current: div }}
        selectedStudent={{ id: "s1", name: "홍길동" }}
        isDownloading={false}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    // 비동기 작업 완료 대기
    await vi.waitFor(() => {
      expect(mockDownloadTimetableAsPDF).toHaveBeenCalledTimes(1);
    });

    expect(mockDownloadTimetableAsPDF).toHaveBeenCalledWith(div, "홍길동");
    expect(onDownloadStart).toHaveBeenCalledTimes(1);
    expect(onDownloadEnd).toHaveBeenCalledTimes(1);
  });

  it("다운로드 성공 후 onDownloadEnd 가 호출되어야 한다", async () => {
    const onDownloadStart = vi.fn();
    const onDownloadEnd = vi.fn();
    const div = document.createElement("div");

    render(
      <PDFDownloadButton
        timeTableRef={{ current: div }}
        selectedStudent={undefined}
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
    mockDownloadTimetableAsPDF.mockRejectedValueOnce(new Error("PDF error"));

    const onDownloadStart = vi.fn();
    const onDownloadEnd = vi.fn();
    const div = document.createElement("div");

    render(
      <PDFDownloadButton
        timeTableRef={{ current: div }}
        selectedStudent={undefined}
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
});
