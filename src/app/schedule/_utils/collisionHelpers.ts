import { timeToMinutes } from "../../../lib/planner";

/**
 * 두 시간 구간이 겹치는지 여부를 반환합니다.
 * 입력: "HH:MM" 형식의 문자열
 */
export function isTimeOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}
