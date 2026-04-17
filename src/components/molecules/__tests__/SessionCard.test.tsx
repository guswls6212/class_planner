import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionCard } from "../SessionCard";
import type { Subject } from "@/lib/planner";

const blueSubject: Subject = { id: "s1", name: "피아노", color: "blue" } as any;
const hexSubject: Subject = { id: "s2", name: "드럼", color: "#EF4444" } as any;

describe("SessionCard — block variant", () => {
  it("과목명을 렌더한다", () => {
    render(<SessionCard variant="block" subject={blueSubject} />);
    expect(screen.getByText("피아노")).toBeDefined();
  });

  it("학생 이름을 `, `로 join하여 렌더한다", () => {
    render(
      <SessionCard
        variant="block"
        subject={blueSubject}
        studentNames={["김지우", "이서연"]}
      />,
    );
    expect(screen.getByText("김지우, 이서연")).toBeDefined();
  });

  it("subject가 null이면 '과목 없음'을 표시한다", () => {
    render(<SessionCard variant="block" subject={null} />);
    expect(screen.getByText("과목 없음")).toBeDefined();
  });

  it("named tone이면 CSS var 기반 backgroundColor가 적용된다", () => {
    render(
      <SessionCard variant="block" subject={blueSubject} data-testid="card" />,
    );
    const el = screen.getByTestId("card");
    expect(el.style.backgroundColor).toBe("var(--color-subject-blue-bg)");
  });

  it("hex color면 tintFromHex로 파스텔 배경이 적용된다", () => {
    render(
      <SessionCard variant="block" subject={hexSubject} data-testid="card" />,
    );
    const el = screen.getByTestId("card");
    expect(el.style.backgroundColor.toLowerCase()).toBe("rgb(252, 218, 218)");
  });

  it("onClick 핸들러가 클릭 시 호출된다", () => {
    const onClick = vi.fn();
    render(
      <SessionCard
        variant="block"
        subject={blueSubject}
        onClick={onClick}
        data-testid="card"
      />,
    );
    fireEvent.click(screen.getByTestId("card"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("caller가 주입한 style(gridRow/gridColumn)을 병합한다", () => {
    render(
      <SessionCard
        variant="block"
        subject={blueSubject}
        style={{ gridRow: "3 / span 4", gridColumn: "2" }}
        data-testid="card"
      />,
    );
    const el = screen.getByTestId("card") as HTMLElement;
    expect(el.style.gridRow).toBe("3 / span 4");
    expect(el.style.gridColumn).toBe("2");
  });

  it("state='ongoing'이면 data-state 속성이 붙는다", () => {
    render(
      <SessionCard
        variant="block"
        subject={blueSubject}
        state="ongoing"
        data-testid="card"
      />,
    );
    expect(screen.getByTestId("card").getAttribute("data-state")).toBe(
      "ongoing",
    );
  });

  it("state='done'이면 opacity 0.55가 적용된다", () => {
    render(
      <SessionCard
        variant="block"
        subject={blueSubject}
        state="done"
        data-testid="card"
      />,
    );
    const el = screen.getByTestId("card") as HTMLElement;
    expect(el.style.opacity).toBe("0.55");
  });

  it("state='conflict'이면 data-state='conflict' + aria-label에 '충돌'이 포함된다", () => {
    render(
      <SessionCard
        variant="block"
        subject={blueSubject}
        state="conflict"
        data-testid="card"
      />,
    );
    const el = screen.getByTestId("card");
    expect(el.getAttribute("data-state")).toBe("conflict");
    expect(el.getAttribute("aria-label")).toContain("충돌");
  });
});
