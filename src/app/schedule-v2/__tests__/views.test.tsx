/**
 * schedule-v2 실데이터 뷰모델 + 뷰 컴포넌트 테스트.
 * 순수 함수(변환/레인패킹/축/주선택)는 결정적 — flaky 요소 없음.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Session } from "@/lib/planner";
import StudyRoomGrid from "../_components/StudyRoomGrid";
import StudyRoomTable from "../_components/StudyRoomTable";
import {
  axisOf,
  buildScheduleVM,
  localWeekMonday,
  packDay,
  pickWeek,
  type RealData,
} from "../_data/scheduleViewModel";

const WEEK = "2026-06-01";

function makeFixture(): { data: RealData; weekSessions: Session[] } {
  const data: RealData = {
    students: [
      { id: "s1", name: "가나다" },
      { id: "s2", name: "라마바" },
    ],
    subjects: [{ id: "sub1", name: "수학", color: "#fbbf24" }],
    teachers: [{ id: "t1", name: "김쌤", color: "#fbbf24" }],
    enrollments: [
      { id: "e1", studentId: "s1", subjectId: "sub1" },
      { id: "e2", studentId: "s2", subjectId: "sub1" },
    ],
    sessions: [],
  };
  const weekSessions: Session[] = [
    { id: "ses1", weekday: 0, startsAt: "14:45", endsAt: "16:00", weekStartDate: WEEK, enrollmentIds: ["e1"], teacherId: "t1" },
    { id: "ses2", weekday: 0, startsAt: "15:00", endsAt: "16:30", weekStartDate: WEEK, enrollmentIds: ["e2"], teacherId: "t1" },
  ];
  data.sessions = weekSessions;
  return { data, weekSessions };
}

describe("buildScheduleVM (실데이터 변환)", () => {
  it("세션을 per-enrollment 블록으로 펼치고 학생별 표를 만든다", () => {
    const { data, weekSessions } = makeFixture();
    const vm = buildScheduleVM(data, weekSessions);
    expect(vm.blocks.length).toBe(2);
    expect(vm.blocks.map((b) => b.studentName).sort()).toEqual(["가나다", "라마바"]);
    expect(vm.students.length).toBe(2);
    expect(vm.teachers).toContain("김쌤");
    const g = vm.students.find((s) => s.name === "가나다");
    expect(g?.rows[0].times[0]).toBe("14:45-16:00"); // 월(0) 수학
  });
});

describe("packDay / axisOf", () => {
  it("겹치는 블록은 다른 레인에 배치된다", () => {
    const { data, weekSessions } = makeFixture();
    const vm = buildScheduleVM(data, weekSessions);
    const { items, lanes } = packDay(vm.blocks);
    expect(lanes).toBe(2); // 14:45–16:00 와 15:00–16:30 겹침
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[i].lane === items[j].lane) {
          expect(items[i].end <= items[j].start || items[j].end <= items[i].start).toBe(true);
        }
      }
    }
  });

  it("axisOf 가 정시로 라운딩된 유효 범위를 준다", () => {
    const { data, weekSessions } = makeFixture();
    const vm = buildScheduleVM(data, weekSessions);
    const a = axisOf(vm.blocks);
    expect(a.start % 60).toBe(0);
    expect(a.end % 60).toBe(0);
    expect(a.end).toBeGreaterThan(a.start);
  });
});

describe("pickWeek / localWeekMonday", () => {
  it("현재 주가 있으면 현재 주를 고른다", () => {
    const sessions = [{ weekStartDate: "2026-05-25" }, { weekStartDate: "2026-06-01" }] as unknown as Session[];
    expect(pickWeek(sessions, "2026-06-01")).toBe("2026-06-01");
  });
  it("현재 주가 없으면 가장 최근 주를 고른다", () => {
    const sessions = [{ weekStartDate: "2026-05-18" }, { weekStartDate: "2026-05-25" }] as unknown as Session[];
    expect(pickWeek(sessions, "2026-06-01")).toBe("2026-05-25");
  });
  it("localWeekMonday: 월요일 입력은 자기 자신, 수요일은 그 주 월요일", () => {
    expect(localWeekMonday(new Date(2024, 0, 1))).toBe("2024-01-01"); // 월
    expect(localWeekMonday(new Date(2024, 0, 3))).toBe("2024-01-01"); // 수 → 월
  });
});

describe("뷰 컴포넌트 렌더", () => {
  it("그리드가 요일·블록을 렌더한다", () => {
    const { data, weekSessions } = makeFixture();
    const vm = buildScheduleVM(data, weekSessions);
    render(<StudyRoomGrid blocks={vm.blocks} />);
    expect(screen.getByText("월")).toBeTruthy();
    expect(screen.getAllByText(/가나다/).length).toBeGreaterThan(0);
  });
  it("학생별 표가 학생을 렌더한다", () => {
    const { data, weekSessions } = makeFixture();
    const vm = buildScheduleVM(data, weekSessions);
    render(<StudyRoomTable students={vm.students} />);
    expect(screen.getByText("가나다")).toBeTruthy();
    expect(screen.getByText("라마바")).toBeTruthy();
  });
});
