/**
 * schedule-v2 role gate — member read-only 회귀 가드.
 *
 * 배경: schedule-v2 가 /schedule 의 member read-only role-branch 를 안 물려받아,
 * member 가 추가·삭제·copy-week 시도 → 서버 403(owner/admin 전용) → stranded 동기화
 * 에러 발생(2026-06-01 radar 확인). fix = canManage 로 write affordance 게이팅.
 *
 * canManage 의미(MemberContext): 익명/owner/admin → true, member → false.
 * 결정적 테스트(외부 network/timer 없음) — useMyRole/useIntegratedDataLocal + 자식 stub.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { getWeekStartDate } from "@/lib/weekStart";

const { mockUseMyRole, mockUseData } = vi.hoisted(() => ({
  mockUseMyRole: vi.fn(),
  mockUseData: vi.fn(),
}));

vi.mock("@/hooks/useMyRole", () => ({ useMyRole: mockUseMyRole }));
vi.mock("@/hooks/useIntegratedDataLocal", () => ({ useIntegratedDataLocal: mockUseData }));
vi.mock("@/components/atoms/AuthGuard", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("../_components/OperatingHoursMenu", () => ({ default: () => null }));
vi.mock("../_components/StudyRoomGrid", () => ({ default: () => <div data-testid="grid" /> }));
vi.mock("../_components/StudyRoomTable", () => ({ default: () => <div data-testid="table" /> }));
vi.mock("../_components/SessionFormModal", () => ({ default: () => null }));
vi.mock("../_components/StudentWeekEntryModal", () => ({ default: () => null }));
vi.mock("../_components/SessionPopover", () => ({ default: () => null }));

import ScheduleV2Page from "../page";

// viewedMonday 와 동일 주에 세션 1개 — isEmpty=false(그리드 렌더) + 비우기 버튼 enable 조건.
// page 와 test 가 같은 now 를 쓰므로 run 내 결정적 (flaky 아님).
const VIEWED = getWeekStartDate(new Date());

function fixtureData() {
  return {
    students: [{ id: "s1", name: "가나다" }],
    subjects: [{ id: "sub1", name: "수학", color: "#fbbf24" }],
    teachers: [{ id: "t1", name: "김쌤", color: "#fbbf24" }],
    enrollments: [{ id: "e1", studentId: "s1", subjectId: "sub1" }],
    sessions: [
      {
        id: "ses1",
        weekday: 0,
        startsAt: "14:45",
        endsAt: "16:00",
        weekStartDate: VIEWED,
        enrollmentIds: ["e1"],
        teacherId: "t1",
      },
    ],
  };
}

beforeEach(() => {
  mockUseData.mockReturnValue({
    data: fixtureData(),
    loading: false,
    updateData: vi.fn(),
    deleteSession: vi.fn(),
    bulkDeleteSessions: vi.fn(),
  });
});

describe("schedule-v2 role gate — member read-only", () => {
  it("member(canManage=false)는 쓰기 버튼(수업 추가·일괄 입력·비우기)이 렌더되지 않는다", () => {
    mockUseMyRole.mockReturnValue({ canManage: false, role: "member", adminCount: 1, linkedTeacherId: null });
    render(<ScheduleV2Page />);

    expect(screen.queryByText("＋ 수업 추가")).toBeNull();
    expect(screen.queryByText("학생별 일괄 입력")).toBeNull();
    expect(screen.queryByTestId("clear-week-btn")).toBeNull();
    // 읽기는 보장 — 그리드는 렌더된다.
    expect(screen.getByTestId("grid")).toBeTruthy();
  });

  it("owner/admin(canManage=true)는 쓰기 버튼이 보인다", () => {
    mockUseMyRole.mockReturnValue({ canManage: true, role: "owner", adminCount: 1, linkedTeacherId: null });
    render(<ScheduleV2Page />);

    expect(screen.getByText("＋ 수업 추가")).toBeTruthy();
    expect(screen.getByText("학생별 일괄 입력")).toBeTruthy();
    expect(screen.getByTestId("clear-week-btn")).toBeTruthy();
  });

  it("익명(canManage=true)도 쓰기 버튼이 보인다 — 로컬 편집 보존", () => {
    mockUseMyRole.mockReturnValue({ canManage: true, role: null, adminCount: 0, linkedTeacherId: null });
    render(<ScheduleV2Page />);

    expect(screen.getByText("＋ 수업 추가")).toBeTruthy();
  });
});
