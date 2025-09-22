// Schedule 페이지 관련 상수들

// 모달 기본값
export const DEFAULT_GROUP_SESSION_DATA = {
  studentIds: [],
  subjectId: "",
  weekday: 0,
  startTime: "",
  endTime: "",
  room: "",
};

export const DEFAULT_EDIT_MODAL_TIME_DATA = {
  startTime: "",
  endTime: "",
};

// 시간 관련 상수
export const MAX_SESSION_DURATION_MINUTES = 480; // 8시간
export const DEFAULT_Y_POSITION = 1;

// 에러 메시지
export const ERROR_MESSAGES = {
  END_TIME_BEFORE_START: "종료 시간은 시작 시간보다 늦어야 합니다.",
  SESSION_TOO_LONG: "세션 시간은 최대 8시간까지 설정할 수 있습니다.",
  SUBJECT_NOT_SELECTED: "과목을 선택해주세요.",
  STUDENT_NOT_SELECTED: "학생을 선택해주세요.",
  SESSION_DELETE_CONFIRM: "정말로 이 수업을 삭제하시겠습니까?",
  SESSION_SAVE_FAILED: "세션 저장에 실패했습니다.",
  SESSION_UPDATE_FAILED: "세션 업데이트에 실패했습니다.",
  SESSION_DELETE_FAILED: "세션 삭제에 실패했습니다.",
} as const;

// 성공 메시지
export const SUCCESS_MESSAGES = {
  SESSION_ADDED: "세션이 추가되었습니다.",
  SESSION_UPDATED: "세션이 업데이트되었습니다.",
  SESSION_DELETED: "세션이 삭제되었습니다.",
} as const;

// 로깅 메시지
export const LOG_MESSAGES = {
  GROUP_SESSION_START: "addGroupSession 시작",
  GROUP_SESSION_COMPLETE: "그룹 세션 추가 완료",
  SESSION_UPDATE_START: "세션 업데이트 시작",
  SESSION_UPDATE_COMPLETE: "세션 업데이트 완료",
  TIME_VALIDATION_PASSED: "시간 유효성 검사 통과",
  STUDENT_INPUT_CHANGED: "학생 입력값 변경",
  BUTTON_CLICKED: "학생 추가 버튼 클릭",
  SESSION_DELETED: "세션 삭제 완료",
} as const;

// 디버그 메시지
export const DEBUG_MESSAGES = {
  ENTER_KEY_ADD_STUDENT: "Enter 키로 학생 추가 시도",
  BUTTON_ACTIVATION_CONDITION: "버튼 활성화 조건",
} as const;
