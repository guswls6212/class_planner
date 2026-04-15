import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("../../../../components/molecules/PDFDownloadButton", () => ({
  default: (props: any) => (
    <button data-testid="pdf-btn" disabled={props.isDownloading}>
      PDF {props.isDownloading ? "다운로드 중..." : "다운로드"}
    </button>
  ),
}));

import PdfDownloadSection from "../PdfDownloadSection";

describe("PdfDownloadSection", () => {
  it("PDFDownloadButton에 props를 전달한다", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <PdfDownloadSection
        timeTableRef={ref}
        isDownloading={false}
        onDownloadStart={vi.fn()}
        onDownloadEnd={vi.fn()}
      />
    );
    const btn = getByTestId("pdf-btn");
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("isDownloading 시 다운로드 중 상태를 전달한다", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <PdfDownloadSection
        timeTableRef={ref}
        isDownloading={true}
        onDownloadStart={vi.fn()}
        onDownloadEnd={vi.fn()}
      />
    );
    expect(getByTestId("pdf-btn")).toBeDisabled();
  });
});
