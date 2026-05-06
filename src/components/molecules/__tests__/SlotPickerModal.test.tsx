import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SlotPickerModal } from "../SlotPickerModal";
import { FIXTURE_TEMPLATE } from "@/__tests__/fixtures/template.fixture";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";

const tplWithSlot = (slotIndex: number, name: string): ScheduleTemplate => ({
  ...FIXTURE_TEMPLATE,
  id: `tpl-${slotIndex}`,
  slotIndex,
  name,
});

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onSelect: vi.fn(),
  templates: [] as ScheduleTemplate[],
  mode: "save" as const,
};

describe("SlotPickerModal", () => {
  it("open=false 면 렌더 안 함", () => {
    const { container } = render(<SlotPickerModal {...baseProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("save mode 헤딩 + 슬롯 1, 2 + Coming soon 3개 표시", () => {
    render(<SlotPickerModal {...baseProps} />);
    expect(screen.getByText("어느 슬롯에 저장할까요?")).toBeInTheDocument();
    expect(screen.getByText("슬롯 1")).toBeInTheDocument();
    expect(screen.getByText("슬롯 2")).toBeInTheDocument();
    expect(screen.getByText("슬롯 3")).toBeInTheDocument();
    expect(screen.getByText("슬롯 4")).toBeInTheDocument();
    expect(screen.getByText("슬롯 5")).toBeInTheDocument();
    // Coming soon 라벨
    expect(screen.getAllByText("추후 업데이트 예정").length).toBe(3);
  });

  it("apply mode 헤딩 표시", () => {
    render(<SlotPickerModal {...baseProps} mode="apply" templates={[tplWithSlot(0, "학기중")]} />);
    expect(screen.getByText("어느 슬롯을 적용할까요?")).toBeInTheDocument();
  });

  it("save: 슬롯 1 채워있으면 그 name 표시 + 슬롯 2 는 (비어있음)", () => {
    render(<SlotPickerModal {...baseProps} templates={[tplWithSlot(0, "학기중")]} />);
    expect(screen.getByText("학기중")).toBeInTheDocument();
    expect(screen.getByText("(비어있음)")).toBeInTheDocument();
  });

  it("apply mode: 빈 슬롯 disabled, 채워진 슬롯만 활성", () => {
    render(<SlotPickerModal {...baseProps} mode="apply" templates={[tplWithSlot(0, "학기중")]} />);
    const slot1 = screen.getByText("슬롯 1").closest("button");
    const slot2 = screen.getByText("슬롯 2").closest("button");
    expect(slot1).not.toBeDisabled();
    expect(slot2).toBeDisabled();
  });

  it("Coming soon 슬롯 (3, 4, 5) 모두 disabled", () => {
    render(<SlotPickerModal {...baseProps} />);
    const slot3 = screen.getByText("슬롯 3").closest("button");
    const slot4 = screen.getByText("슬롯 4").closest("button");
    const slot5 = screen.getByText("슬롯 5").closest("button");
    expect(slot3).toBeDisabled();
    expect(slot4).toBeDisabled();
    expect(slot5).toBeDisabled();
  });

  it("save: 빈 슬롯 → default 선택은 first-empty (슬롯 1)", () => {
    const onSelect = vi.fn();
    render(<SlotPickerModal {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("저장"));
    // first-empty = slotIndex 0 (슬롯 1)
    expect(onSelect).toHaveBeenCalledWith(0, undefined);
  });

  it("save: 슬롯 1 채워있으면 default 는 slot 1 (slotIndex=1, 빈 슬롯)", () => {
    const onSelect = vi.fn();
    render(
      <SlotPickerModal
        {...baseProps}
        onSelect={onSelect}
        templates={[tplWithSlot(0, "학기중")]}
      />,
    );
    fireEvent.click(screen.getByText("저장"));
    expect(onSelect).toHaveBeenCalledWith(1, undefined);
  });

  it("save + 사용자가 name 입력 → onSelect(slotIndex, name)", () => {
    const onSelect = vi.fn();
    render(<SlotPickerModal {...baseProps} onSelect={onSelect} />);
    const input = screen.getByLabelText("슬롯 이름 (선택)");
    fireEvent.change(input, { target: { value: "방학" } });
    fireEvent.click(screen.getByText("저장"));
    expect(onSelect).toHaveBeenCalledWith(0, "방학");
  });

  it("save: 사용자가 name 공백만 입력 시 undefined 로 호출 (호출 측 default 적용)", () => {
    const onSelect = vi.fn();
    render(<SlotPickerModal {...baseProps} onSelect={onSelect} />);
    const input = screen.getByLabelText("슬롯 이름 (선택)");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByText("저장"));
    expect(onSelect).toHaveBeenCalledWith(0, undefined);
  });

  it("apply mode: name 입력 필드 미표시", () => {
    render(<SlotPickerModal {...baseProps} mode="apply" templates={[tplWithSlot(0, "학기중")]} />);
    expect(screen.queryByLabelText("슬롯 이름 (선택)")).not.toBeInTheDocument();
  });

  it("취소 버튼 → onClose 호출", () => {
    const onClose = vi.fn();
    render(<SlotPickerModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("취소"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("배경 (overlay) 클릭 → onClose 호출", () => {
    const onClose = vi.fn();
    render(<SlotPickerModal {...baseProps} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("isSubmitting=true 시 confirm 버튼 비활성 + 텍스트 변경", () => {
    render(<SlotPickerModal {...baseProps} isSubmitting />);
    const button = screen.getByText("저장 중...");
    expect(button).toBeDisabled();
  });

  it("apply mode + 슬롯 0 만 채워있을 때 default 는 slot 0", () => {
    const onSelect = vi.fn();
    render(
      <SlotPickerModal
        {...baseProps}
        mode="apply"
        onSelect={onSelect}
        templates={[tplWithSlot(0, "학기중")]}
      />,
    );
    fireEvent.click(screen.getByText("적용"));
    expect(onSelect).toHaveBeenCalledWith(0, undefined);
  });
});
