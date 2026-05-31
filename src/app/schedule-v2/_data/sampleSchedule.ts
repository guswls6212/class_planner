/**
 * schedule-v2 디자인 미리보기용 샘플 데이터 + 그리드 유틸.
 *
 * 친구(공부방) PDF page1/page2 모델: 원자 단위 = 학생 1명 · 과목 · 요일 · 개별 시간.
 * 같은 과목도 요일마다 다른 시간(들쑥날쑥). 색=강사.
 *
 * ⚠️ 샘플 데이터(익명) — 실데이터 연결은 세션→per-student 모델 결정(ADR) 후.
 */

export interface SubjectRow {
  subj: string;
  /** 요일(월~일) → "2:45-4:00" 형식(오후 12h). 없는 요일은 키 생략. */
  times: Record<string, string>;
}
export interface Student {
  name: string;
  /** 이 학생이 수업 있는 요일들(표시 순서). */
  days: string[];
  rows: SubjectRow[];
}

export const WEEKDAYS = ["월", "화", "수", "목", "금"] as const;

export const SUBJECT_TEACHER: Record<string, string> = {
  수학: "김쌤",
  영어: "이쌤",
  국어: "박쌤",
  과학: "정쌤",
};

/** 요일별 운영 메모(하교/특이사항) — 친구 page1 비고란. */
export const DAY_NOTE: Record<string, string> = {
  월: "",
  화: "화 2:30 하교",
  수: "수 1:40 하교",
  목: "목 1:30 하교",
  금: "금 풀타임·야자",
};

export const SAMPLE_STUDENTS: Student[] = [
  { name: "김민준", days: ["월", "화", "수", "목", "금"], rows: [
    { subj: "수학", times: { 월: "2:45-4:00", 수: "1:45-3:00", 목: "2:45-4:00", 금: "2:45-4:00" } },
    { subj: "영어", times: { 월: "4:00-5:00", 화: "3:30-4:30", 수: "3:00-4:00", 목: "4:00-5:00", 금: "4:00-5:00" } },
  ] },
  { name: "이서연", days: ["월", "화", "수", "목", "금"], rows: [
    { subj: "수학", times: { 월: "2:45-4:00", 수: "1:55-3:10", 목: "2:45-4:00", 금: "2:45-5:00" } },
    { subj: "영어", times: { 월: "4:00-5:00", 화: "3:00-5:00", 수: "3:10-5:00", 목: "4:00-5:00" } },
  ] },
  { name: "박지호", days: ["월", "화", "수", "목", "금"], rows: [
    { subj: "수학", times: { 월: "3:00-4:00", 화: "3:00-4:00", 수: "3:00-4:00", 목: "3:00-4:00", 금: "3:00-5:00" } },
    { subj: "영어", times: { 월: "4:00-5:10", 화: "4:00-5:10", 수: "4:00-5:10", 목: "4:00-5:10" } },
  ] },
  { name: "윤서준", days: ["월", "화", "수", "목", "금"], rows: [
    { subj: "수학", times: { 월: "3:00-4:00", 화: "3:00-4:00", 수: "3:00-4:00", 목: "3:00-4:00", 금: "3:00-5:00" } },
    { subj: "영어", times: { 월: "4:00-5:00", 화: "4:00-5:30", 수: "4:00-5:00", 목: "4:00-5:30", 금: "5:00-6:00" } },
  ] },
  { name: "서지우", days: ["월", "수", "목", "금"], rows: [
    { subj: "수학", times: { 월: "3:40-4:40", 수: "1:40-2:40", 목: "3:40-4:40", 금: "3:40-5:40" } },
  ] },
  { name: "최예나", days: ["월", "화", "수", "목", "금"], rows: [
    { subj: "수학", times: { 월: "3:00-4:30", 화: "3:00-4:00", 수: "3:00-4:30", 목: "3:00-4:00", 금: "3:00-4:00" } },
  ] },
  { name: "정우진", days: ["월", "화", "수", "목", "금"], rows: [
    { subj: "수학", times: { 월: "2:50-3:50", 화: "2:50-3:50", 수: "2:50-3:50", 목: "2:50-3:50", 금: "2:50-4:50" } },
  ] },
  { name: "조유나", days: ["월", "수", "금"], rows: [
    { subj: "수학", times: { 월: "4:20-5:20", 수: "4:20-6:20", 금: "2:50-4:50" } },
  ] },
  { name: "한지율", days: ["월", "화", "수", "토", "일"], rows: [
    { subj: "수학", times: { 월: "4:00-6:00", 화: "4:00-6:00", 토: "4:00-6:00" } },
    { subj: "국어", times: { 화: "7:30-9:30", 수: "7:00-9:00", 일: "4:30-6:30" } },
    { subj: "과학", times: { 수: "4:40-6:40" } },
  ] },
  { name: "남도현", days: ["토", "일"], rows: [
    { subj: "국어", times: { 토: "11:00-12:30", 일: "5:30-7:00" } },
  ] },
];

/** 오후 12h 표기("2:45") → 분(14:45 = 885). 12시는 정오 유지. */
export function pmMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h === 12 ? 12 : h + 12) * 60 + m;
}

export interface GridBlock {
  name: string;
  subj: string;
  start: number;
  end: number;
  lane: number;
}

function passesFilter(subj: string, teacherFilter: string | null): boolean {
  return !teacherFilter || SUBJECT_TEACHER[subj] === teacherFilter;
}

/** 전 평일 블록 범위로 시간축 [start, end](분, 정시 라운딩) 산출 — 모든 요일 밴드 공유. */
export function gridAxis(students: Student[], teacherFilter: string | null): { start: number; end: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const s of students) {
    for (const r of s.rows) {
      if (!passesFilter(r.subj, teacherFilter)) continue;
      for (const d of WEEKDAYS) {
        const t = r.times[d];
        if (!t) continue;
        const [a, b] = t.split("-");
        min = Math.min(min, pmMinutes(a));
        max = Math.max(max, pmMinutes(b));
      }
    }
  }
  if (!isFinite(min)) return { start: 13 * 60, end: 18 * 60 };
  return { start: Math.floor(min / 60) * 60, end: Math.ceil(max / 60) * 60 };
}

/** 한 요일의 블록 + 레인 패킹(겹치면 다음 레인) — 엑셀 손배치를 웹이 자동. */
export function dayGridBlocks(
  students: Student[],
  day: string,
  teacherFilter: string | null
): { blocks: GridBlock[]; lanes: number } {
  const blocks: GridBlock[] = [];
  for (const s of students) {
    for (const r of s.rows) {
      if (!passesFilter(r.subj, teacherFilter)) continue;
      const t = r.times[day];
      if (!t) continue;
      const [a, b] = t.split("-");
      blocks.push({ name: s.name, subj: r.subj, start: pmMinutes(a), end: pmMinutes(b), lane: 0 });
    }
  }
  blocks.sort((x, y) => x.start - y.start || x.end - y.end);
  const laneEnds: number[] = [];
  for (const blk of blocks) {
    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= blk.start) {
        blk.lane = i;
        laneEnds[i] = blk.end;
        placed = true;
        break;
      }
    }
    if (!placed) {
      blk.lane = laneEnds.length;
      laneEnds.push(blk.end);
    }
  }
  return { blocks, lanes: Math.max(laneEnds.length, 1) };
}
