/**
 * 학생/강사/과목/학원 입력 검증 — UI form/client sync/server route/domain entity가
 * 모두 동일 helper를 호출하는 단일 진입점(SSOT).
 *
 * UAT 2026-05-08 보고: input에 이상값(예: 생년월일 222233년, 성별 "남ㅇㅇㅇ",
 * 학년 자유 텍스트)이 들어가는 문제. 화이트리스트 강제로 데이터 깨끗하게 유지.
 *
 * UAT 2026-05-10 보고: schedule 인라인 추가 시 길이 제한 미적용 — 학생/과목/강사가
 * 6자 초과 입력으로 들어옴. validateXxxName helper로 모든 입구 일관 적용.
 */

import { ErrorCodes, type ErrorCode } from "../errors/codes";

export const NAME_MAX_LENGTH = 6;
export const SCHOOL_MAX_LENGTH = 30;
export const SUBJECT_NAME_MAX_LENGTH = 12;
export const ACADEMY_NAME_MAX_LENGTH = 30;
// Phase 5 — 확장 entity 길이/enum 정책
export const SESSION_DESCRIPTION_MAX_LENGTH = 500;
export const SESSION_NOTE_MAX_LENGTH = 1000;
export const TEMPLATE_NAME_MAX_LENGTH = 100;
export const TEMPLATE_DESCRIPTION_MAX_LENGTH = 300;
export const SNAPSHOT_DESCRIPTION_MAX_LENGTH = 200;
export const SHARE_TOKEN_LABEL_MAX_LENGTH = 100;
export const SHARE_TOKEN_EXPIRES_MIN_DAYS = 1;
export const SHARE_TOKEN_EXPIRES_MAX_DAYS = 365;
export const USER_SETTINGS_THEME_OPTIONS = ["light", "dark"] as const;
export const USER_SETTINGS_LANGUAGE_OPTIONS = ["ko", "en"] as const;

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

// ─────────────────────────────────────────────────────────────────────────
// 검증 helper — UI 입구/client sync/server route/domain entity 모두 동일 호출.
// 결과는 discriminated union: 성공이면 trim된 값을 함께 반환해 caller가
// 그대로 저장할 수 있게 한다 (trim 누락 방지).
// ─────────────────────────────────────────────────────────────────────────

export type NameValidationResult =
  | { ok: true; value: string }
  | { ok: false; code: ErrorCode };

export type FieldValidationResult = { ok: true } | { ok: false; code: ErrorCode };

interface NameValidationOptions {
  required: ErrorCode;
  tooLong: ErrorCode;
  maxLength: number;
}

function validateNameField(value: string, opts: NameValidationOptions): NameValidationResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: false, code: opts.required };
  if (trimmed.length > opts.maxLength) return { ok: false, code: opts.tooLong };
  return { ok: true, value: trimmed };
}

export function validateStudentName(value: string): NameValidationResult {
  return validateNameField(value, {
    required: ErrorCodes.STUDENT_NAME_REQUIRED,
    tooLong: ErrorCodes.STUDENT_NAME_TOO_LONG,
    maxLength: NAME_MAX_LENGTH,
  });
}

export function validateTeacherName(value: string): NameValidationResult {
  return validateNameField(value, {
    required: ErrorCodes.TEACHER_NAME_REQUIRED,
    tooLong: ErrorCodes.TEACHER_NAME_TOO_LONG,
    maxLength: NAME_MAX_LENGTH,
  });
}

export function validateSubjectName(value: string): NameValidationResult {
  return validateNameField(value, {
    required: ErrorCodes.SUBJECT_NAME_REQUIRED,
    tooLong: ErrorCodes.SUBJECT_NAME_TOO_LONG,
    maxLength: SUBJECT_NAME_MAX_LENGTH,
  });
}

export function validateAcademyName(value: string): NameValidationResult {
  return validateNameField(value, {
    required: ErrorCodes.ACADEMY_NAME_REQUIRED,
    tooLong: ErrorCodes.ACADEMY_NAME_TOO_LONG,
    maxLength: ACADEMY_NAME_MAX_LENGTH,
  });
}

/**
 * 학교명 — 권장 필드. 빈 값은 통과, 입력값 있으면 길이만 검증.
 */
export function validateStudentSchool(value: string): FieldValidationResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true };
  if (trimmed.length > SCHOOL_MAX_LENGTH) {
    return { ok: false, code: ErrorCodes.STUDENT_SCHOOL_TOO_LONG };
  }
  return { ok: true };
}

/**
 * 학년 — 권장 필드. 빈 값 통과, 입력 시 화이트리스트 강제.
 */
export function validateStudentGrade(value: string): FieldValidationResult {
  if (value.trim().length === 0) return { ok: true };
  if (!isValidGrade(value)) return { ok: false, code: ErrorCodes.STUDENT_GRADE_INVALID };
  return { ok: true };
}

/**
 * 성별 — 권장 필드. 빈 값 통과, 입력 시 male/female만 허용.
 */
export function validateStudentGender(value: string): FieldValidationResult {
  if (value.trim().length === 0) return { ok: true };
  if (!isValidGender(value)) return { ok: false, code: ErrorCodes.STUDENT_GENDER_INVALID };
  return { ok: true };
}

/**
 * 전화번호 — 권장 필드. 빈 값은 isValidKoreanPhone에서 통과.
 */
export function validatePhoneNumber(value: string): FieldValidationResult {
  if (!isValidKoreanPhone(value)) {
    return { ok: false, code: ErrorCodes.PHONE_INVALID_FORMAT };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// 객체 검증 helper — entity 입력 객체 전체를 한 번에 검증.
// client sync 송신 직전, server route 진입, domain entity 생성자가 동일 호출.
// partial=true면 PATCH 의미론 (변경된 필드만 검증, name 등 필수 필드 undefined 허용).
// ─────────────────────────────────────────────────────────────────────────

export interface StudentInputData {
  name?: string;
  school?: string;
  gender?: string;
  grade?: string;
  phone?: string;
  birthDate?: string;
}

export interface TeacherInputData {
  name?: string;
  email?: string | null;
  phone?: string | null;
}

export interface SubjectInputData {
  name?: string;
  color?: string;
}

export type ObjectValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode };

interface ObjectValidationOpts {
  /** true면 name 등 필수 필드가 undefined일 때 통과 (PATCH 의미론). */
  partial?: boolean;
  today?: Date;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(value: string): boolean {
  if (value.trim().length === 0) return true;
  return EMAIL_REGEX.test(value);
}

export function validateStudentInput(
  input: StudentInputData,
  opts: ObjectValidationOpts = {},
): ObjectValidationResult<StudentInputData> {
  const partial = opts.partial ?? false;
  const data: StudentInputData = { ...input };

  if (data.name !== undefined) {
    const r = validateStudentName(data.name);
    if (!r.ok) return { ok: false, code: r.code };
    data.name = r.value;
  } else if (!partial) {
    return { ok: false, code: ErrorCodes.STUDENT_NAME_REQUIRED };
  }

  if (data.school !== undefined) {
    const r = validateStudentSchool(data.school);
    if (!r.ok) return { ok: false, code: r.code };
  }
  if (data.gender !== undefined) {
    const r = validateStudentGender(data.gender);
    if (!r.ok) return { ok: false, code: r.code };
  }
  if (data.grade !== undefined) {
    const r = validateStudentGrade(data.grade);
    if (!r.ok) return { ok: false, code: r.code };
  }
  if (data.phone !== undefined) {
    const r = validatePhoneNumber(data.phone);
    if (!r.ok) return { ok: false, code: r.code };
  }
  if (data.birthDate !== undefined) {
    const r = validateStudentBirthDate(data.birthDate, opts.today);
    if (!r.ok) return { ok: false, code: r.code };
  }

  return { ok: true, data };
}

export function validateTeacherInput(
  input: TeacherInputData,
  opts: ObjectValidationOpts = {},
): ObjectValidationResult<TeacherInputData> {
  const partial = opts.partial ?? false;
  const data: TeacherInputData = { ...input };

  if (data.name !== undefined) {
    const r = validateTeacherName(data.name);
    if (!r.ok) return { ok: false, code: r.code };
    data.name = r.value;
  } else if (!partial) {
    return { ok: false, code: ErrorCodes.TEACHER_NAME_REQUIRED };
  }

  if (data.email !== undefined && data.email !== null) {
    if (!isValidEmail(data.email)) {
      return { ok: false, code: ErrorCodes.TEACHER_EMAIL_INVALID };
    }
  }

  if (data.phone !== undefined && data.phone !== null) {
    const r = validatePhoneNumber(data.phone);
    if (!r.ok) return { ok: false, code: r.code };
  }

  return { ok: true, data };
}

export function validateSubjectInput(
  input: SubjectInputData,
  opts: ObjectValidationOpts = {},
): ObjectValidationResult<SubjectInputData> {
  const partial = opts.partial ?? false;
  const data: SubjectInputData = { ...input };

  if (data.name !== undefined) {
    const r = validateSubjectName(data.name);
    if (!r.ok) return { ok: false, code: r.code };
    data.name = r.value;
  } else if (!partial) {
    return { ok: false, code: ErrorCodes.SUBJECT_NAME_REQUIRED };
  }

  if (data.color !== undefined) {
    const r = validateColorHex(data.color);
    if (!r.ok) return { ok: false, code: r.code };
  }
  return { ok: true, data };
}

/**
 * 학생 생년월일 — 빈 값 통과(권장 필드). 입력 시 만 4~25세 범위.
 */
export function validateStudentBirthDate(
  value: string,
  today: Date = new Date(),
): FieldValidationResult {
  if (!value) return { ok: true };
  const range = getStudentBirthDateRange(today);
  if (!isBirthDateInRange(value, range)) {
    return { ok: false, code: ErrorCodes.STUDENT_BIRTHDATE_OUT_OF_RANGE };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 — 확장 entity helper. session memo / template / snapshot /
// share-token / user-settings + color hex / weekday range.
// 모든 4 layer (UI/sync/server) 공통 호출.
// ─────────────────────────────────────────────────────────────────────────

// 3자 short form(#fff) + 6자 long form(#ffffff) 둘 다 허용 — CSS 표준.
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export function validateColorHex(value: string): FieldValidationResult {
  if (!HEX_COLOR_REGEX.test(value)) {
    return { ok: false, code: ErrorCodes.COLOR_HEX_INVALID };
  }
  return { ok: true };
}

export function validateWeekday(value: number): FieldValidationResult {
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    return { ok: false, code: ErrorCodes.SESSION_WEEKDAY_INVALID };
  }
  return { ok: true };
}

export interface SessionMemoFields {
  publicDescription?: string | null;
  internalNote?: string | null;
}

export function validateSessionMemoFields(input: SessionMemoFields): FieldValidationResult {
  if (input.publicDescription !== undefined && input.publicDescription !== null) {
    if (input.publicDescription.length > SESSION_DESCRIPTION_MAX_LENGTH) {
      return { ok: false, code: ErrorCodes.SESSION_DESCRIPTION_TOO_LONG };
    }
  }
  if (input.internalNote !== undefined && input.internalNote !== null) {
    if (input.internalNote.length > SESSION_NOTE_MAX_LENGTH) {
      return { ok: false, code: ErrorCodes.SESSION_NOTE_TOO_LONG };
    }
  }
  return { ok: true };
}

export interface TemplateInputData {
  name?: string;
  description?: string | null;
}

export function validateTemplateInput(
  input: TemplateInputData,
  opts: ObjectValidationOpts = {},
): ObjectValidationResult<TemplateInputData> {
  const partial = opts.partial ?? false;
  const data: TemplateInputData = { ...input };

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed.length === 0) return { ok: false, code: ErrorCodes.TEMPLATE_NAME_REQUIRED };
    if (trimmed.length > TEMPLATE_NAME_MAX_LENGTH) {
      return { ok: false, code: ErrorCodes.TEMPLATE_NAME_TOO_LONG };
    }
    data.name = trimmed;
  } else if (!partial) {
    return { ok: false, code: ErrorCodes.TEMPLATE_NAME_REQUIRED };
  }

  if (data.description !== undefined && data.description !== null) {
    if (data.description.length > TEMPLATE_DESCRIPTION_MAX_LENGTH) {
      return { ok: false, code: ErrorCodes.TEMPLATE_DESCRIPTION_TOO_LONG };
    }
  }

  return { ok: true, data };
}

export function validateSnapshotDescription(
  value: string | null | undefined,
): FieldValidationResult {
  if (value === null || value === undefined) return { ok: true };
  if (value.length > SNAPSHOT_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, code: ErrorCodes.SNAPSHOT_DESCRIPTION_TOO_LONG };
  }
  return { ok: true };
}

export function validateShareTokenLabel(
  value: string | null | undefined,
): FieldValidationResult {
  if (value === null || value === undefined) return { ok: true };
  if (value.length > SHARE_TOKEN_LABEL_MAX_LENGTH) {
    return { ok: false, code: ErrorCodes.SHARE_TOKEN_LABEL_TOO_LONG };
  }
  return { ok: true };
}

export function validateExpiresInDays(value: unknown): FieldValidationResult {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, code: ErrorCodes.SHARE_TOKEN_EXPIRES_INVALID };
  }
  if (value < SHARE_TOKEN_EXPIRES_MIN_DAYS || value > SHARE_TOKEN_EXPIRES_MAX_DAYS) {
    return { ok: false, code: ErrorCodes.SHARE_TOKEN_EXPIRES_INVALID };
  }
  return { ok: true };
}

export interface UserSettingsInputData {
  theme?: string;
  language?: string;
  timezone?: string;
}

const IANA_TIMEZONE_REGEX = /^[A-Za-z][A-Za-z0-9+\-_/]+$/;

export function validateUserSettingsInput(
  input: UserSettingsInputData,
): ObjectValidationResult<UserSettingsInputData> {
  const data: UserSettingsInputData = { ...input };

  if (data.theme !== undefined) {
    if (!(USER_SETTINGS_THEME_OPTIONS as readonly string[]).includes(data.theme)) {
      return { ok: false, code: ErrorCodes.USER_SETTINGS_THEME_INVALID };
    }
  }
  if (data.language !== undefined) {
    if (!(USER_SETTINGS_LANGUAGE_OPTIONS as readonly string[]).includes(data.language)) {
      return { ok: false, code: ErrorCodes.USER_SETTINGS_LANGUAGE_INVALID };
    }
  }
  if (data.timezone !== undefined) {
    if (data.timezone.length === 0 || !IANA_TIMEZONE_REGEX.test(data.timezone)) {
      return { ok: false, code: ErrorCodes.USER_SETTINGS_TIMEZONE_INVALID };
    }
  }

  return { ok: true, data };
}
