import { computeRequiredLanes } from "@/lib/sessionCollisionUtils";
import type { Session } from "@/lib/planner";

export type PreflightWarningType = "out-of-range" | "overlap" | "out-of-operating-days";

export interface PreflightWarning {
  type: PreflightWarningType;
  message: string;
}

export interface PreflightResult {
  warnings: PreflightWarning[];
  suggestSplit: "per-teacher" | null;
}

const START_HOUR = 9;
const END_HOUR = 23;
const LANE_WARN_THRESHOLD = 4;

function timeToHour(time: string): number {
  const [h] = time.split(":").map(Number);
  return h;
}

export function preflightCheck(
  sessions: Session[],
  options: { operatingDays?: number[]; startHour?: number; endHour?: number }
): PreflightResult {
  const startHour = options.startHour ?? START_HOUR;
  const endHour = options.endHour ?? END_HOUR;
  const warnings: PreflightWarning[] = [];
  let suggestSplit: "per-teacher" | null = null;

  // 시간 범위 밖 세션
  const outOfRange = sessions.filter((s) => {
    if (!s.startsAt) return false;
    const h = timeToHour(s.startsAt);
    return h < startHour || h >= endHour;
  });
  if (outOfRange.length > 0) {
    warnings.push({
      type: "out-of-range",
      message: `${outOfRange.length}개 수업이 출력 시간 범위(${startHour}:00~${endHour}:00) 밖에 있어 누락됩니다`,
    });
  }

  // 요일별 겹침 검사 (lane ≥ LANE_WARN_THRESHOLD)
  const allWeekdays = [...new Set(sessions.map((s) => s.weekday))];
  for (const wd of allWeekdays) {
    const daySessions = sessions.filter((s) => s.weekday === wd);
    const lanes = computeRequiredLanes(daySessions);
    if (lanes >= LANE_WARN_THRESHOLD) {
      const dayLabel = ["월", "화", "수", "목", "금", "토", "일"][wd] ?? `${wd}`;
      warnings.push({
        type: "overlap",
        message: `${dayLabel}요일에 동시 진행 ${lanes}건 — 강사별 분할을 권장합니다`,
      });
      suggestSplit = "per-teacher";
    }
  }

  // 운영 요일 밖 세션
  if (options.operatingDays) {
    const opSet = new Set(options.operatingDays);
    const outOfDays = sessions.filter((s) => !opSet.has(s.weekday));
    if (outOfDays.length > 0) {
      warnings.push({
        type: "out-of-operating-days",
        message: `${outOfDays.length}개 수업이 운영 요일 설정 밖의 요일에 있습니다`,
      });
    }
  }

  return { warnings, suggestSplit };
}
