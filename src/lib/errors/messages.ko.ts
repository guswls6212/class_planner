// src/lib/errors/messages.ko.ts
import type { ErrorCode } from "./codes";
import {
  ACADEMY_NAME_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  SCHOOL_MAX_LENGTH,
  SUBJECT_NAME_MAX_LENGTH,
  SESSION_DESCRIPTION_MAX_LENGTH,
  SESSION_NOTE_MAX_LENGTH,
  TEMPLATE_NAME_MAX_LENGTH,
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
  SNAPSHOT_DESCRIPTION_MAX_LENGTH,
  SHARE_TOKEN_LABEL_MAX_LENGTH,
  SHARE_TOKEN_EXPIRES_MIN_DAYS,
  SHARE_TOKEN_EXPIRES_MAX_DAYS,
} from "../validation/profileSchemas";

const messages: Record<ErrorCode, string> = {
  // Student
  STUDENT_NAME_REQUIRED: "학생 이름을 입력해주세요.",
  STUDENT_NAME_DUPLICATE: "이미 존재하는 학생 이름입니다.",
  STUDENT_NAME_TOO_SHORT: `학생 이름은 최소 ${NAME_MIN_LENGTH}자 이상이어야 합니다.`,
  STUDENT_NAME_TOO_LONG: `학생 이름은 최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  STUDENT_NOT_FOUND: "존재하지 않는 학생입니다.",
  STUDENT_GRADE_INVALID: "유효하지 않은 학년입니다.",
  STUDENT_GENDER_INVALID: "성별은 남/여 중에서 선택해주세요.",
  STUDENT_SCHOOL_TOO_LONG: `학교명은 최대 ${SCHOOL_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  STUDENT_BIRTHDATE_OUT_OF_RANGE: "학생 생년월일은 만 4~25세 범위여야 합니다.",
  PHONE_INVALID_FORMAT: "유효한 전화번호 형식이 아닙니다. (예: 010-1234-5678, 02-123-4567)",

  // Teacher
  TEACHER_NAME_REQUIRED: "강사 이름을 입력해주세요.",
  TEACHER_NAME_DUPLICATE: "이미 존재하는 강사 이름입니다.",
  TEACHER_NAME_TOO_SHORT: `강사 이름은 최소 ${NAME_MIN_LENGTH}자 이상이어야 합니다.`,
  TEACHER_NAME_TOO_LONG: `강사 이름은 최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  TEACHER_EMAIL_INVALID: "올바른 이메일 형식이 아닙니다.",

  // Subject
  SUBJECT_NAME_REQUIRED: "과목 이름을 입력해주세요.",
  SUBJECT_NAME_DUPLICATE: "이미 존재하는 과목 이름입니다.",
  SUBJECT_NAME_TOO_SHORT: `과목 이름은 최소 ${NAME_MIN_LENGTH}자 이상이어야 합니다.`,
  SUBJECT_NAME_TOO_LONG: `과목 이름은 최대 ${SUBJECT_NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  SUBJECT_NOT_FOUND: "존재하지 않는 과목입니다.",

  // Academy
  ACADEMY_NAME_REQUIRED: "학원 이름을 입력해주세요.",
  ACADEMY_NAME_TOO_SHORT: `학원 이름은 최소 ${NAME_MIN_LENGTH}자 이상이어야 합니다.`,
  ACADEMY_NAME_TOO_LONG: `학원 이름은 최대 ${ACADEMY_NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`,

  // Session
  SESSION_NOT_FOUND: "존재하지 않는 수업입니다.",
  SESSION_TIME_INVALID: "종료 시간은 시작 시간보다 늦어야 합니다.",
  SESSION_DURATION_EXCEEDED: "세션 시간은 최대 8시간까지 설정할 수 있습니다.",
  SESSION_DESCRIPTION_TOO_LONG: `수업 설명은 최대 ${SESSION_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  SESSION_NOTE_TOO_LONG: `수업 메모는 최대 ${SESSION_NOTE_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  SESSION_WEEKDAY_INVALID: "요일은 0(일)~6(토) 사이의 정수여야 합니다.",

  // Template
  TEMPLATE_NAME_REQUIRED: "템플릿 이름을 입력해주세요.",
  TEMPLATE_NAME_TOO_LONG: `템플릿 이름은 최대 ${TEMPLATE_NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  TEMPLATE_DESCRIPTION_TOO_LONG: `템플릿 설명은 최대 ${TEMPLATE_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있습니다.`,

  // ShareToken
  SHARE_TOKEN_LABEL_TOO_LONG: `공유 라벨은 최대 ${SHARE_TOKEN_LABEL_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  SHARE_TOKEN_EXPIRES_INVALID: `만료 일수는 ${SHARE_TOKEN_EXPIRES_MIN_DAYS}~${SHARE_TOKEN_EXPIRES_MAX_DAYS} 사이의 정수여야 합니다.`,

  // UserSettings
  USER_SETTINGS_THEME_INVALID: "테마는 light 또는 dark만 선택할 수 있습니다.",
  USER_SETTINGS_LANGUAGE_INVALID: "언어는 ko 또는 en만 선택할 수 있습니다.",
  USER_SETTINGS_TIMEZONE_INVALID: "유효한 IANA timezone 형식이 아닙니다. (예: Asia/Seoul)",

  // Color
  COLOR_HEX_INVALID: "색상은 #RRGGBB 16진수 형식이어야 합니다.",

  // Invite
  INVITE_TOKEN_EXPIRED: "만료된 초대 링크입니다.",
  INVITE_TOKEN_USED: "이미 사용된 초대 링크입니다.",
  INVITE_ROLE_INVALID: "role은 'admin' 또는 'member'여야 합니다.",
  INVITE_MEMBER_INSERT_FAILED: "멤버 등록에 실패했습니다.",

  // Snapshot
  SNAPSHOT_TYPE_INVALID: "유효하지 않은 백업 종류입니다.",
  SNAPSHOT_PAYLOAD_REQUIRED: "백업할 데이터가 필요합니다.",
  SNAPSHOT_DESCRIPTION_TOO_LONG: `백업 설명은 최대 ${SNAPSHOT_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있습니다.`,
  SNAPSHOT_INSERT_FAILED: "백업 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
  SNAPSHOT_LIST_FAILED: "백업 목록 조회에 실패했습니다.",
  SNAPSHOT_PERMISSION_DENIED: "백업 생성 권한이 없습니다.",

  // General (HTTP 의미론적 범용 에러 — {ENTITY}_{FIELD}_{RULE} 세그먼트 예외 허용)
  VALIDATION_FAILED: "입력값이 올바르지 않습니다.",
  UNAUTHORIZED: "로그인이 필요합니다.",
  FORBIDDEN: "접근 권한이 없습니다.",
  INTERNAL_ERROR: "서버 오류가 발생했습니다.",
};

/**
 * 에러 코드에 대응하는 한국어 메시지를 반환한다.
 * 미매핑 코드(string)는 fallback 메시지를 반환한다.
 */
export function getKoMessage(code: string): string {
  return (messages as Record<string, string>)[code] ?? "알 수 없는 오류가 발생했습니다.";
}

export default messages;
