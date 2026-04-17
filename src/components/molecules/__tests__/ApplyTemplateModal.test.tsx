import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ApplyTemplateModal from "../ApplyTemplateModal";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";

const TEMPLATE: ScheduleTemplate = {
  id: "tpl-1",
  name: "기본 시간표",
  description: "주 5일 기본",
  templateData: {
    version: "1.0",
    sessions: [
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectName: "수학",
        subjectColor: "#FF0000",
        studentNames: ["홍길동"],
      },
    ],
  },
  createdBy: "user-1",
  createdAt: "2026-04-17T00:00:00Z",
  updatedAt: "2026-04-17T00:00:00Z",
};

describe("ApplyTemplateModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onApply: vi.fn(),
    templates: [TEMPLATE],
    isApplying: false,
    isLoading: false,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it("isOpen=true이면 렌더링된다", () => {
    render(<ApplyTemplateModal {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /템플릿 적용/ })).toBeInTheDocument();
  });

  it("isOpen=false이면 렌더링되지 않는다", () => {
    render(<ApplyTemplateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("heading", { name: /템플릿 적용/ })).not.toBeInTheDocument();
  });

  it("템플릿 목록이 표시된다", () => {
    render(<ApplyTemplateModal {...defaultProps} />);
    expect(screen.getByText("기본 시간표")).toBeInTheDocument();
  });

  it("템플릿 선택 후 적용 클릭 시 onApply가 호출된다", () => {
    render(<ApplyTemplateModal {...defaultProps} />);
    fireEvent.click(screen.getByText("기본 시간표"));
    fireEvent.click(screen.getByRole("button", { name: /적용/ }));
    expect(defaultProps.onApply).toHaveBeenCalledWith(TEMPLATE);
  });

  it("템플릿 미선택 시 적용 버튼이 비활성화된다", () => {
    render(<ApplyTemplateModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /적용/ })).toBeDisabled();
  });

  it("빈 목록이면 '저장된 템플릿이 없습니다' 메시지가 표시된다", () => {
    render(<ApplyTemplateModal {...defaultProps} templates={[]} />);
    expect(screen.getByText(/저장된 템플릿이 없습니다/)).toBeInTheDocument();
  });

  it("취소 클릭 시 onClose가 호출된다", () => {
    render(<ApplyTemplateModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /취소/ }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("템플릿 선택 시 세션 수와 덮어쓰기 경고가 표시된다", () => {
    render(<ApplyTemplateModal {...defaultProps} />);
    fireEvent.click(screen.getByText("기본 시간표"));
    expect(screen.getByText(/1개 세션/)).toBeInTheDocument();
    expect(screen.getByText(/현재 주의 기존 세션이 모두 삭제/)).toBeInTheDocument();
  });
});
