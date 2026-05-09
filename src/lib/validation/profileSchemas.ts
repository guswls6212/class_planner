/**
 * 학생/강사 프로필 입력 검증 — UI form에서 직접 사용하는 상수 + helper.
 *
 * UAT 2026-05-08 보고: input에 이상값(예: 생년월일 222233년, 성별 "남ㅇㅇㅇ",
 * 학년 자유 텍스트)이 들어가는 문제. 화이트리스트 강제로 데이터 깨끗하게 유지.
 */

export const NAME_MAX_LENGTH = 6;
export const SCHOOL_MAX_LENGTH = 30;

export const GRADE_OPTIONS = [
  "초1",
  "초2",
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
  "고1",
  "고2",
  "고3",
  "미취학",
  "재수",
  "기타",
] as const;
export type Grade = (typeof GRADE_OPTIONS)[number];

export function isValidGrade(v: string): v is Grade {
  return (GRADE_OPTIONS as readonly string[]).includes(v);
}

export const GENDER_OPTIONS = ["male", "female"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const GENDER_LABEL: Record<Gender, string> = {
  male: "남",
  female: "여",
};

export function isValidGender(v: string): v is Gender {
  return (GENDER_OPTIONS as readonly string[]).includes(v);
}

/**
 * 한국 전화번호 자동 하이픈 포맷.
 * - 02 (서울 지역): 2-3-4 또는 2-4-4
 * - 010, 0XX (휴대폰 + 지역): 3-4-4
 * 11자리(휴대폰 기준) 초과 입력은 잘라낸다.
 */
export function formatKoreanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 한국 전화번호 형식 검증 — 빈 값은 통과(권장 필드).
 */
export function isValidKoreanPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return true;
  if (/^010\d{8}$/.test(digits)) return true;
  if (/^02\d{7,8}$/.test(digits)) return true;
  if (/^0[3-9]\d{8,9}$/.test(digits)) return true;
  return false;
}

interface BirthDateRange {
  min: string;
  max: string;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 학생 생년월일 허용 범위 (만 4~25세). HTML date input의 min/max 속성에 사용.
 * 호출 시점의 오늘 날짜 기준으로 계산되므로 컴포넌트 mount 시 1회 호출 권장.
 */
export function getStudentBirthDateRange(today: Date = new Date()): BirthDateRange {
  const max = new Date(today.getFullYear() - 4, today.getMonth(), today.getDate());
  const min = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
  return { min: toIsoDate(min), max: toIsoDate(max) };
}

/**
 * 강사 생년월일 허용 범위 (만 18~80세). 현재 강사 폼에 birthDate 필드는 없지만
 * 향후 추가 시 사용. 학생 range와 분리해두어 entity별 정책 명확화.
 */
export function getTeacherBirthDateRange(today: Date = new Date()): BirthDateRange {
  const max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const min = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate());
  return { min: toIsoDate(min), max: toIsoDate(max) };
}

/**
 * birthDate(YYYY-MM-DD) 문자열이 주어진 range 안에 있는지. 빈 값은 통과(권장 필드).
 */
export function isBirthDateInRange(value: string, range: BirthDateRange): boolean {
  if (!value) return true;
  return value >= range.min && value <= range.max;
}
