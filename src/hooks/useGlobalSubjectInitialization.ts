/**
 * 🌍 전역 기본 과목 초기화 훅
 *
 * 로그인한 사용자가 처음 접속할 때 기본 과목들을 자동으로 생성합니다.
 * 모든 페이지에서 동작하며, 한 번만 실행됩니다.
 */

import { useEffect, useState } from "react";
import { logger } from "../lib/logger";
import type { Subject } from "../lib/planner";
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

export const useGlobalSubjectInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const initializeSubjects = async () => {
      try {
        // 로그인 상태 확인 (Supabase Auth 사용)
        logger.debug("사용자 인증 상태를 확인합니다");

        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            logger.error("세션 확인 중 오류 발생", undefined, error);
            return;
          }

          if (!session || !session.user) {
            logger.debug("로그인되지 않은 사용자 - 기본 과목 초기화 건너뜀");
            return;
          }

          logger.info("인증된 사용자 확인", { email: session.user.email });
        } catch (error) {
          logger.error("인증 확인 중 오류 발생", undefined, error);
          return;
        }

        logger.info("기본 과목 초기화를 시작합니다");
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

        // 현재 데이터 조회
        const response = await fetch(`/api/data?userId=${userId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const responseData = await response.json();
        const currentData = responseData.data || {};

        // subjects가 이미 있는지 확인 (서버 기반 중복 방지)
        const existingSubjects = currentData.subjects || [];
        if (existingSubjects.length > 0) {
          logger.info("이미 과목이 존재합니다", {
            subjectCount: existingSubjects.length,
            subjectNames: existingSubjects.map((s: Subject) => s.name),
          });
          setIsInitialized(true);
          setIsInitializing(false);
          return;
        }

        // 기본 과목들 생성
        logger.info("기본 과목들을 생성합니다", {
          subjectCount: DEFAULT_SUBJECTS.length,
          subjectNames: DEFAULT_SUBJECTS.map((s) => s.name),
        });

        const updatedData = {
          ...currentData,
          subjects: DEFAULT_SUBJECTS,
          lastModified: new Date().toISOString(),
        };

        // 데이터베이스에 저장
        const saveResponse = await fetch(`/api/data?userId=${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(updatedData),
        });

        if (saveResponse.ok) {
          logger.info("기본 과목들이 성공적으로 저장되었습니다");
          setIsInitialized(true);
        } else {
          logger.error("기본 과목 저장 실패");
        }
      } catch (error) {
        logger.error("기본 과목 초기화 중 오류 발생", undefined, error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSubjects();
  }, []);

  return {
    isInitialized,
    isInitializing,
  };
};
