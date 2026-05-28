/**
 * SessionBlock attendanceDot: 시간표 cell 의 우하단 출결 상태 dot 시각 결정 — pure.
 *
 * mockup: internal-dashboard/src/app/design-explorations/class-planner/edit-session-with-attendance
 *   (Layer 2 D — 우하단 작은 dot + 시간 기반 색 변화)
 *
 * 결정 규칙 (사용자 명시, 2026-05-28):
 *   - 수업 전 (upcoming): dot 안 보임
 *   - 진행 중 (in-progress): 부분/미체크 OK (alert X) — 전원 체크 시만 emerald/amber
 *   - 종료 후 (completed):
 *     · 전원 출석 (결석/지각 X): emerald
 *     · 전원 체크 + 결석/지각 포함: amber
 *     · 부분 체크 또는 전부 미체크: red + pulse (알림)
 *
 * 강제 막기는 비추천 — 학원 운영자가 저녁/주말 일괄 입력 패턴 자연. dot 은 hint only.
 */

import type { SessionStatus } from "../../hooks/useSessionStatus";

/** 출결 status — server enum 과 일치 (AttendanceSheet 와 동일 타입계). */
export type AttendanceStatusValue = "present" | "absent" | "late" | "excused";

/** 학생 1명의 출결 entry (notes 포함). status 없으면 미체크. */
export interface AttendanceEntryShape {
  status: string;
}

/** 본 helper 가 받는 attendance map — sessionId 기준 (caller 가 sessionId 로 lookup 후 전달). */
export type AttendanceMap = Record<string, AttendanceEntryShape>;

export interface AttendanceDotState {
  /** Tailwind bg 색 class. */
  color: "bg-emerald-400" | "bg-amber-400" | "bg-red-400";
  /** true 시 pulse animation. */
  pulse: boolean;
  /** title attribute (hover tooltip). */
  title: string;
}

/**
 * SessionBlock 의 attendanceDot 시각 state 계산.
 *
 * @param sessionStatus useSessionStatus 결과 (upcoming/in-progress/completed)
 * @param attendanceMap 본 세션의 출결 map (key = studentId)
 * @param studentIds 본 세션의 student id 목록 (enrollment 으로부터 추출)
 * @returns dot state | null (null 이면 dot 렌더 X)
 */
export function computeAttendanceDot(
  sessionStatus: SessionStatus,
  attendanceMap: AttendanceMap,
  studentIds: readonly string[]
): AttendanceDotState | null {
  // 수업 전 — dot 안 보임 (사용자 spec)
  if (sessionStatus === "upcoming") return null;

  // 학생 0명 — dot 의미 없음
  if (studentIds.length === 0) return null;

  const checkedStudents = studentIds.filter((id) => {
    const entry = attendanceMap[id];
    return entry && entry.status && entry.status !== "none";
  });
  const hasAbsentOrLate = checkedStudents.some((id) => {
    const s = attendanceMap[id]?.status;
    return s === "absent" || s === "late";
  });

  const allChecked = checkedStudents.length === studentIds.length;

  if (allChecked) {
    return hasAbsentOrLate
      ? {
          color: "bg-amber-400",
          pulse: false,
          title: "전원 체크 (결석/지각 포함)",
        }
      : {
          color: "bg-emerald-400",
          pulse: false,
          title: "전원 출석 완료",
        };
  }

  // 부분 체크 또는 전부 미체크
  if (sessionStatus === "in-progress") {
    // 진행 중 — 부분 체크 OK (alert X). 미체크여도 자연.
    return null;
  }

  // 종료 후 — 미체크 / 부분 = 알림 (red + pulse)
  return {
    color: "bg-red-400",
    pulse: true,
    title:
      checkedStudents.length === 0
        ? "출결 체크 누락 (수업 종료)"
        : `출결 부분 체크 — ${studentIds.length - checkedStudents.length}명 미체크`,
  };
}
