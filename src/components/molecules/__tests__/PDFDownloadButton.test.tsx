/**
 * PDFDownloadButton 기본 테스트 (49줄)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PDFDownloadButton from "../PDFDownloadButton";

describe("PDFDownloadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PDF 다운로드 버튼이 에러 없이 렌더링되어야 한다", () => {
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

  it("다운로딩 상태를 처리해야 한다", () => {
    expect(() => {
      render(
        <PDFDownloadButton
          timeTableRef={{ current: null }}
          selectedStudent={undefined}
          isDownloading={true}
          onDownloadStart={vi.fn()}
          onDownloadEnd={vi.fn()}
        />
      );
    }).not.toThrow();
  });
});
