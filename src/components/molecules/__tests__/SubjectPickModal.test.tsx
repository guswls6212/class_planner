import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SubjectPickModal } from "../SubjectPickModal";

const ENGLISH = { id: "sub-eng", name: "영어", color: "#fbbf24" };
const MATH = { id: "sub-math", name: "수학", color: "#60a5fa" };
const KOREAN = { id: "sub-kor", name: "국어", color: "#a78bfa" };

const baseProps = {
  open: true,
  subjects: [ENGLISH, MATH, KOREAN],
  initialSelectedIds: [ENGLISH.id],
  onSave: vi.fn().mockResolvedValue(undefined),
  onClose: vi.fn(),
};

beforeEach(() => {
  baseProps.onSave = vi.fn().mockResolvedValue(undefined);
  baseProps.onClose = vi.fn();
});

describe("SubjectPickModal", () => {
  it("open=false 시 렌더 안 함", () => {
    const { container } = render(<SubjectPickModal {...baseProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("open=true 시 모달 + 과목 list render", () => {
    render(<SubjectPickModal {...baseProps} />);
    expect(screen.getByTestId("subject-pick-modal")).toBeInTheDocument();
    expect(screen.getByText("영어")).toBeInTheDocument();
    expect(screen.getByText("수학")).toBeInTheDocument();
    expect(screen.getByText("국어")).toBeInTheDocument();
  });

  it("initialSelectedIds 가 aria-pressed=true 로 반영", () => {
    render(<SubjectPickModal {...baseProps} />);
    expect(screen.getByTestId(`subject-pick-${ENGLISH.id}`).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId(`subject-pick-${MATH.id}`).getAttribute("aria-pressed")).toBe("false");
  });

  it("과목 click 시 toggle (선택 X → O)", () => {
    render(<SubjectPickModal {...baseProps} />);
    const mathBtn = screen.getByTestId(`subject-pick-${MATH.id}`);
    expect(mathBtn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(mathBtn);
    expect(mathBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("과목 click 시 toggle (선택 O → X)", () => {
    render(<SubjectPickModal {...baseProps} />);
    const engBtn = screen.getByTestId(`subject-pick-${ENGLISH.id}`);
    expect(engBtn.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(engBtn);
    expect(engBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("저장 button click 시 onSave + onClose 호출", async () => {
    render(<SubjectPickModal {...baseProps} />);
    fireEvent.click(screen.getByTestId(`subject-pick-${MATH.id}`));
    fireEvent.click(screen.getByTestId("subject-pick-save"));
    await waitFor(() => {
      expect(baseProps.onSave).toHaveBeenCalledWith([ENGLISH.id, MATH.id]);
    });
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("취소 button click 시 onClose 만 호출", () => {
    render(<SubjectPickModal {...baseProps} />);
    fireEvent.click(screen.getByTestId("subject-pick-cancel"));
    expect(baseProps.onClose).toHaveBeenCalled();
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it("배경 (overlay) click 시 onClose 호출", () => {
    render(<SubjectPickModal {...baseProps} />);
    fireEvent.click(screen.getByTestId("subject-pick-modal"));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("ESC 키 → onClose 호출", () => {
    render(<SubjectPickModal {...baseProps} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("subjects=[] 시 '아직 등록된 과목이 없어요' 표시", () => {
    render(<SubjectPickModal {...baseProps} subjects={[]} />);
    expect(screen.getByText(/아직 등록된 과목이 없어요/)).toBeInTheDocument();
  });

  it("ARIA: dialog + modal + labelledby", () => {
    render(<SubjectPickModal {...baseProps} />);
    const dialog = screen.getByTestId("subject-pick-modal");
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("subject-pick-modal-title");
  });
});
