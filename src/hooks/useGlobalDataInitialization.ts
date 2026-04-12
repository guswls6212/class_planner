/**
 * 전역 사용자 데이터 초기화 훅
 *
 * 로그인한 사용자의 데이터를 개별 API Routes에서 병렬 fetch하여
 * localStorage("classPlannerData")를 서버 데이터로 초기화한다.
 * 과목이 없으면 기본 과목을 서버에 저장 후 localStorage에 반영한다.
 */

import { useEffect, useState } from "react";
import { syncSubjectCreate } from "../lib/apiSync";
import { setClassPlannerData } from "../lib/localStorageCrud";
import { logger } from "../lib/logger";
import { supabase } from "../utils/supabaseClient";

const DEFAULT_SUBJECTS = [
  { name: "초등수학", color: "#fbbf24" },
  { name: "중등수학", color: "#f59e0b" },
  { name: "중등영어", color: "#3b82f6" },
  { name: "중등국어", color: "#10b981" },
  { name: "중등과학", color: "#ec4899" },
  { name: "중등사회", color: "#06b6d4" },
  { name: "고등수학", color: "#ef4444" },
  { name: "고등영어", color: "#8b5cf6" },
  { name: "고등국어", color: "#059669" },
];

export const useGlobalDataInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const initializeUserData = async () => {
      try {
        logger.debug("사용자 인증 상태를 확인합니다");

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.error("세션 확인 중 오류 발생", undefined, error as Error);
          return;
        }

        if (!session?.user) {
          logger.debug("로그인되지 않은 사용자 - 데이터 초기화 건너뜀");
          return;
        }

        const userId = session.user.id;
        logger.info("인증된 사용자 확인", { email: session.user.email });

        // 다른 사용자의 데이터가 로컬에 있으면 삭제
        const storedUserId = localStorage.getItem("supabase_user_id");
        if (storedUserId && storedUserId !== userId) {
          logger.warn("다른 사용자 데이터 감지 - 기존 데이터 삭제");
          localStorage.removeItem("classPlannerData");
        }

        setIsInitializing(true);

        // 4개 API 병렬 fetch
        logger.info("서버에서 데이터를 병렬 조회합니다");
        const [studentsRes, subjectsRes, sessionsRes, enrollmentsRes] =
          await Promise.allSettled([
            fetch(`/api/students?userId=${userId}`),
            fetch(`/api/subjects?userId=${userId}`),
            fetch(`/api/sessions?userId=${userId}`),
            fetch(`/api/enrollments?userId=${userId}`),
          ]);

        const parseJson = async (result: PromiseSettledResult<Response>) => {
          if (result.status === "rejected") return [];
          try {
            const json = await result.value.json();
            return json.success ? (json.data ?? []) : [];
          } catch {
            return [];
          }
        };

        const students = await parseJson(studentsRes);
        const subjects = await parseJson(subjectsRes);
        const sessions = await parseJson(sessionsRes);
        const enrollments = await parseJson(enrollmentsRes);

        logger.info("서버 데이터 조회 완료", {
          studentCount: students.length,
          subjectCount: subjects.length,
          sessionCount: sessions.length,
          enrollmentCount: enrollments.length,
        });

        // localStorage에 저장
        setClassPlannerData({
          students,
          subjects,
          sessions,
          enrollments,
          version: "1.0",
          lastModified: new Date().toISOString(),
        });

        localStorage.setItem("supabase_user_id", userId);

        // 과목이 없으면 기본 과목 추가
        if (subjects.length === 0) {
          logger.info("과목이 없어서 기본 과목을 추가합니다", {
            count: DEFAULT_SUBJECTS.length,
          });

          // 서버에 기본 과목 저장 (fire-and-forget)
          for (const subject of DEFAULT_SUBJECTS) {
            syncSubjectCreate(userId, subject);
          }

          // localStorage에도 즉시 반영 (임시 ID 사용)
          const defaultSubjectsWithId = DEFAULT_SUBJECTS.map((s, i) => ({
            id: `default-${i + 1}`,
            ...s,
          }));
          setClassPlannerData({
            students,
            subjects: defaultSubjectsWithId,
            sessions,
            enrollments,
            version: "1.0",
            lastModified: new Date().toISOString(),
          });
        }

        setIsInitialized(true);
        logger.info("사용자 데이터 초기화 완료");
      } catch (error) {
        logger.error(
          "사용자 데이터 초기화 중 오류 발생",
          undefined,
          error as Error
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initializeUserData();
  }, []);

  return { isInitialized, isInitializing };
};
