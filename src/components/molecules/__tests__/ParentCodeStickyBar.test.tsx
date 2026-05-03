import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParentCodeStickyBar from "../ParentCodeStickyBar";

vi.mock("@/lib/toast", () => ({
  showToast: vi.fn(),
}));

describe("ParentCodeStickyBar", () => {
  const defaultProps = {
    academyUrl: "http://localhost:3000/academy/현진학원",
    accessCodesCount: 10,
    onBulkCreate: vi.fn(),
    onBulkRenew: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("URL과 학부모 접속 라벨을 렌더한다", () => {
    render(<ParentCodeStickyBar {...defaultProps} />);
    expect(screen.getByText("학부모 접속")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.academyUrl)).toBeInTheDocument();
  });

  it("URL 복사 버튼이 navigator.clipboard.writeText를 호출한다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ParentCodeStickyBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("URL 복사"));
    expect(writeText).toHaveBeenCalledWith(defaultProps.academyUrl);
  });

  it("⋮ 버튼 클릭 시 일괄 메뉴가 토글된다", () => {
    render(<ParentCodeStickyBar {...defaultProps} />);
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByLabelText("일괄 작업 메뉴"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("누락 학생 일괄 생성")).toBeInTheDocument();
    expect(screen.getByText("전체 갱신 (위험)")).toBeInTheDocument();
  });

  it("'누락 학생 일괄 생성' 클릭 → confirm 모달 → 확인 시 onBulkCreate 호출", () => {
    render(<ParentCodeStickyBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("일괄 작업 메뉴"));
    fireEvent.click(screen.getByText("누락 학생 일괄 생성"));

    const confirmButton = screen.getByRole("button", { name: "생성" });
    fireEvent.click(confirmButton);

    expect(defaultProps.onBulkCreate).toHaveBeenCalledTimes(1);
  });

  it("'전체 갱신 (위험)' 클릭 → danger confirm 모달 → 확인 시 onBulkRenew 호출", () => {
    render(<ParentCodeStickyBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("일괄 작업 메뉴"));
    fireEvent.click(screen.getByText("전체 갱신 (위험)"));

    expect(
      screen.getByText(/현재 학원의 10개 접속 코드가 즉시 만료/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이해했습니다, 갱신" }));
    expect(defaultProps.onBulkRenew).toHaveBeenCalledTimes(1);
  });

  it("취소 버튼은 onBulkCreate/onBulkRenew를 호출하지 않는다", () => {
    render(<ParentCodeStickyBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("일괄 작업 메뉴"));
    fireEvent.click(screen.getByText("누락 학생 일괄 생성"));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(defaultProps.onBulkCreate).not.toHaveBeenCalled();
  });
});
