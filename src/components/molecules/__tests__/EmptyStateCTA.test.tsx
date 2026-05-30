import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmptyStateCTA } from "../EmptyStateCTA";

describe("EmptyStateCTA", () => {
  it("renders title + description + icon", () => {
    render(
      <EmptyStateCTA
        icon={<svg data-testid="empty-icon" />}
        title="아직 등록된 학생이 없어요"
        description={"학생을 추가하면\n시간표에 배치할 수 있어요"}
      />,
    );
    expect(screen.getByText("아직 등록된 학생이 없어요")).toBeInTheDocument();
    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    // \n is preserved via whitespace-pre-line — both 줄 모두 한 노드에
    const desc = screen.getByText(/학생을 추가하면/);
    expect(desc.textContent).toContain("시간표에 배치할 수 있어요");
  });

  it("invokes primaryAction onClick", () => {
    const onClick = vi.fn();
    render(
      <EmptyStateCTA
        icon={<svg />}
        title="t"
        description="d"
        primaryAction={{ label: "첫 학생 추가", onClick }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "첫 학생 추가" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders both primary and secondary actions", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    render(
      <EmptyStateCTA
        icon={<svg />}
        title="t"
        description="d"
        primaryAction={{ label: "추가", onClick: onPrimary }}
        secondaryAction={{ label: "취소", onClick: onSecondary }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "추가" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("primary action disabled state prevents onClick", () => {
    const onClick = vi.fn();
    render(
      <EmptyStateCTA
        icon={<svg />}
        title="t"
        description="d"
        primaryAction={{ label: "비활성", onClick, disabled: true }}
      />,
    );
    const btn = screen.getByRole("button", { name: "비활성" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders footer when provided", () => {
    render(
      <EmptyStateCTA
        icon={<svg />}
        title="t"
        description="d"
        footer={<a href="/next" data-testid="cascade-link">다음: 시간표 →</a>}
      />,
    );
    expect(screen.getByTestId("cascade-link")).toBeInTheDocument();
  });

  it("renders without actions (display-only mode)", () => {
    const { container } = render(
      <EmptyStateCTA icon={<svg />} title="끝" description="더 없음" />,
    );
    expect(container.querySelectorAll("button").length).toBe(0);
  });

  it("ariaLabel propagates to primary button", () => {
    render(
      <EmptyStateCTA
        icon={<svg />}
        title="t"
        description="d"
        primaryAction={{
          label: "추가",
          onClick: () => {},
          ariaLabel: "새 학생 추가 모달 열기",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "새 학생 추가 모달 열기" }),
    ).toBeInTheDocument();
  });

  it("uses data-testid prop for root element", () => {
    render(
      <EmptyStateCTA
        icon={<svg />}
        title="t"
        description="d"
        data-testid="custom-empty"
      />,
    );
    expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
  });

  it("default data-testid is empty-state-cta", () => {
    render(<EmptyStateCTA icon={<svg />} title="t" description="d" />);
    expect(screen.getByTestId("empty-state-cta")).toBeInTheDocument();
  });
});
