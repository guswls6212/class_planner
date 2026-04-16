/**
 * 🗄️ localStorage CRUD 유틸리티
 *
 * classPlannerData를 안전하고 효율적으로 조작하는 핵심 유틸리티입니다.
 * 원자성, 일관성, 에러 처리를 보장합니다.
 */

import { logger } from "./logger";
import type { Enrollment, Session, Student, Subject, Teacher } from "./planner";

// ===== 타입 정의 =====

export interface ClassPlannerData {
  students: Student[];
  subjects: Subject[];
  sessions: Session[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  version: string;
  lastModified: string;
}

export interface CrudResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 상수 =====

export const ANONYMOUS_STORAGE_KEY = "classPlannerData:anonymous";

function getStorageKey(): string {
  if (typeof window === "undefined") return ANONYMOUS_STORAGE_KEY;
  const userId = localStorage.getItem("supabase_user_id");
  return userId ? `classPlannerData:${userId}` : ANONYMOUS_STORAGE_KEY;
}

function migrateUnkeyedStorage(): void {
  if (typeof window === "undefined") return;
  const legacy = localStorage.getItem("classPlannerData");
  if (!legacy) return;
  const currentKey = getStorageKey();
  if (!localStorage.getItem(currentKey)) {
    localStorage.setItem(currentKey, legacy);
  }
  localStorage.removeItem("classPlannerData");
}
const createDefaultData = (): ClassPlannerData => ({
  students: [],
  subjects: [],
  sessions: [],
  enrollments: [],
  teachers: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
});

// ===== 기본 CRUD 함수들 =====

/**
 * localStorage에서 classPlannerData 안전하게 읽기
 */
export const getClassPlannerData = (): ClassPlannerData => {
  try {
    if (typeof window === "undefined") {
      logger.debug("localStorageCrud - SSR 환경, 기본 데이터 반환");
      return createDefaultData();
    }

    migrateUnkeyedStorage();
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) {
      logger.debug("localStorageCrud - 저장된 데이터 없음, 기본 데이터 반환");
      return createDefaultData();
    }

    const parsed = JSON.parse(stored);

    // 데이터 구조 검증
    if (!parsed || typeof parsed !== "object") {
      logger.warn("localStorageCrud - 잘못된 데이터 구조, 기본 데이터 반환");
      return createDefaultData();
    }

    // 기본 구조 확인 및 마이그레이션
    const result: ClassPlannerData = {
      students: parsed.students || [],
      subjects: parsed.subjects || [],
      sessions: parsed.sessions || [],
      enrollments: parsed.enrollments || [],
      teachers: parsed.teachers || [],
      version: parsed.version || "1.0",
      lastModified: parsed.lastModified || new Date().toISOString(),
    };

    // lastModified가 없으면 추가하고 저장
    if (!parsed.lastModified) {
      logger.info("localStorageCrud - lastModified 마이그레이션 실행");
      setClassPlannerData(result);
    }

    logger.debug("localStorageCrud - 데이터 로드 성공", {
      studentCount: result.students.length,
      subjectCount: result.subjects.length,
      sessionCount: result.sessions.length,
      enrollmentCount: result.enrollments.length,
    });

    return result;
  } catch (error) {
    logger.error(
      "localStorageCrud - 데이터 읽기 실패:",
      undefined,
      error as Error
    );
    return createDefaultData();
  }
};

/**
 * localStorage에 classPlannerData 안전하게 저장
 */
export const setClassPlannerData = (data: ClassPlannerData): boolean => {
  try {
    if (typeof window === "undefined") {
      logger.debug("localStorageCrud - SSR 환경, 저장 건너뜀");
      return false;
    }

    // 데이터 저장 준비
    const dataToSave = {
      ...data,
    };

    localStorage.setItem(getStorageKey(), JSON.stringify(dataToSave));

    logger.debug("localStorageCrud - 데이터 저장 성공", {
      studentCount: dataToSave.students.length,
      subjectCount: dataToSave.subjects.length,
      sessionCount: dataToSave.sessions.length,
      enrollmentCount: dataToSave.enrollments.length,
    });

    // localStorage 변경 이벤트 발생 (다른 탭 동기화)
    try {
      window.dispatchEvent(
        new CustomEvent("classPlannerDataChanged", {
          detail: dataToSave,
        })
      );
    } catch (eventError) {
      // 테스트/비표준 환경에서 CustomEvent 미지원 등으로 실패해도 저장은 성공 처리
      logger.warn("localStorageCrud - 변경 이벤트 디스패치 실패 (무시)");
    }

    return true;
  } catch (error) {
    logger.error(
      "localStorageCrud - 데이터 저장 실패:",
      undefined,
      error as Error
    );
    return false;
  }
};

/**
 * localStorage 데이터 초기화
 */
export const clearClassPlannerData = (): boolean => {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    localStorage.removeItem(getStorageKey());
    logger.info("localStorageCrud - 데이터 초기화 완료");

    // 초기화 이벤트 발생 (실패해도 무시)
    try {
      window.dispatchEvent(new CustomEvent("classPlannerDataCleared"));
    } catch (eventError) {
      logger.warn("localStorageCrud - 초기화 이벤트 디스패치 실패 (무시)");
    }

    return true;
  } catch (error) {
    logger.error(
      "localStorageCrud - 데이터 초기화 실패:",
      undefined,
      error as Error
    );
    return false;
  }
};

// ===== Students CRUD =====

/**
 * 학생 추가
 */
export const addStudentToLocal = (name: string): CrudResult<Student> => {
  try {
    const data = getClassPlannerData();

    // 새 학생 생성
    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: name.trim(),
    };

    // 중복 이름 검사
    const isDuplicate = data.students.some((s) => s.name === newStudent.name);
    if (isDuplicate) {
      return {
        success: false,
        error: "이미 같은 이름의 학생이 존재합니다.",
      };
    }

    // 데이터 업데이트
    data.students.push(newStudent);
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 학생 추가 성공", {
        studentId: newStudent.id,
        name: newStudent.name,
      });

      return {
        success: true,
        data: newStudent,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 학생 추가 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "학생 추가 실패",
    };
  }
};

/**
 * 학생 수정
 */
export const updateStudentInLocal = (
  id: string,
  updates: { name?: string }
): CrudResult<Student> => {
  try {
    const data = getClassPlannerData();
    const studentIndex = data.students.findIndex((s) => s.id === id);

    if (studentIndex === -1) {
      return {
        success: false,
        error: "학생을 찾을 수 없습니다.",
      };
    }

    // 중복 이름 검사 (자기 자신 제외)
    if (updates.name) {
      const isDuplicate = data.students.some(
        (s, index) => s.name === updates.name!.trim() && index !== studentIndex
      );
      if (isDuplicate) {
        return {
          success: false,
          error: "이미 같은 이름의 학생이 존재합니다.",
        };
      }
    }

    // 학생 업데이트
    const updatedStudent: Student = {
      ...data.students[studentIndex],
      ...(updates.name && { name: updates.name.trim() }),
    };

    data.students[studentIndex] = updatedStudent;
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 학생 수정 성공", {
        studentId: id,
        updates,
      });

      return {
        success: true,
        data: updatedStudent,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 학생 수정 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "학생 수정 실패",
    };
  }
};

/**
 * 학생 삭제
 */
export const deleteStudentFromLocal = (id: string): CrudResult<boolean> => {
  try {
    const data = getClassPlannerData();
    const studentIndex = data.students.findIndex((s) => s.id === id);

    if (studentIndex === -1) {
      return {
        success: false,
        error: "학생을 찾을 수 없습니다.",
      };
    }

    // 관련 enrollments 및 sessions 정리
    const deletedStudent = data.students[studentIndex];
    data.students.splice(studentIndex, 1);

    // 1) 해당 학생의 enrollments 수집 및 삭제
    const targetEnrollments = data.enrollments.filter(
      (e) => e.studentId === id
    );
    const targetEnrollmentIds = new Set(targetEnrollments.map((e) => e.id));
    data.enrollments = data.enrollments.filter((e) => e.studentId !== id);

    // 2) 세션에서 해당 enrollmentIds 제거, 비어 있으면 세션 삭제
    data.sessions = data.sessions
      .map((session) => {
        if (session.enrollmentIds && session.enrollmentIds.length > 0) {
          const filtered = session.enrollmentIds.filter(
            (eId) => !targetEnrollmentIds.has(eId)
          );
          if (filtered.length !== session.enrollmentIds.length) {
            return { ...session, enrollmentIds: filtered };
          }
        }
        return session;
      })
      .filter(
        (session) => session.enrollmentIds && session.enrollmentIds.length > 0
      );
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 학생 삭제 성공", {
        studentId: id,
        name: deletedStudent.name,
        deletedEnrollments: data.enrollments.length,
      });

      return {
        success: true,
        data: true,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 학생 삭제 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "학생 삭제 실패",
    };
  }
};

/**
 * 학생 조회
 */
export const getStudentFromLocal = (id: string): Student | null => {
  try {
    const data = getClassPlannerData();
    return data.students.find((s) => s.id === id) || null;
  } catch (error) {
    logger.error(
      "localStorageCrud - 학생 조회 실패:",
      undefined,
      error as Error
    );
    return null;
  }
};

/**
 * 모든 학생 조회
 */
export const getAllStudentsFromLocal = (): Student[] => {
  try {
    const data = getClassPlannerData();
    return data.students;
  } catch (error) {
    logger.error(
      "localStorageCrud - 학생 목록 조회 실패:",
      undefined,
      error as Error
    );
    return [];
  }
};

// ===== Subjects CRUD =====

/**
 * 과목 추가
 */
export const addSubjectToLocal = (
  name: string,
  color: string
): CrudResult<Subject> => {
  try {
    const data = getClassPlannerData();

    // 새 과목 생성
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: color,
    };

    // 중복 이름 검사
    const isDuplicate = data.subjects.some((s) => s.name === newSubject.name);
    if (isDuplicate) {
      return {
        success: false,
        error: "이미 같은 이름의 과목이 존재합니다.",
      };
    }

    // 데이터 업데이트
    data.subjects.push(newSubject);
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 과목 추가 성공", {
        subjectId: newSubject.id,
        name: newSubject.name,
        color: newSubject.color,
      });

      return {
        success: true,
        data: newSubject,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 과목 추가 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "과목 추가 실패",
    };
  }
};

/**
 * 과목 수정
 */
export const updateSubjectInLocal = (
  id: string,
  updates: { name?: string; color?: string }
): CrudResult<Subject> => {
  try {
    const data = getClassPlannerData();
    const subjectIndex = data.subjects.findIndex((s) => s.id === id);

    if (subjectIndex === -1) {
      return {
        success: false,
        error: "과목을 찾을 수 없습니다.",
      };
    }

    // 중복 이름 검사 (자기 자신 제외)
    if (updates.name) {
      const isDuplicate = data.subjects.some(
        (s, index) => s.name === updates.name!.trim() && index !== subjectIndex
      );
      if (isDuplicate) {
        return {
          success: false,
          error: "이미 같은 이름의 과목이 존재합니다.",
        };
      }
    }

    // 과목 업데이트
    const updatedSubject: Subject = {
      ...data.subjects[subjectIndex],
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.color && { color: updates.color }),
    };

    data.subjects[subjectIndex] = updatedSubject;
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 과목 수정 성공", {
        subjectId: id,
        updates,
      });

      return {
        success: true,
        data: updatedSubject,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 과목 수정 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "과목 수정 실패",
    };
  }
};

/**
 * 과목 삭제
 */
export const deleteSubjectFromLocal = (id: string): CrudResult<boolean> => {
  try {
    const data = getClassPlannerData();
    const subjectIndex = data.subjects.findIndex((s) => s.id === id);

    if (subjectIndex === -1) {
      return {
        success: false,
        error: "과목을 찾을 수 없습니다.",
      };
    }

    // 관련 데이터도 함께 삭제
    const deletedSubject = data.subjects[subjectIndex];
    data.subjects.splice(subjectIndex, 1);

    // 해당 과목의 모든 enrollment 삭제
    const deletedEnrollments = data.enrollments.filter(
      (e) => e.subjectId === id
    );
    data.enrollments = data.enrollments.filter((e) => e.subjectId !== id);

    // 해당 과목의 모든 session 삭제 (enrollmentIds 기반)
    const deletedEnrollmentIds = deletedEnrollments.map((e) => e.id);
    data.sessions = data.sessions.filter(
      (s) => !s.enrollmentIds?.some((eId) => deletedEnrollmentIds.includes(eId))
    );
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 과목 삭제 성공", {
        subjectId: id,
        name: deletedSubject.name,
        deletedEnrollments: deletedEnrollments.length,
        deletedSessions: data.sessions.length,
      });

      return {
        success: true,
        data: true,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 과목 삭제 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "과목 삭제 실패",
    };
  }
};

/**
 * 과목 조회
 */
export const getSubjectFromLocal = (id: string): Subject | null => {
  try {
    const data = getClassPlannerData();
    return data.subjects.find((s) => s.id === id) || null;
  } catch (error) {
    logger.error(
      "localStorageCrud - 과목 조회 실패:",
      undefined,
      error as Error
    );
    return null;
  }
};

/**
 * 모든 과목 조회
 */
export const getAllSubjectsFromLocal = (): Subject[] => {
  try {
    const data = getClassPlannerData();
    return data.subjects;
  } catch (error) {
    logger.error(
      "localStorageCrud - 과목 목록 조회 실패:",
      undefined,
      error as Error
    );
    return [];
  }
};

// ===== Teachers CRUD =====

/**
 * 강사 추가
 */
export const addTeacherToLocal = (
  name: string,
  color: string,
  userId?: string | null
): CrudResult<Teacher> => {
  try {
    const data = getClassPlannerData();

    const isDuplicate = data.teachers.some((t) => t.name === name.trim());
    if (isDuplicate) {
      return {
        success: false,
        error: "이미 같은 이름의 강사가 존재합니다.",
      };
    }

    const newTeacher: Teacher = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
      userId: userId ?? null,
    };

    data.teachers.push(newTeacher);
    data.lastModified = new Date().toISOString();

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 강사 추가 성공", {
        teacherId: newTeacher.id,
        name: newTeacher.name,
      });
      return { success: true, data: newTeacher };
    }
    return { success: false, error: "localStorage 저장 실패" };
  } catch (error) {
    logger.error("localStorageCrud - 강사 추가 실패:", undefined, error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "강사 추가 실패",
    };
  }
};

/**
 * 강사 수정
 */
export const updateTeacherInLocal = (
  id: string,
  updates: { name?: string; color?: string; userId?: string | null }
): CrudResult<Teacher> => {
  try {
    const data = getClassPlannerData();
    const teacherIndex = data.teachers.findIndex((t) => t.id === id);

    if (teacherIndex === -1) {
      return { success: false, error: "강사를 찾을 수 없습니다." };
    }

    if (updates.name) {
      const isDuplicate = data.teachers.some(
        (t, index) => t.name === updates.name!.trim() && index !== teacherIndex
      );
      if (isDuplicate) {
        return { success: false, error: "이미 같은 이름의 강사가 존재합니다." };
      }
    }

    const updatedTeacher: Teacher = {
      ...data.teachers[teacherIndex],
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.color !== undefined && { color: updates.color }),
      ...(updates.userId !== undefined && { userId: updates.userId }),
    };

    data.teachers[teacherIndex] = updatedTeacher;
    data.lastModified = new Date().toISOString();

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 강사 수정 성공", { teacherId: id, updates });
      return { success: true, data: updatedTeacher };
    }
    return { success: false, error: "localStorage 저장 실패" };
  } catch (error) {
    logger.error("localStorageCrud - 강사 수정 실패:", undefined, error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "강사 수정 실패",
    };
  }
};

/**
 * 강사 삭제 (관련 sessions의 teacherId를 null로 설정)
 */
export const deleteTeacherFromLocal = (id: string): CrudResult<boolean> => {
  try {
    const data = getClassPlannerData();
    const teacherIndex = data.teachers.findIndex((t) => t.id === id);

    if (teacherIndex === -1) {
      return { success: false, error: "강사를 찾을 수 없습니다." };
    }

    const deletedTeacher = data.teachers[teacherIndex];
    data.teachers.splice(teacherIndex, 1);

    // 해당 강사가 배정된 세션의 teacherId를 null로 초기화
    data.sessions = data.sessions.map((session) => {
      if (session.teacherId === id) {
        return { ...session, teacherId: undefined };
      }
      return session;
    });

    data.lastModified = new Date().toISOString();

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 강사 삭제 성공", {
        teacherId: id,
        name: deletedTeacher.name,
      });
      return { success: true, data: true };
    }
    return { success: false, error: "localStorage 저장 실패" };
  } catch (error) {
    logger.error("localStorageCrud - 강사 삭제 실패:", undefined, error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "강사 삭제 실패",
    };
  }
};

/**
 * 강사 조회
 */
export const getTeacherFromLocal = (id: string): Teacher | null => {
  try {
    const data = getClassPlannerData();
    return data.teachers.find((t) => t.id === id) || null;
  } catch (error) {
    logger.error("localStorageCrud - 강사 조회 실패:", undefined, error as Error);
    return null;
  }
};

/**
 * 모든 강사 조회
 */
export const getAllTeachersFromLocal = (): Teacher[] => {
  try {
    const data = getClassPlannerData();
    return data.teachers;
  } catch (error) {
    logger.error("localStorageCrud - 강사 목록 조회 실패:", undefined, error as Error);
    return [];
  }
};

// ===== Sessions CRUD =====

/**
 * 세션 추가
 */
export const addSessionToLocal = (
  sessionData: Omit<Session, "id">
): CrudResult<Session> => {
  try {
    const data = getClassPlannerData();

    // 새 세션 생성
    const newSession: Session = {
      id: crypto.randomUUID(),
      ...sessionData,
    };

    // 데이터 업데이트
    data.sessions.push(newSession);
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 세션 추가 성공", {
        sessionId: newSession.id,
        weekday: newSession.weekday,
        time: `${newSession.startsAt}-${newSession.endsAt}`,
      });

      return {
        success: true,
        data: newSession,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 세션 추가 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "세션 추가 실패",
    };
  }
};

/**
 * 세션 수정
 */
export const updateSessionInLocal = (
  id: string,
  updates: Partial<Omit<Session, "id">>
): CrudResult<Session> => {
  try {
    const data = getClassPlannerData();
    const sessionIndex = data.sessions.findIndex((s) => s.id === id);

    if (sessionIndex === -1) {
      return {
        success: false,
        error: "세션을 찾을 수 없습니다.",
      };
    }

    // 세션 업데이트
    const updatedSession: Session = {
      ...data.sessions[sessionIndex],
      ...updates,
    };

    data.sessions[sessionIndex] = updatedSession;
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 세션 수정 성공", {
        sessionId: id,
        updates,
      });

      return {
        success: true,
        data: updatedSession,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 세션 수정 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "세션 수정 실패",
    };
  }
};

/**
 * 세션 삭제
 */
export const deleteSessionFromLocal = (id: string): CrudResult<boolean> => {
  try {
    const data = getClassPlannerData();
    const sessionIndex = data.sessions.findIndex((s) => s.id === id);

    if (sessionIndex === -1) {
      return {
        success: false,
        error: "세션을 찾을 수 없습니다.",
      };
    }

    const deletedSession = data.sessions[sessionIndex];
    data.sessions.splice(sessionIndex, 1);
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 세션 삭제 성공", {
        sessionId: id,
        weekday: deletedSession.weekday,
        time: `${deletedSession.startsAt}-${deletedSession.endsAt}`,
      });

      return {
        success: true,
        data: true,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 세션 삭제 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "세션 삭제 실패",
    };
  }
};

// ===== Enrollments CRUD =====

/**
 * 등록 추가
 */
export const addEnrollmentToLocal = (
  studentId: string,
  subjectId: string
): CrudResult<Enrollment> => {
  try {
    const data = getClassPlannerData();

    // 중복 등록 검사
    const isDuplicate = data.enrollments.some(
      (e) => e.studentId === studentId && e.subjectId === subjectId
    );
    if (isDuplicate) {
      return {
        success: false,
        error: "이미 해당 과목에 등록된 학생입니다.",
      };
    }

    // 새 등록 생성
    const newEnrollment: Enrollment = {
      id: crypto.randomUUID(),
      studentId,
      subjectId,
    };

    // 데이터 업데이트
    data.enrollments.push(newEnrollment);
    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 등록 추가 성공", {
        enrollmentId: newEnrollment.id,
        studentId,
        subjectId,
      });

      return {
        success: true,
        data: newEnrollment,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 등록 추가 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "등록 추가 실패",
    };
  }
};

/**
 * 등록 삭제
 */
export const deleteEnrollmentFromLocal = (id: string): CrudResult<boolean> => {
  try {
    const data = getClassPlannerData();
    const enrollmentIndex = data.enrollments.findIndex((e) => e.id === id);

    if (enrollmentIndex === -1) {
      return {
        success: false,
        error: "등록을 찾을 수 없습니다.",
      };
    }

    const deletedEnrollment = data.enrollments[enrollmentIndex];
    data.enrollments.splice(enrollmentIndex, 1);

    // 해당 enrollment를 사용하는 session들에서 enrollmentId 제거
    data.sessions = data.sessions
      .map((session) => {
        if (session.enrollmentIds?.includes(id)) {
          return {
            ...session,
            enrollmentIds: session.enrollmentIds.filter((eId) => eId !== id),
          };
        }
        return session;
      })
      .filter(
        (session) =>
          // enrollmentIds가 빈 배열이 된 session은 삭제
          session.enrollmentIds && session.enrollmentIds.length > 0
      );

    data.lastModified = new Date().toISOString(); // CRU 작업 시 lastModified 갱신

    if (setClassPlannerData(data)) {
      logger.info("localStorageCrud - 등록 삭제 성공", {
        enrollmentId: id,
        studentId: deletedEnrollment.studentId,
        subjectId: deletedEnrollment.subjectId,
      });

      return {
        success: true,
        data: true,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 등록 삭제 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "등록 삭제 실패",
    };
  }
};

// ===== 사용자별 데이터 삭제 =====

export const clearUserClassPlannerData = (userId: string): boolean => {
  try {
    if (typeof window === "undefined") return false;
    localStorage.removeItem(`classPlannerData:${userId}`);
    logger.info("localStorageCrud - 사용자 데이터 삭제 완료", { userId });
    return true;
  } catch (error) {
    logger.error("localStorageCrud - 사용자 데이터 삭제 실패:", undefined, error as Error);
    return false;
  }
};

// ===== 통합 업데이트 함수 =====

/**
 * 전체 데이터 업데이트 (Schedule 페이지용)
 */
export const updateClassPlannerData = (
  updates: Partial<ClassPlannerData>
): CrudResult<ClassPlannerData> => {
  try {
    const currentData = getClassPlannerData();

    const updatedData: ClassPlannerData = {
      ...currentData,
      ...updates,
      lastModified: new Date().toISOString(), // CRU 작업 시 lastModified 갱신
    };

    if (setClassPlannerData(updatedData)) {
      logger.info("localStorageCrud - 전체 데이터 업데이트 성공", {
        studentCount: updatedData.students.length,
        subjectCount: updatedData.subjects.length,
        sessionCount: updatedData.sessions.length,
        enrollmentCount: updatedData.enrollments.length,
      });

      return {
        success: true,
        data: updatedData,
      };
    } else {
      return {
        success: false,
        error: "localStorage 저장 실패",
      };
    }
  } catch (error) {
    logger.error(
      "localStorageCrud - 전체 데이터 업데이트 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "전체 데이터 업데이트 실패",
    };
  }
};
