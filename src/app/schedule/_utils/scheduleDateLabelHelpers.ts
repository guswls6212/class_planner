/**
 * scheduleTitle + dateLabel/dateLabelShort 생성 pure function.
 *
 * 기존: schedule/page.tsx 의 IIFE (40+ 줄) 와 인라인 ternary 가 viewMode 별 다른
 * 라벨 형식 계산. daily/weekly/monthly 분기 + 같은 달/연도 단축 로직.
 *
 * 본 utils: **state mutation 안 함**. 순수 string 반환. dateLabel 은 toolbar 의
 * full label, dateLabelShort 는 mobile toolbar 단축 (overflow 방지).
 *
 * Sub-proposal: schedule-page-split-refactor PR 18 (loop iteration 15, utils 패턴 확장).
 */

import type { ScheduleViewMode } from "@/hooks/useScheduleView";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** viewMode 별 시간표 title — "일별 시간표" / "주간 시간표" / "월별 시간표" */
export function computeScheduleTitle(viewMode: ScheduleViewMode): string {
  if (viewMode === "daily") return "일별 시간표";
  if (viewMode === "monthly") return "월별 시간표";
  return "주간 시간표";
}

export interface DateLabelResult {
  /** desktop 의 full label — daily: "2026년 5월 7일 (목)" / weekly: "2026년 5월 4일 — 10일" / monthly: "2026년 5월" */
  dateLabel: string;
  /** mobile toolbar 의 단축 label — month/year 단위 (overflow 방지) */
  dateLabelShort: string;
}

/**
 * viewMode + selectedDate → dateLabel / dateLabelShort.
 *
 * daily: 년월일 + 요일
 * weekly: 월요일~일요일 range (같은 달/연도 단축 적용)
 * monthly: 년월
 */
export function computeScheduleDateLabels(
  viewMode: ScheduleViewMode,
  selectedDate: Date,
): DateLabelResult {
  if (viewMode === "daily") {
    const yy = String(selectedDate.getFullYear()).slice(2);
    const m = selectedDate.getMonth() + 1;
    return {
      dateLabel: `${selectedDate.getFullYear()}년 ${m}월 ${selectedDate.getDate()}일 (${DAY_LABELS[selectedDate.getDay()]})`,
      dateLabelShort: `${yy}년 ${m}월`,
    };
  }

  if (viewMode === "weekly") {
    // selectedDate 가 속한 주의 월요일 ~ 일요일.
    const mon = new Date(selectedDate);
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);

    const sameMonth = mon.getMonth() === sun.getMonth();
    const sameYear = mon.getFullYear() === sun.getFullYear();
    const monMM = mon.getMonth() + 1;
    const sunMM = sun.getMonth() + 1;
    const monYY = String(mon.getFullYear()).slice(2);
    const sunYY = String(sun.getFullYear()).slice(2);

    const start = `${mon.getFullYear()}년 ${monMM}월 ${mon.getDate()}일`;
    const end = sameMonth
      ? `${sun.getDate()}일`
      : !sameYear
        ? `${sun.getFullYear()}년 ${sunMM}월 ${sun.getDate()}일`
        : `${sunMM}월 ${sun.getDate()}일`;

    return {
      dateLabel: `${start} — ${end}`,
      dateLabelShort: sameMonth
        ? `${monYY}년 ${monMM}월`
        : !sameYear
          ? `${monYY}-${sunYY}년 ${monMM}-${sunMM}월`
          : `${monYY}년 ${monMM}-${sunMM}월`,
    };
  }

  // monthly
  const yy = String(selectedDate.getFullYear()).slice(2);
  return {
    dateLabel: `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`,
    dateLabelShort: `${yy}년 ${selectedDate.getMonth() + 1}월`,
  };
}
