/**
 * 개인정보처리방침 페이지 기본 렌더 테스트.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage from "../page";

describe("Privacy Policy Page", () => {
  it("에러 없이 렌더링되고 핵심 컨테이너를 포함한다", () => {
    const { getByTestId, getByText } = render(<PrivacyPage />);
    expect(getByTestId("privacy-page")).toBeTruthy();
    expect(getByText("개인정보처리방침")).toBeTruthy();
  });

  it("익명 분석 · 보관기간 고지 문구를 포함한다", () => {
    const { getByText } = render(<PrivacyPage />);
    expect(getByText(/익명 이용 분석/)).toBeTruthy();
    expect(getByText(/90일 이후 자동 삭제/)).toBeTruthy();
  });
});
