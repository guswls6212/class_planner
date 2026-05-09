"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
}) => {
  const router = useRouter();
  const { session, loading } = useAuth();
  const isAuthenticated = !!session;

  // 인증이 필요한 페이지인데 로그인하지 않은 경우 redirect URL 저장
  useEffect(() => {
    if (loading) return;
    if (requireAuth && !isAuthenticated) {
      const currentPath = window.location.pathname;
      localStorage.setItem("redirectAfterLogin", currentPath);
      router.push("/login");
    }
  }, [loading, requireAuth, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl text-[var(--color-text-muted)]">
        로딩 중...
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // 로그인한 사용자가 로그인 페이지에 접근하는 경우 (requireAuth가 false이고 인증된 경우)
  if (
    !requireAuth &&
    isAuthenticated &&
    typeof window !== "undefined" &&
    window.location.pathname === "/login"
  ) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
