import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// 완료 세션 dim(opacity 0.55) 회귀 가드 (7bbcf1e).
// 회귀 경위: dot 의 instanceDate(date-aware status)가 과거 *날짜* 세션도 "completed" 로
// 만들어 흐릿해졌고, 이를 "오늘만 흐릿"으로 고친 fix(7bbcf1e)가 미머지 브랜치에 갇혀 dev 에
// 누락 → 회귀. 본 spec 이 SessionBlock 의 isInstanceToday gate 를 잠근다.
//
// useSessionStatus 를 "completed" 고정 → isCompleted 는 isInstanceToday(=instanceDate==오늘) 에만 의존.
vi.mock("../../../hooks/useSessionStatus", () => ({
  useSessionStatus: () => "completed",
}));
vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => {} }),
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import SessionBlock from "../SessionBlock";

const subjects = [{ id: "sub-1", name: "수학", color: "#FF0000" }];
const enrollments = [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }];
const students = [{ id: "stu-1", name: "김철수" }];
const session = {
  id: "sess-dim-1",
  enrollmentIds: ["enr-1"],
  weekday: 0,
  startsAt: "09:00",
  endsAt: "10:00",
  weekStartDate: "",
  room: "A101",
};
const base = {
  session,
  subjects,
  enrollments,
  students,
  left: 0,
  width: 200,
  yOffset: 0,
  onClick: () => {},
};

function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

describe("SessionBlock — 완료 세션 dimming (7bbcf1e 회귀 가드)", () => {
  it("오늘 완료 수업(instanceDate=오늘)은 opacity 0.55 로 흐릿", () => {
    render(<SessionBlock {...base} instanceDate={todayStr()} />);
    expect(screen.getByRole("button")).toHaveStyle({ opacity: "0.55" });
  });

  it("과거 날짜 완료 수업(instanceDate=과거)은 흐릿하지 않음 (opacity 1)", () => {
    render(<SessionBlock {...base} instanceDate="2020-01-01" />);
    expect(screen.getByRole("button")).toHaveStyle({ opacity: "1" });
  });

  it("instanceDate 미제공(legacy weekday-only)은 오늘 가정 — 흐릿", () => {
    render(<SessionBlock {...base} />);
    expect(screen.getByRole("button")).toHaveStyle({ opacity: "0.55" });
  });
});
