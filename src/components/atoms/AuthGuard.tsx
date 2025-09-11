"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔍 AuthGuard - 인증 확인 시작");

        // 먼저 localStorage에서 토큰 확인 (Supabase 기본 키 패턴)
        const hasAuthToken = Object.keys(localStorage).some(
          (key) => key.startsWith("sb-") || key.includes("supabase")
        );

        console.log("🔍 AuthGuard - localStorage 토큰 존재:", hasAuthToken);
        console.log(
          "🔍 AuthGuard - localStorage 모든 키들:",
          Object.keys(localStorage)
        );
        console.log(
          "🔍 AuthGuard - Supabase 관련 키들:",
          Object.keys(localStorage).filter(
            (key) => key.startsWith("sb-") || key.includes("supabase")
          )
        );

        if (!hasAuthToken) {
          console.log("🔍 AuthGuard - 토큰 없음, 인증 안됨으로 설정");

          // 인증이 필요한 페이지에서 로그인 페이지로 리다이렉트할 때 현재 URL 저장
          if (requireAuth) {
            const currentPath = window.location.pathname;
            console.log("🔍 AuthGuard - 리다이렉트 URL 저장:", currentPath);
            localStorage.setItem("redirectAfterLogin", currentPath);
          }

          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // 타임아웃 설정으로 무한 로딩 방지
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("인증 확인 타임아웃")), 3000)
        );

        const sessionPromise = supabase.auth.getSession();

        const {
          data: { session },
          error,
        } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

        if (error) {
          console.error("세션 확인 중 오류:", error);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!session);
          console.log("🔍 AuthGuard - 인증 상태:", !!session);
        }
      } catch (err) {
        console.error("인증 확인 중 오류:", err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔍 AuthGuard - 인증 상태 변화:", event, !!session);
      console.log(
        "🔍 AuthGuard - localStorage 토큰들:",
        Object.keys(localStorage).filter((key) => key.startsWith("sb-"))
      );
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []); // 의존성 배열을 빈 배열로 변경하여 무한 루프 방지

  // 리다이렉트 로직을 별도 useEffect로 분리
  useEffect(() => {
    if (!isLoading) {
      // 인증이 필요한 페이지인데 로그인하지 않은 경우만 처리
      if (requireAuth && !isAuthenticated) {
        router.push("/login");
      }
      // 로그인한 사용자가 로그인 페이지에 접근하는 경우는 제거
      // (page.tsx에서 처리하도록 함)
    }
  }, [isLoading, requireAuth, isAuthenticated, router]);

  // 로딩 중
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.2rem",
          color: "#6b7280",
        }}
      >
        로딩 중...
      </div>
    );
  }

  // 인증이 필요한 페이지인데 로그인하지 않은 경우
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // 로그인한 사용자가 로그인 페이지에 접근하는 경우
  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
