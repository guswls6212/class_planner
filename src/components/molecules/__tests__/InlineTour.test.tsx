import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineTour } from "../InlineTour";
import { showSuccess } from "@/lib/toast";

const mockNext = vi.fn();
const mockPrev = vi.fn();
const mockSkip = vi.fn();
const mockComplete = vi.fn();
const mockStart = vi.fn();

interface MockTourState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: {
    id: string;
    targetSelector: string;
    title: string;
    description: string;
    placement?: "top" | "bottom" | "left" | "right" | "auto";
  } | null;
  targetRect: DOMRect | null;
  isWaitingForTarget: boolean;
  next: typeof mockNext;
  prev: typeof mockPrev;
  skip: typeof mockSkip;
  complete: typeof mockComplete;
  start: typeof mockStart;
}

let mockTourState: MockTourState;

vi.mock("@/hooks/useTour", () => ({
  useTour: () => mockTourState,
}));

vi.mock("@/lib/toast", () => ({
  showSuccess: vi.fn(),
}));

const FIRST_STEP = {
  id: "students",
  targetSelector: '[data-tour="students"]',
  title: "여기서 학생을 관리해요",
  description: "학생 추가 / 검색 / 학년별 분류.",
  placement: "right" as const,
};

const LAST_STEP = {
  id: "export",
  targetSelector: '[data-tour="export"]',
  title: "인쇄 + 학생 공유",
  description: "PDF 1장 인쇄 + share-link.",
  placement: "auto" as const,
};

function makeRect(x = 100, y = 100, w = 50, h = 30): DOMRect {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  } as DOMRect;
}

beforeEach(() => {
  mockNext.mockReset();
  mockPrev.mockReset();
  mockSkip.mockReset();
  mockComplete.mockReset();
  mockStart.mockReset();
  mockTourState = {
    isActive: true,
    currentStep: 0,
    totalSteps: 6,
    step: FIRST_STEP,
    targetRect: makeRect(),
    isWaitingForTarget: false,
    next: mockNext,
    prev: mockPrev,
    skip: mockSkip,
    complete: mockComplete,
    start: mockStart,
  };
});

describe("InlineTour", () => {
  it("renders nothing when isActive is false", () => {
    mockTourState.isActive = false;
    const { container } = render(<InlineTour />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when step is null", () => {
    mockTourState.step = null;
    const { container } = render(<InlineTour />);
    expect(container.firstChild).toBeNull();
  });

  it("renders dim waiting state when targetRect is null", () => {
    mockTourState.targetRect = null;
    render(<InlineTour />);
    expect(screen.getByTestId("inline-tour-dim-waiting")).toBeInTheDocument();
    expect(screen.getByText(/튜토리얼 준비 중/)).toBeInTheDocument();
  });

  it("renders spotlight + tooltip when active with targetRect", () => {
    render(<InlineTour />);
    expect(screen.getByTestId("inline-tour-spotlight")).toBeInTheDocument();
    expect(screen.getByTestId("inline-tour-tooltip")).toBeInTheDocument();
    expect(screen.getByText(FIRST_STEP.title)).toBeInTheDocument();
    expect(screen.getByText(FIRST_STEP.description)).toBeInTheDocument();
  });

  it("renders 4 dim rectangles around spotlight", () => {
    render(<InlineTour />);
    expect(screen.getByTestId("inline-tour-dim-top")).toBeInTheDocument();
    expect(screen.getByTestId("inline-tour-dim-bottom")).toBeInTheDocument();
    expect(screen.getByTestId("inline-tour-dim-left")).toBeInTheDocument();
    expect(screen.getByTestId("inline-tour-dim-right")).toBeInTheDocument();
  });

  it("calls next() on 다음 button click", () => {
    render(<InlineTour />);
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it("calls skip() on 건너뛰기 button click", () => {
    render(<InlineTour />);
    fireEvent.click(screen.getByRole("button", { name: /건너뛰기/ }));
    expect(mockSkip).toHaveBeenCalled();
  });

  it("calls skip() on ESC key", () => {
    render(<InlineTour />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockSkip).toHaveBeenCalled();
  });

  it("calls skip() on dim overlay click (top)", () => {
    render(<InlineTour />);
    fireEvent.click(screen.getByTestId("inline-tour-dim-top"));
    expect(mockSkip).toHaveBeenCalled();
  });

  it("calls skip() on X close button click", () => {
    render(<InlineTour />);
    fireEvent.click(screen.getByRole("button", { name: /튜토리얼 닫기/ }));
    expect(mockSkip).toHaveBeenCalled();
  });

  it("does NOT render 이전 button on first step", () => {
    render(<InlineTour />);
    expect(screen.queryByRole("button", { name: /이전/ })).toBeNull();
  });

  it("renders 이전 button when currentStep > 0 and calls prev()", () => {
    mockTourState.currentStep = 1;
    render(<InlineTour />);
    const prevBtn = screen.getByRole("button", { name: /이전/ });
    fireEvent.click(prevBtn);
    expect(mockPrev).toHaveBeenCalledOnce();
  });

  it("renders 완료 button on last step and triggers complete + toast", () => {
    mockTourState.currentStep = mockTourState.totalSteps - 1;
    mockTourState.step = LAST_STEP;
    render(<InlineTour />);
    expect(screen.getByRole("button", { name: /완료/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^다음$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /건너뛰기/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /완료/ }));
    expect(mockComplete).toHaveBeenCalledOnce();
    expect(vi.mocked(showSuccess)).toHaveBeenCalledWith("튜토리얼 완료 ✓");
  });

  it("ARIA: tooltip has role dialog + aria-modal + labelledby + describedby", () => {
    render(<InlineTour />);
    const tooltip = screen.getByTestId("inline-tour-tooltip");
    expect(tooltip.getAttribute("role")).toBe("dialog");
    expect(tooltip.getAttribute("aria-modal")).toBe("true");
    expect(tooltip.getAttribute("aria-labelledby")).toBe(
      "inline-tour-tooltip-title",
    );
    expect(tooltip.getAttribute("aria-describedby")).toBe(
      "inline-tour-tooltip-desc",
    );
  });

  it("progress bar + step indicator shows N/Total format", () => {
    mockTourState.currentStep = 2;
    render(<InlineTour />);
    expect(screen.getByTestId("inline-tour-progress")).toHaveTextContent("3/6");
  });

  it("data-placement attribute reflects resolved placement", () => {
    render(<InlineTour />);
    const tooltip = screen.getByTestId("inline-tour-tooltip");
    // FIRST_STEP.placement = "right" → 그대로 사용 (auto 아님)
    expect(tooltip.getAttribute("data-placement")).toBe("right");
  });
});
