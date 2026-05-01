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

  it("과목 색상을 배경으로 사용한다", () => {
    const { container } = render(<DragOverlayCard session={session} subjects={subjects} />);
    const card = container.firstChild as HTMLElement;
    // jsdom normalizes hex to rgb — accept both forms
    const bg = card.style.background;
    const hasHex = bg.toUpperCase().includes("3B82F6");
    const hasRgb = bg.includes("59, 130, 246") || bg.includes("59,130,246");
    expect(hasHex || hasRgb).toBe(true);
  });
});
