import { computeRequiredLanes } from "@/lib/sessionCollisionUtils";
import type { Session, Enrollment } from "@/lib/planner";

export type PreflightWarningType =
  | "out-of-range"
  | "overlap"
  | "out-of-operating-days"
  | "range-too-wide"       // PR #429-B: 출력 범위 ≥14h — 1h cell 학생 잘림 위험
  | "dense-lane-3"         // PR #429-B: 동시 3건 — 강사별 분할 보조 권장
  | "crowded-class";       // PR #429-B: 1h cell + 5+학생 — wrap 부족 truncate

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
const LANE_DENSE_THRESHOLD = 3;       // PR #429-B: 3건도 학생 chip width 좁아짐
const RANGE_WIDE_HOURS = 15;          // PR #429-B: 출력 범위 ≥15h 시 1h cell 압축 위험 (default 9-23=14h 는 정상 case)
const CROWDED_CLASS_STUDENT_LIMIT = 5; // PR #429-B: 1h cell 에 5+학생 시 truncate

function timeToHour(time: string): number {
  const [h] = time.split(":").map(Number);
  return h;
}

export function preflightCheck(
  sessions: Session[],
  options: {
    operatingDays?: number[];
    startHour?: number;
    endHour?: number;
    /** 학생 필터 모드 — overlap 경고와 suggestSplit을 억제 */
    isStudentFilter?: boolean;
    /** PR #429-B: 1h cell 내 학생 truncate 검출용 (crowded-class warning) */
    enrollments?: Enrollment[];
  }
): PreflightResult {
  const startHour = options.startHour ?? START_HOUR;
  const endHour = options.endHour ?? END_HOUR;
  const enrollments = options.enrollments ?? [];
  const warnings: PreflightWarning[] = [];
  let suggestSplit: "per-teacher" | null = null;

  // 시간 범위 밖 세션 (학생 필터 모드에서도 유지)
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

  // 요일별 겹침 검사 — 학생 필터 모드에서는 skip
  // (학생 1명 시간표에서 강사별 분할은 의미 없음)
  if (!options.isStudentFilter) {
    const allWeekdays = [...new Set(sessions.map((s) => s.weekday))];
    for (const wd of allWeekdays) {
      const daySessions = sessions.filter((s) => s.weekday === wd);
      const lanes = computeRequiredLanes(daySessions);
      const dayLabel = ["월", "화", "수", "목", "금", "토", "일"][wd] ?? `${wd}`;
      if (lanes >= LANE_WARN_THRESHOLD) {
        warnings.push({
          type: "overlap",
          message: `${dayLabel}요일에 동시 진행 ${lanes}건 — 강사별 분할을 권장합니다`,
        });
        suggestSplit = "per-teacher";
      } else if (lanes === LANE_DENSE_THRESHOLD) {
        // PR #429-B: 3건 — 강사별 분할 보조 권장 (4건 미만이라 강제 X)
        warnings.push({
          type: "dense-lane-3",
          message: `${dayLabel}요일에 동시 진행 3건 — 학생 이름이 짧게 잘릴 수 있어요. 강사별 분할 고려`,
        });
      }
    }
  }

  // PR #429-B: 출력 범위 너무 넓음 — 1h cell 압축 (학생 미표시) 위험
  // data-tight (D2) 적용 후 흔하지 않지만, 데이터 자체 광범위 (≥15h) 시 경고
  // sessions empty 시는 cell 없으니 무관 — skip
  if (sessions.length > 0 && endHour - startHour >= RANGE_WIDE_HOURS) {
    warnings.push({
      type: "range-too-wide",
      message: `출력 범위 ${endHour - startHour}시간 — 1시간 수업의 학생 이름이 잘릴 수 있어요`,
    });
  }

  // PR #429-B: 1h cell + 5+학생 — wrap 부족, 학생 일부 truncate
  // 60분 = 3600s. 60분 이상이지만 90분 미만 (1.5h) 인 cell 만 — wrap 2줄도 충분
  if (enrollments.length > 0) {
    const crowdedSessions = sessions.filter((s) => {
      if (!s.startsAt || !s.endsAt) return false;
      const [sh, sm] = s.startsAt.split(":").map(Number);
      const [eh, em] = s.endsAt.split(":").map(Number);
      const durationMin = eh * 60 + em - sh * 60 - sm;
      if (durationMin > 60) return false; // 1.5h+ 는 wrap 2줄 가능
      // 학생 수 = enrollmentIds 의 unique studentId
      const studentIds = new Set(
        (s.enrollmentIds ?? [])
          .map((eid) => enrollments.find((e) => e.id === eid)?.studentId)
          .filter((id): id is string => Boolean(id)),
      );
      return studentIds.size >= CROWDED_CLASS_STUDENT_LIMIT;
    });
    if (crowdedSessions.length > 0) {
      warnings.push({
        type: "crowded-class",
        message: `${crowdedSessions.length}개 1시간 수업이 ${CROWDED_CLASS_STUDENT_LIMIT}명 이상 — 학생 이름 일부 표시`,
      });
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
