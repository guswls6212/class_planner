/**
 * 로컬 데이터를 서버에 전체 동기화하는 파이프라인.
 *
 * 실행 순서: Students → Subjects → Enrollments → Sessions
 * 각 단계에서 ID 매핑 테이블을 구축하여 다음 단계에 전달한다.
 * 중복은 서버 데이터 기준으로 유지하며, API 오류 발생 시 에러 배열에 누적 후 계속 진행한다.
 */

import type { ClassPlannerData } from "../localStorageCrud";
import {
  findDuplicateStudent,
  findDuplicateSubject,
  findDuplicateEnrollment,
  findDuplicateSession,
} from "./deduplication";
import { logger } from "../logger";

export type MigrationSyncResult = {
  success: boolean;
  syncedCounts: {
    students: number;
    subjects: number;
    enrollments: number;
    sessions: number;
  };
  errors: { entity: string; localId: string; message: string }[];
};

export async function migrateLocalDataToServer(
  userId: string,
  localData: ClassPlannerData,
  serverData: ClassPlannerData
): Promise<MigrationSyncResult> {
  const studentIdMap = new Map<string, string>();
  const subjectIdMap = new Map<string, string>();
  const enrollmentIdMap = new Map<string, string>();

  const syncedCounts = { students: 0, subjects: 0, enrollments: 0, sessions: 0 };
  const errors: { entity: string; localId: string; message: string }[] = [];

  // ── Step 1: Students ────────────────────────────────────────────────────────
  for (const student of localData.students) {
    const serverStudent = findDuplicateStudent(student, serverData.students);
    if (serverStudent) {
      studentIdMap.set(student.id, serverStudent.id);
      syncedCounts.students++;
      logger.debug("fullDataMigration - 학생 중복, 서버 ID 재사용", {
        localId: student.id,
        serverId: serverStudent.id,
      });
      continue;
    }

    try {
      const res = await fetch(`/api/students?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: student.name,
          gender: student.gender,
          birthDate: student.birthDate,
        }),
      });
      const json = await res.json();

      if (json.success && json.data?.id) {
        studentIdMap.set(student.id, json.data.id);
        syncedCounts.students++;
        logger.debug("fullDataMigration - 학생 업로드 성공", {
          localId: student.id,
          serverId: json.data.id,
        });
      } else {
        // 이름 중복 오류 → 서버에서 같은 이름 학생 찾아 ID 재사용
        const isNameConflict =
          res.status === 409 &&
          typeof json.message === "string" &&
          json.message.includes("이미 존재하는 학생 이름");
        if (isNameConflict) {
          const fallback = serverData.students.find(
            (s) => s.name === student.name
          );
          if (fallback) {
            studentIdMap.set(student.id, fallback.id);
            syncedCounts.students++;
            logger.warn("fullDataMigration - 학생 이름 충돌, 서버 ID 폴백 사용", {
              localId: student.id,
              serverId: fallback.id,
            });
            continue;
          }
        }
        const message = json.message ?? json.error ?? "학생 업로드 실패";
        errors.push({ entity: "student", localId: student.id, message });
        logger.warn("fullDataMigration - 학생 업로드 실패", {
          localId: student.id,
          message,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "네트워크 오류";
      errors.push({ entity: "student", localId: student.id, message });
      logger.error("fullDataMigration - 학생 업로드 네트워크 오류", undefined, err as Error);
    }
  }

  // ── Step 2: Subjects ────────────────────────────────────────────────────────
  for (const subject of localData.subjects) {
    const serverSubject = findDuplicateSubject(subject, serverData.subjects);
    if (serverSubject) {
      subjectIdMap.set(subject.id, serverSubject.id);
      syncedCounts.subjects++;
      logger.debug("fullDataMigration - 과목 중복, 서버 ID 재사용", {
        localId: subject.id,
        serverId: serverSubject.id,
      });
      continue;
    }

    try {
      const res = await fetch(`/api/subjects?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subject.name,
          color: subject.color || "#3b82f6",
        }),
      });
      const json = await res.json();

      if (json.success && json.data?.id) {
        subjectIdMap.set(subject.id, json.data.id);
        syncedCounts.subjects++;
        logger.debug("fullDataMigration - 과목 업로드 성공", {
          localId: subject.id,
          serverId: json.data.id,
        });
      } else {
        const message = json.message ?? json.error ?? "과목 업로드 실패";
        errors.push({ entity: "subject", localId: subject.id, message });
        logger.warn("fullDataMigration - 과목 업로드 실패", {
          localId: subject.id,
          message,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "네트워크 오류";
      errors.push({ entity: "subject", localId: subject.id, message });
      logger.error("fullDataMigration - 과목 업로드 네트워크 오류", undefined, err as Error);
    }
  }

  // ── Step 3: Enrollments ─────────────────────────────────────────────────────
  for (const enrollment of localData.enrollments) {
    const serverEnrollment = findDuplicateEnrollment(
      enrollment,
      serverData.enrollments,
      studentIdMap,
      subjectIdMap
    );
    if (serverEnrollment) {
      enrollmentIdMap.set(enrollment.id, serverEnrollment.id);
      syncedCounts.enrollments++;
      logger.debug("fullDataMigration - 수강 중복, 서버 ID 재사용", {
        localId: enrollment.id,
        serverId: serverEnrollment.id,
      });
      continue;
    }

    const mappedStudentId = studentIdMap.get(enrollment.studentId);
    const mappedSubjectId = subjectIdMap.get(enrollment.subjectId);

    if (mappedStudentId === undefined || mappedSubjectId === undefined) {
      const message = `ID 매핑 누락 — studentId: ${enrollment.studentId}, subjectId: ${enrollment.subjectId}`;
      errors.push({ entity: "enrollment", localId: enrollment.id, message });
      logger.warn("fullDataMigration - 수강 ID 매핑 누락, 건너뜀", {
        localId: enrollment.id,
      });
      continue;
    }

    try {
      const res = await fetch(`/api/enrollments?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: mappedStudentId,
          subjectId: mappedSubjectId,
        }),
      });
      const json = await res.json();

      if (json.success && json.data?.id) {
        enrollmentIdMap.set(enrollment.id, json.data.id);
        syncedCounts.enrollments++;
        logger.debug("fullDataMigration - 수강 업로드 성공", {
          localId: enrollment.id,
          serverId: json.data.id,
        });
      } else {
        const message = json.message ?? json.error ?? "수강 업로드 실패";
        errors.push({ entity: "enrollment", localId: enrollment.id, message });
        logger.warn("fullDataMigration - 수강 업로드 실패", {
          localId: enrollment.id,
          message,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "네트워크 오류";
      errors.push({ entity: "enrollment", localId: enrollment.id, message });
      logger.error("fullDataMigration - 수강 업로드 네트워크 오류", undefined, err as Error);
    }
  }

  // ── Step 4: Sessions ─────────────────────────────────────────────────────────
  for (const session of localData.sessions) {
    const serverSession = findDuplicateSession(
      session,
      serverData.sessions,
      enrollmentIdMap,
      localData.enrollments,
      serverData.enrollments,
      studentIdMap,
      subjectIdMap
    );
    if (serverSession) {
      // 서버 버전 우선 — 카운트는 올리지 않음
      logger.debug("fullDataMigration - 수업 중복, 서버 버전 유지", {
        localId: session.id,
        serverId: serverSession.id,
      });
      continue;
    }

    const newEnrollmentIds = (session.enrollmentIds ?? [])
      .map((id) => enrollmentIdMap.get(id))
      .filter((id): id is string => id !== undefined);

    if (newEnrollmentIds.length === 0) {
      const message = "수업에 매핑된 수강 ID가 없음 (no enrollment mappings)";
      errors.push({ entity: "session", localId: session.id, message });
      logger.warn("fullDataMigration - 수업 수강 매핑 없음, 건너뜀", {
        localId: session.id,
      });
      continue;
    }

    try {
      const res = await fetch(`/api/sessions?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentIds: newEnrollmentIds,
          weekday: session.weekday,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          room: session.room,
          yPosition: session.yPosition,
        }),
      });
      const json = await res.json();

      if (json.success && json.data?.id) {
        syncedCounts.sessions++;
        logger.debug("fullDataMigration - 수업 업로드 성공", {
          localId: session.id,
          serverId: json.data.id,
        });
      } else {
        const message = json.message ?? json.error ?? "수업 업로드 실패";
        errors.push({ entity: "session", localId: session.id, message });
        logger.warn("fullDataMigration - 수업 업로드 실패", {
          localId: session.id,
          message,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "네트워크 오류";
      errors.push({ entity: "session", localId: session.id, message });
      logger.error("fullDataMigration - 수업 업로드 네트워크 오류", undefined, err as Error);
    }
  }

  logger.info("fullDataMigration - 마이그레이션 완료", {
    syncedCounts,
    errorCount: errors.length,
  });

  return {
    success: errors.length === 0,
    syncedCounts,
    errors,
  };
}
