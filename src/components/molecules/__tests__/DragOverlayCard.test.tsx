import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DragOverlayCard from "../DragOverlayCard";
import type { Session, Subject } from "@/lib/planner";

describe("DragOverlayCard", () => {
  const session: Session = {
    id: "s1",
    subjectId: "sub-1",
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    weekStartDate: "",
    yPosition: 1,
  };
  const subjects: Subject[] = [{ id: "sub-1", name: "수학", color: "#3B82F6" }];

  it("과목명을 렌더한다", () => {
    render(<DragOverlayCard session={session} subjects={subjects} />);
    expect(screen.getByText("수학")).toBeInTheDocument();
  });

  it("시간을 렌더한다", () => {
    render(<DragOverlayCard session={session} subjects={subjects} />);
    expect(screen.getByText("09:00-10:00")).toBeInTheDocument();
  });

  it("과목 색상을 CSS 변수로 설정한다 (Tailwind bg-[var(--overlay-card-color)])", () => {
    render(<DragOverlayCard session={session} subjects={subjects} />);
    // Multi-stack 효과 도입(2026-05-04)으로 wrapper가 outer가 됐으므로
    // background 적용 element들 중 하나에서 검증.
    const wrapper = screen.getByTestId("drag-overlay-card");
    const cards = wrapper.querySelectorAll<HTMLElement>(
      "[style*='--overlay-card-color']",
    );
    expect(cards.length).toBeGreaterThanOrEqual(1);
    const colorVar = cards[0].style.getPropertyValue("--overlay-card-color");
    expect(colorVar).toContain("3B82F6");
  });

  it("isCopy=true — 복사 라벨 + data-copy 속성", () => {
    render(<DragOverlayCard session={session} subjects={subjects} isCopy />);
    expect(screen.getByLabelText("복사 모드")).toBeInTheDocument();
    expect(screen.getByText("복사")).toBeInTheDocument();
    expect(screen.getByTestId("drag-overlay-card").dataset.copy).toBe("true");
  });

  it("selectionCount > 1 — stack 카운트 배지", () => {
    render(
      <DragOverlayCard
        session={session}
        subjects={subjects}
        selectionCount={3}
      />,
    );
    expect(screen.getByLabelText("3개 함께 이동")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("selectionCount=1 — stack 배지 미렌더", () => {
    render(
      <DragOverlayCard
        session={session}
        subjects={subjects}
        selectionCount={1}
      />,
    );
    expect(screen.queryByLabelText(/함께 이동/)).toBeNull();
  });
});
