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
    const { container } = render(<DragOverlayCard session={session} subjects={subjects} />);
    const card = container.firstChild as HTMLElement;
    // 색상은 CSS custom property로 전달 (인라인 background 스타일 위반 방지)
    const colorVar = card.style.getPropertyValue("--overlay-card-color");
    expect(colorVar).toContain("3B82F6");
  });
});
