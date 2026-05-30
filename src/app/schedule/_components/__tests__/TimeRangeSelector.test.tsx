import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeRangeSelector from "../TimeRangeSelector";
import type { TimeRange } from "../../../../hooks/useTimeRange";

const replaceMock = vi.fn();

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation",
  );
  return {
    ...actual,
    useRouter: () => ({
      replace: replaceMock,
      push: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => "/schedule",
    useSearchParams: () => new URLSearchParams(),
  };
});

const DEFAULT_RANGE: TimeRange = {
  startHour: 9,
  endHour: 23,
  mode: "default",
};

describe("TimeRangeSelector", () => {
  it("현재 범위 라벨 표시", () => {
    render(<TimeRangeSelector current={DEFAULT_RANGE} userId={null} />);
    expect(screen.getByText("9-23시")).toBeInTheDocument();
  });

  it("auto 모드는 '자동' 표기 추가", () => {
    render(
      <TimeRangeSelector
        current={{ startHour: 8, endHour: 18, mode: "auto" }}
        userId={null}
      />,
    );
    expect(screen.getByText("8-18시 · 자동")).toBeInTheDocument();
  });

  it("클릭 시 메뉴 열림", () => {
    render(<TimeRangeSelector current={DEFAULT_RANGE} userId={null} />);
    fireEvent.click(screen.getByTestId("time-range-selector"));
    expect(screen.getByText("기본 (9 - 23시)")).toBeInTheDocument();
    expect(screen.getByText("자동 (데이터 기반)")).toBeInTheDocument();
    expect(screen.getByText("오전반 (7 - 13시)")).toBeInTheDocument();
  });

  it("프리셋 선택 시 router.replace 호출 + storage 저장", () => {
    replaceMock.mockClear();
    render(<TimeRangeSelector current={DEFAULT_RANGE} userId="user-1" />);
    fireEvent.click(screen.getByTestId("time-range-selector"));
    fireEvent.click(screen.getByText("자동 (데이터 기반)"));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock.mock.calls[0][0]).toContain("range=auto");
  });

  it("현재 모드와 같은 프리셋은 활성 스타일", () => {
    render(<TimeRangeSelector current={DEFAULT_RANGE} userId={null} />);
    fireEvent.click(screen.getByTestId("time-range-selector"));
    const item = screen.getByText("기본 (9 - 23시)");
    expect(item.className).toContain("text-[var(--color-accent)]");
  });
});
