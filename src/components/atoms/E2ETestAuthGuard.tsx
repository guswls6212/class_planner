"use client";

import React, { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { logger } from "../../lib/logger";

interface E2ETestAuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * E2E 테스트 전용 AuthGuard
 *
 * 이 컴포넌트는 E2E 테스트 환경에서만 사용되며,
 * 복잡한 인증 로직 없이 항상 인증된 상태로 처리합니다.
 */
const E2ETestAuthGuard: React.FC<E2ETestAuthGuardProps> = ({
  children,
  requireAuth = true,
}) => {
  const { setE2EMode, isE2EMode, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // E2E 테스트 환경 감지
    const isE2EEnvironment =
      typeof window !== "undefined" &&
      (localStorage.getItem("fallback-auth-token") === "true" ||
        localStorage.getItem("e2e-test-mode") === "true" ||
        window.location.search.includes("e2e-test=true") ||
        process.env.PLAYWRIGHT_TEST === "true");

    if (isE2EEnvironment && !isE2EMode) {
      logger.info("E2ETestAuthGuard - E2E 환경 감지, E2E 모드 활성화");
      setE2EMode(true);
    }
  }, [setE2EMode, isE2EMode]);

  // E2E 모드가 활성화되면 항상 인증된 상태로 처리
  if (isE2EMode) {
    logger.debug("E2ETestAuthGuard - E2E 모드 활성화됨, 인증 우회");
    return <>{children}</>;
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-gray-600">E2E 테스트 인증 설정 중...</div>
      </div>
    );
  }

  // 인증이 필요한 페이지인데 로그인하지 않은 경우
  if (requireAuth && !isAuthenticated) {
    logger.warn("E2ETestAuthGuard - 인증 필요하지만 인증되지 않음");
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-red-600">
          E2E 테스트 인증 실패 - 다시 시도해주세요
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default E2ETestAuthGuard;

