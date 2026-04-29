"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { logger } from "../../lib/logger";
import { supabase } from "../../utils/supabaseClient";

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const redirectUrl = localStorage.getItem("redirectAfterLogin");
          if (redirectUrl && redirectUrl !== "/login") {
            localStorage.removeItem("redirectAfterLogin");
            router.push(redirectUrl);
          } else {
            router.push("/");
          }
        }
      } catch (err) {
        logger.error("로그인 페이지 인증 확인 오류:", undefined, err as Error);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setTimeout(() => {
          const redirectUrl = localStorage.getItem("redirectAfterLogin");
          if (redirectUrl && redirectUrl !== "/login") {
            localStorage.removeItem("redirectAfterLogin");
            router.push(redirectUrl);
          } else {
            router.push("/");
          }
        }, 500);
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) {
        setError("로그인에 실패했습니다. 다시 시도해주세요.");
        setIsLoading(false);
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-48px)] md:min-h-dvh items-center justify-center overflow-hidden bg-[var(--color-bg-primary)] px-4">

      {/* 배경 — 미묘한 앰버 광원 효과 */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[400px] rounded-full bg-accent/3 blur-[100px]" />
        {/* 격자 패턴 */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-[var(--color-text-primary)]" />
        </svg>
      </div>

      {/* 카드 */}
      <div className="relative z-10 w-full max-w-[400px]">

        {/* 브랜드 헤더 */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-[var(--color-admin-ink)]">
              <span className="text-lg font-black tracking-tight">CP</span>
            </div>
            <span className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
              클래스 플래너
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            학원 수업 시간표를 쉽고 빠르게
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 shadow-admin-md">

          <h2 className="mb-6 text-center text-base font-semibold text-[var(--color-text-secondary)]">
            로그인
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* 구글 로그인 */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] transition-all duration-200 hover:border-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                "Google로 계속하기"
              )}
            </button>

            {/* 카카오 — 예약 자리 */}
            <button
              disabled
              title="준비 중"
              className="relative flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[#FEE500]/10 px-4 py-3 text-sm font-medium text-[#FEE500]/40 cursor-not-allowed"
            >
              {/* 카카오 로고 */}
              <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0 opacity-40" fill="#3C1E1E">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.713 1.68 5.1 4.237 6.55L5.17 21l4.524-2.903C10.4 18.36 11.19 18.5 12 18.5c5.523 0 10-3.477 10-7.7S17.523 3 12 3z"/>
              </svg>
              카카오로 계속하기
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[var(--color-bg-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] border border-[var(--color-border)]">
                준비 중
              </span>
            </button>
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            로그인하면 수업 시간표를 저장하고<br />팀원과 함께 관리할 수 있습니다
          </p>
        </div>

        {/* 하단 — 익명 사용 안내 */}
        <p className="mt-5 text-center text-[11px] text-[var(--color-text-muted)]">
          로그인 없이도{" "}
          <button
            onClick={() => router.push("/schedule")}
            className="underline underline-offset-2 hover:text-[var(--color-text-secondary)] transition-colors"
          >
            둘러보기
          </button>
          {" "}가능합니다
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
