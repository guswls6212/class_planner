import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SaveTemplateModal from "../SaveTemplateModal";
import { FIXTURE_TEMPLATE_DATA } from "@/__tests__/fixtures/template.fixture";

const TEMPLATE_DATA = FIXTURE_TEMPLATE_DATA;

describe("SaveTemplateModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    templateData: TEMPLATE_DATA,
    isSaving: false,
  };

  beforeEach(() => { vi.clearAllMocks(); });

  it("isOpen=true이면 렌더링된다", () => {
    render(<SaveTemplateModal {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /템플릿으로 저장/ })).toBeInTheDocument();
  });

  it("isOpen=false이면 렌더링되지 않는다", () => {
    render(<SaveTemplateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("heading", { name: /템플릿으로 저장/ })).not.toBeInTheDocument();
  });

  it("이름 없이 저장 시 onSave가 호출되지 않는다", () => {
    render(<SaveTemplateModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("이름 입력 후 저장 클릭 시 onSave가 name과 templateData를 담아 호출된다", () => {
    render(<SaveTemplateModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/템플릿 이름/), {
      target: { value: "주간 기본 커리큘럼" },
    });
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(defaultProps.onSave).toHaveBeenCalledWith({
      name: "주간 기본 커리큘럼",
      description: "",
      templateData: TEMPLATE_DATA,
    });
  });

  it("취소 클릭 시 onClose가 호출된다", () => {
    render(<SaveTemplateModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /취소/ }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("isSaving=true이면 버튼이 비활성화된다", () => {
    render(<SaveTemplateModal {...defaultProps} isSaving={true} />);
    expect(screen.getByRole("button", { name: /저장 중/ })).toBeDisabled();
  });

  it("'X개 수업이 저장됩니다' 안내가 표시된다", () => {
    render(<SaveTemplateModal {...defaultProps} />);
    expect(screen.getByText(/1개 수업이 저장됩니다/)).toBeInTheDocument();
  });
});
