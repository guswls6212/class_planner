import { useCallback } from "react";
import { logger } from "../lib/logger";
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
      logger.error("localStorage에서 데이터 로드 실패:", undefined, error);
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
        logger.error("로그인되지 않은 사용자 - 마이그레이션 불가");
        return false;
      }

      const localData = loadFromLocalStorage();

      if (!localData) {
        logger.info("마이그레이션할 localStorage 데이터가 없음");
        return true;
      }

      logger.info("🔄 localStorage → Supabase 마이그레이션 시작");

      // 통합 데이터 마이그레이션 (JSONB 방식)
      logger.info("🔄 통합 데이터 마이그레이션 시작");

      const { error: dataError } = await supabase.from("user_data").upsert({
        user_id: user.id,
        data: localData,
        updated_at: new Date().toISOString(),
      });

      if (dataError) {
        logger.error("데이터 마이그레이션 실패:", undefined, dataError);
        return false;
      }

      logger.info("✅ 통합 데이터 마이그레이션 완료");

      logger.info("✅ localStorage → Supabase 마이그레이션 완료");
      return true;
    } catch (error) {
      logger.error("마이그레이션 중 오류:", undefined, error);
      return false;
    }
  }, [loadFromLocalStorage]);

  /**
   * localStorage 데이터 삭제
   */
  const clearLocalStorage = useCallback(() => {
    try {
      logger.info("🗑️ localStorage 데이터 삭제 시작");

      // 개별 키들 삭제
      localStorage.removeItem("students");
      localStorage.removeItem("subjects");
      localStorage.removeItem("sessions");
      localStorage.removeItem("enrollments");

      // 통합 키 삭제
      localStorage.removeItem("classPlannerData");

      logger.info("✅ localStorage 데이터 삭제 완료");
    } catch (error) {
      logger.error("localStorage 데이터 삭제 실패:", undefined, error);
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
      logger.error("마이그레이션 프로세스 실패:", undefined, error);
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
