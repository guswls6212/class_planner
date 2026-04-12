/**
 * 전역 사용자 데이터 초기화 훅
 *
 * - 세션 없음(익명): localStorage:anonymous 초기화 + 기본 과목 시딩
 * - 세션 있음: 기존 로직 유지 (onboarding → 서버 fetch → localStorage:userId 저장)
 *   + anonymous 데이터와의 충돌 체크 (DataConflictModal 트리거)
 */

import { useCallback, useEffect, useState } from "react";
import { syncSubjectCreate } from "../lib/apiSync";
import {
  ANONYMOUS_STORAGE_KEY,
  clearUserClassPlannerData,
  setClassPlannerData,
} from "../lib/localStorageCrud";
import type { ClassPlannerData } from "../lib/localStorageCrud";
import {
  checkLoginDataConflict,
  applyServerChoice,
  applyLocalDataChoice,
} from "../lib/auth/handleLoginDataMigration";
import type { MigrationResult } from "../lib/auth/handleLoginDataMigration";
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

type ConflictState = Extract<MigrationResult, { action: "conflict" }>;

export const useGlobalDataInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingServerData, setPendingServerData] = useState<ClassPlannerData | null>(null);

  const resolveConflict = useCallback(
    (choice: "server" | "local") => {
      if (!pendingUserId || !pendingServerData) return;

      if (choice === "server") {
        applyServerChoice();
        setClassPlannerData(pendingServerData);
      } else {
        applyLocalDataChoice(pendingUserId);
      }

      setConflictState(null);
      setPendingUserId(null);
      setPendingServerData(null);
      setIsInitialized(true);
    },
    [pendingUserId, pendingServerData]
  );

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

        // ===== 익명 사용자 경로 =====
        if (!session?.user) {
          logger.debug("익명 사용자 — anonymous localStorage 초기화");
          const existing = localStorage.getItem(ANONYMOUS_STORAGE_KEY);
          if (!existing) {
            const defaultSubjectsWithId = DEFAULT_SUBJECTS.map((s, i) => ({
              id: `default-${i + 1}`,
              ...s,
            }));
            setClassPlannerData({
              students: [],
              subjects: defaultSubjectsWithId,
              sessions: [],
              enrollments: [],
              version: "1.0",
              lastModified: new Date().toISOString(),
            });
            logger.info("익명 사용자 — 기본 과목 시딩 완료", {
              count: DEFAULT_SUBJECTS.length,
            });
          }
          setIsInitialized(true);
          return;
        }

        // ===== 로그인 사용자 경로 =====
        const userId = session.user.id;
        logger.info("인증된 사용자 확인", { email: session.user.email });

        // 다른 사용자의 데이터가 로컬에 있으면 삭제
        const storedUserId = localStorage.getItem("supabase_user_id");
        if (storedUserId && storedUserId !== userId) {
          logger.warn("다른 사용자 데이터 감지 - 기존 데이터 삭제");
          clearUserClassPlannerData(storedUserId);
        }

        // userId 먼저 설정 (getStorageKey()가 올바른 키를 반환하도록)
        localStorage.setItem("supabase_user_id", userId);

        setIsInitializing(true);

        // 온보딩 확인
        try {
          const onboardingRes = await fetch(
            `/api/onboarding?userId=${encodeURIComponent(userId)}`,
            { method: "POST" }
          );
          const onboardingData = await onboardingRes.json();
          if (onboardingData.isNew) {
            logger.info("온보딩 완료 - 신규 사용자", {
              academyId: onboardingData.academyId,
            });
          }
        } catch {
          logger.warn("온보딩 호출 실패 (기존 사용자이거나 네트워크 오류)");
        }

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

        const serverData: ClassPlannerData = {
          students,
          subjects,
          sessions,
          enrollments,
          version: "1.0",
          lastModified: new Date().toISOString(),
        };

        logger.info("서버 데이터 조회 완료", {
          studentCount: students.length,
          subjectCount: subjects.length,
          sessionCount: sessions.length,
          enrollmentCount: enrollments.length,
        });

        // 충돌 체크
        const migrationResult = checkLoginDataConflict(serverData);

        if (migrationResult.action === "conflict") {
          setPendingUserId(userId);
          setPendingServerData(serverData);
          setConflictState(migrationResult);
          return;
        }

        if (migrationResult.action === "upload-local") {
          applyLocalDataChoice(userId);
          setIsInitialized(true);
          return;
        }

        // use-server: 정상 경로
        if (subjects.length === 0) {
          logger.info("과목이 없어서 기본 과목을 추가합니다", {
            count: DEFAULT_SUBJECTS.length,
          });
          for (const subject of DEFAULT_SUBJECTS) {
            syncSubjectCreate(userId, subject);
          }
          const defaultSubjectsWithId = DEFAULT_SUBJECTS.map((s, i) => ({
            id: `default-${i + 1}`,
            ...s,
          }));
          setClassPlannerData({
            ...serverData,
            subjects: defaultSubjectsWithId,
          });
        } else {
          setClassPlannerData(serverData);
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

  return { isInitialized, isInitializing, conflictState, resolveConflict };
};
