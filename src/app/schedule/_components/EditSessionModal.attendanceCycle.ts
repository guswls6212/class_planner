/**
 * EditSessionModal Layer 1 B — 학생별 단일 cycle pill 패턴 pure helper.
 *
 * mockup: internal-dashboard /design-explorations/class-planner/edit-session-with-attendance
 *   (Layer 1 Variant B — click 마다 status cycle: present → absent → late → none)
 *
 * cycle 순서 (사용자 명시 mockup):
 *   none → present → absent → late → none → ...
 *
 * 학원 운영 시나리오 mental model:
 *   - 미체크 상태 → click 1 → "출석" 가장 흔한 case (default 다음 step)
 *   - 결석/지각은 추가 click
 *   - excused (사유) 는 cycle 외 — 별도 UI (long-press 메뉴 또는 우클릭). 현재 cycle 에선 제외.
 */

export type AttendanceCycleStatus = "none" | "present" | "absent" | "late";

/** UI 라벨 (사용자 한국어). */
export const ATTENDANCE_CYCLE_LABEL: Record<AttendanceCycleStatus, string> = {
  none: "미체크",
  present: "출석",
  absent: "결석",
  late: "지각",
};

/** Tailwind bg 색 class — cycle pill 시각 통일. */
export const ATTENDANCE_CYCLE_BG: Record<AttendanceCycleStatus, string> = {
  none: "bg-slate-700",
  present: "bg-emerald-600",
  absent: "bg-rose-600",
  late: "bg-amber-600",
};

/** Tailwind ring 색 class — focus / selected 시각. */
export const ATTENDANCE_CYCLE_RING: Record<AttendanceCycleStatus, string> = {
  none: "ring-slate-500",
  present: "ring-emerald-400",
  absent: "ring-rose-400",
  late: "ring-amber-400",
};

const CYCLE_ORDER: AttendanceCycleStatus[] = ["none", "present", "absent", "late"];

/**
 * 다음 cycle status 계산.
 *   none → present → absent → late → none
 *
 * server enum 외 status ("excused" 등) 가 들어오면 cycle 시작 (none → present).
 */
export function nextAttendanceCycleStatus(
  current: string | undefined,
): AttendanceCycleStatus {
  const idx = CYCLE_ORDER.indexOf((current ?? "none") as AttendanceCycleStatus);
  if (idx === -1) return "present"; // server 의 다른 status (예: excused) → 그냥 출석으로 시작
  return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
}

/**
 * 현재 status 를 cycle 표시용 정규화.
 *   - undefined / "" / "none" → "none"
 *   - "present" / "absent" / "late" → 그대로
 *   - "excused" 등 외부 status → "none" 으로 표시 (cycle 외)
 */
export function normalizeForCycle(
  current: string | undefined,
): AttendanceCycleStatus {
  if (!current || current === "none") return "none";
  if (current === "present" || current === "absent" || current === "late") {
    return current;
  }
  return "none";
}
