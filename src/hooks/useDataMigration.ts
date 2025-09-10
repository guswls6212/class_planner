import { useCallback } from "react";
import type { Enrollment, Session, Student, Subject } from "../lib/planner";
import { supabase } from "../utils/supabaseClient";

interface ClassPlannerData {
  students: Student[];
  subjects: Subject[];
  sessions: Session[];
  enrollments: Enrollment[];
  lastModified?: string;
  version?: string;
}

/**
 * localStorage에서 Supabase로 데이터 마이그레이션 훅
 */
export const useDataMigration = () => {
  /**
   * localStorage에서 데이터 로드
   */
  const loadFromLocalStorage = useCallback((): ClassPlannerData | null => {
    try {
      // 통합된 데이터 키로 시도
      const unifiedData = localStorage.getItem("classPlannerData");
      if (unifiedData) {
        return JSON.parse(unifiedData);
      }

      // 개별 키들에서 데이터 수집
      const sessions = localStorage.getItem("sessions");
      const enrollments = localStorage.getItem("enrollments");
      const students = localStorage.getItem("students");
      const subjects = localStorage.getItem("subjects");

      if (sessions || enrollments || students || subjects) {
        return {
          students: students ? JSON.parse(students) : [],
          subjects: subjects ? JSON.parse(subjects) : [],
          sessions: sessions ? JSON.parse(sessions) : [],
          enrollments: enrollments ? JSON.parse(enrollments) : [],
          lastModified: new Date().toISOString(),
          version: "1.0",
        };
      }

      return null;
    } catch (error) {
      console.error("localStorage에서 데이터 로드 실패:", error);
      return null;
    }
  }, []);

  /**
   * localStorage 데이터를 Supabase로 마이그레이션
   */
  const migrateToSupabase = useCallback(async (): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("로그인되지 않은 사용자 - 마이그레이션 불가");
        return false;
      }

      const localData = loadFromLocalStorage();

      if (!localData) {
        console.log("마이그레이션할 localStorage 데이터가 없음");
        return true;
      }

      console.log("🔄 localStorage → Supabase 마이그레이션 시작");

      // 학생 데이터 마이그레이션
      if (localData.students.length > 0) {
        console.log(
          "🔄 학생 데이터 마이그레이션:",
          localData.students.length,
          "개"
        );
        const studentsToInsert = localData.students.map((student) => ({
          user_id: user.id,
          name: student.name,
          created_at: new Date().toISOString(),
        }));

        const { error: studentsError } = await supabase
          .from("students")
          .insert(studentsToInsert);

        if (studentsError) {
          console.error("학생 데이터 마이그레이션 실패:", studentsError);
          return false;
        }
      }

      // 과목 데이터 마이그레이션
      if (localData.subjects.length > 0) {
        console.log(
          "🔄 과목 데이터 마이그레이션:",
          localData.subjects.length,
          "개"
        );
        const subjectsToInsert = localData.subjects.map((subject) => ({
          user_id: user.id,
          name: subject.name,
          color: subject.color,
          created_at: new Date().toISOString(),
        }));

        const { error: subjectsError } = await supabase
          .from("subjects")
          .insert(subjectsToInsert);

        if (subjectsError) {
          console.error("과목 데이터 마이그레이션 실패:", subjectsError);
          return false;
        }
      }

      // 수강신청 데이터 마이그레이션
      if (localData.enrollments.length > 0) {
        console.log(
          "🔄 수강신청 데이터 마이그레이션:",
          localData.enrollments.length,
          "개"
        );
        const enrollmentsToInsert = localData.enrollments.map((enrollment) => ({
          user_id: user.id,
          student_id: enrollment.studentId,
          subject_id: enrollment.subjectId,
          created_at: new Date().toISOString(),
        }));

        const { error: enrollmentsError } = await supabase
          .from("enrollments")
          .insert(enrollmentsToInsert);

        if (enrollmentsError) {
          console.error("수강신청 데이터 마이그레이션 실패:", enrollmentsError);
          return false;
        }
      }

      // 세션 데이터 마이그레이션
      if (localData.sessions.length > 0) {
        console.log(
          "🔄 세션 데이터 마이그레이션:",
          localData.sessions.length,
          "개"
        );

        // 먼저 수강신청 ID를 매핑해야 함
        const { data: dbEnrollments } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id);

        const enrollmentMap = new Map<string, string>();
        dbEnrollments?.forEach((enrollment) => {
          const key = `${enrollment.student_id}-${enrollment.subject_id}`;
          enrollmentMap.set(key, enrollment.id);
        });

        const sessionsToInsert = localData.sessions.map((session) => ({
          user_id: user.id,
          enrollment_ids: session.enrollmentIds.map((enrollmentId) => {
            // localStorage의 enrollmentId를 DB의 실제 ID로 변환
            const enrollment = localData.enrollments.find(
              (e) => e.id === enrollmentId
            );
            if (enrollment) {
              const key = `${enrollment.studentId}-${enrollment.subjectId}`;
              return enrollmentMap.get(key) || enrollmentId;
            }
            return enrollmentId;
          }),
          weekday: session.weekday,
          starts_at: session.startsAt,
          ends_at: session.endsAt,
          room: session.room,
          created_at: new Date().toISOString(),
        }));

        const { error: sessionsError } = await supabase
          .from("sessions")
          .insert(sessionsToInsert);

        if (sessionsError) {
          console.error("세션 데이터 마이그레이션 실패:", sessionsError);
          return false;
        }
      }

      console.log("✅ localStorage → Supabase 마이그레이션 완료");
      return true;
    } catch (error) {
      console.error("마이그레이션 중 오류:", error);
      return false;
    }
  }, [loadFromLocalStorage]);

  /**
   * localStorage 데이터 삭제
   */
  const clearLocalStorage = useCallback(() => {
    try {
      console.log("🗑️ localStorage 데이터 삭제 시작");

      // 개별 키들 삭제
      localStorage.removeItem("students");
      localStorage.removeItem("subjects");
      localStorage.removeItem("sessions");
      localStorage.removeItem("enrollments");

      // 통합 키 삭제
      localStorage.removeItem("classPlannerData");

      console.log("✅ localStorage 데이터 삭제 완료");
    } catch (error) {
      console.error("localStorage 데이터 삭제 실패:", error);
    }
  }, []);

  /**
   * 전체 마이그레이션 프로세스 실행
   */
  const executeMigration = useCallback(async (): Promise<boolean> => {
    try {
      const success = await migrateToSupabase();

      if (success) {
        clearLocalStorage();
        return true;
      }

      return false;
    } catch (error) {
      console.error("마이그레이션 프로세스 실패:", error);
      return false;
    }
  }, [migrateToSupabase, clearLocalStorage]);

  return {
    loadFromLocalStorage,
    migrateToSupabase,
    clearLocalStorage,
    executeMigration,
  };
};

