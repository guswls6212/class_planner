/**
 * 🌍 전역 사용자 데이터 초기화 훅
 *
 * 로그인한 사용자의 classPlannerData를 로컬스토리지로 전체 로드하고,
 * 과목 수가 0건일 때만 기본 과목을 포함하여 초기화합니다.
 * 모든 페이지에서 동작하며, 한 번만 실행됩니다.
 */

import { useEffect, useState } from "react";
import { logger } from "../lib/logger";
import type { Subject } from "../lib/planner";
import { getKSTTime } from "../lib/timeUtils";
import { supabase } from "../utils/supabaseClient";

// 기본 과목 목록 (고정 ID 사용)
const DEFAULT_SUBJECTS: Subject[] = [
  { id: "default-1", name: "초등수학", color: "#fbbf24" }, // 밝은 노란색
  { id: "default-2", name: "중등수학", color: "#f59e0b" }, // 주황색
  { id: "default-3", name: "중등영어", color: "#3b82f6" }, // 파란색
  { id: "default-4", name: "중등국어", color: "#10b981" }, // 초록색
  { id: "default-5", name: "중등과학", color: "#ec4899" }, // 분홍색
  { id: "default-6", name: "중등사회", color: "#06b6d4" }, // 청록색
  { id: "default-7", name: "고등수학", color: "#ef4444" }, // 빨간색
  { id: "default-8", name: "고등영어", color: "#8b5cf6" }, // 보라색
  { id: "default-9", name: "고등국어", color: "#059669" }, // 진한 초록색
];

// 기본 classPlannerData 구조 (향후 사용 예정)
// const createDefaultClassPlannerData = (subjects: Subject[] = []) => ({
//   students: [],
//   subjects,
//   sessions: [],
//   enrollments: [],
//   version: "1.0",
//   lastModified: getKSTTime(),
// });

export const useGlobalDataInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const initializeUserData = async () => {
      try {
        // 로그인 상태 확인 (Supabase Auth 사용)
        logger.debug("사용자 인증 상태를 확인합니다");

        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            logger.error("세션 확인 중 오류 발생", undefined, error as Error);
            return;
          }

          if (!session || !session.user) {
            logger.debug("로그인되지 않은 사용자 - 데이터 초기화 건너뜀");
            return;
          }

          logger.info("인증된 사용자 확인", { email: session.user.email });

          // 🚀 스마트 초기화: localStorage 데이터 체크
          const existingData = localStorage.getItem("classPlannerData");
          const storedUserId = localStorage.getItem("supabase_user_id");

          if (existingData && storedUserId === session.user.id) {
            logger.info("기존 사용자 데이터 존재 - 서버 호출 건너뜀", {
              userId: storedUserId,
              dataSize: existingData.length,
            });
            setIsInitialized(true);
            return;
          }

          // 다른 사용자의 데이터가 있거나 데이터가 없는 경우
          if (existingData && storedUserId !== session.user.id) {
            logger.warn("다른 사용자 데이터 감지 - 기존 데이터 삭제", {
              previousUserId: storedUserId,
              currentUserId: session.user.id,
            });
            localStorage.removeItem("classPlannerData");
          }
        } catch (error) {
          logger.error("인증 확인 중 오류 발생", undefined, error as Error);
          return;
        }

        logger.info("사용자 데이터 초기화를 시작합니다");
        setIsInitializing(true);

        // 사용자 ID 가져오기 (세션에서)
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          logger.error("사용자 ID를 가져올 수 없습니다");
          setIsInitializing(false);
          return;
        }

        // 🔥 1단계: 서버에서 classPlannerData 전체 조회
        logger.info("서버에서 classPlannerData 전체를 조회합니다");
        const response = await globalThis.fetch(`/api/data?userId=${userId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const responseData = await response.json();
        const serverData = responseData.data || {};

        // 🔥 2단계: 로컬스토리지에 전체 데이터 저장
        const classPlannerData = {
          students: serverData.students || [],
          subjects: serverData.subjects || [],
          sessions: serverData.sessions || [],
          enrollments: serverData.enrollments || [],
          version: serverData.version || "1.0",
        };

        logger.info("서버 데이터를 로컬스토리지에 저장합니다", {
          studentCount: classPlannerData.students.length,
          subjectCount: classPlannerData.subjects.length,
          sessionCount: classPlannerData.sessions.length,
          enrollmentCount: classPlannerData.enrollments.length,
        });

        // 로컬스토리지에 저장
        localStorage.setItem(
          "classPlannerData",
          JSON.stringify(classPlannerData)
        );
        localStorage.setItem("supabase_user_id", userId);

        // 🔥 3단계: 과목 수가 0건인지 확인
        const existingSubjects = classPlannerData.subjects || [];
        if (existingSubjects.length === 0) {
          logger.info("과목이 없어서 기본 과목들을 추가합니다", {
            defaultSubjectCount: DEFAULT_SUBJECTS.length,
            defaultSubjectNames: DEFAULT_SUBJECTS.map((s) => s.name),
          });

          // 🔥 4단계: 기본 과목을 포함하여 데이터 업데이트 (KST 시간으로 타임스탬프 추가)
          const now = getKSTTime();
          const subjectsWithTimestamps = DEFAULT_SUBJECTS.map((subject) => ({
            ...subject,
            createdAt: now,
            updatedAt: now,
          }));

          const updatedData = {
            ...classPlannerData,
            subjects: subjectsWithTimestamps,
          };

          // 서버에 저장
          const saveResponse = await globalThis.fetch(
            `/api/data?userId=${userId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(updatedData),
            }
          );

          if (saveResponse.ok) {
            logger.info("기본 과목이 포함된 데이터가 서버에 저장되었습니다");

            // 로컬스토리지도 업데이트
            localStorage.setItem(
              "classPlannerData",
              JSON.stringify(updatedData)
            );

            logger.info(
              "기본 과목이 포함된 데이터가 로컬스토리지에도 저장되었습니다"
            );
          } else {
            logger.error("기본 과목 포함 데이터 서버 저장 실패");
          }
        } else {
          logger.info("이미 과목이 존재합니다", {
            subjectCount: existingSubjects.length,
            subjectNames: existingSubjects.map((s: Subject) => s.name),
          });
        }

        setIsInitialized(true);
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

  return {
    isInitialized,
    isInitializing,
  };
};
