"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Button from "../../components/atoms/Button";
import { logger } from "../../lib/logger";
import { supabase } from "../../utils/supabaseClient";

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 이미 로그인된 사용자는 메인 페이지로 리다이렉트
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        logger.debug("LoginPage - 세션 확인", { hasSession: !!session });

        if (session) {
          logger.debug("LoginPage - 이미 로그인됨");
          const redirectUrl = localStorage.getItem("redirectAfterLogin");
          if (redirectUrl && redirectUrl !== "/login") {
            logger.debug("LoginPage - 저장된 URL로 리다이렉트:", {
              redirectUrl,
            });
            localStorage.removeItem("redirectAfterLogin");
            router.push(redirectUrl);
          } else {
            router.push("/");
          }
        }
      } catch (error) {
        logger.error("로그인 페이지 인증 확인 오류:", undefined, error as Error);
      }
    };

    checkAuth();

    // OAuth 리다이렉트 후 세션 확인
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug("LoginPage - 인증 상태 변화", {
        event,
        hasSession: !!session,
      });

      if (event === "SIGNED_IN" && session) {
        logger.debug("LoginPage - 로그인 성공, 토큰 저장 확인");
        logger.debug("LoginPage - localStorage 토큰들", {
          tokens: Object.keys(localStorage).filter((key) =>
            key.startsWith("sb-")
          ),
          allKeys: Object.keys(localStorage),
        });

        // 잠시 대기 후 저장된 리다이렉트 URL 또는 메인페이지로 이동
        setTimeout(() => {
          const redirectUrl = localStorage.getItem("redirectAfterLogin");
          if (redirectUrl && redirectUrl !== "/login") {
            logger.debug("LoginPage - 저장된 URL로 리다이렉트:", {
              redirectUrl,
            });
            localStorage.removeItem("redirectAfterLogin");
            router.push(redirectUrl);
          } else {
            router.push("/");
          }
        }, 1000);
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
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        logger.error("Google 로그인 에러:", undefined, error as Error);
        setError("로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      logger.error("로그인 처리 중 오류:", undefined, err as Error);
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to p-5"
    >
      <div
        className="w-full max-w-[400px] rounded-2xl bg-white p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.1)]"
      >
        {/* Header */}
        <div className="mb-8">
          <h1
            className="mb-2 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to bg-clip-text text-[2.5rem] font-bold leading-tight text-transparent"
          >
            클래스 플래너
          </h1>
          <p className="text-base leading-relaxed text-gray-500">
            수업 시간표를 쉽고 빠르게 관리하세요
          </p>
        </div>

        {/* Login Section */}
        <div className="mb-8">
          <h2 className="mb-6 text-2xl font-semibold text-gray-800">
            로그인
          </h2>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Social Buttons */}
          <div className="mb-6 flex flex-col gap-3">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="transparent"
              className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-all duration-200 hover:-translate-y-px hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
            >
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="shrink-0"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Google로 로그인</span>
              </div>
            </Button>
          </div>

          {/* Email Section */}
          <div className="mt-6">
            <p className="mb-3 text-sm text-gray-500">
              이메일 로그인은 준비 중입니다
            </p>
            <Button
              disabled={true}
              variant="transparent"
              className="w-full cursor-not-allowed border border-gray-300 bg-gray-100 px-4 py-3 text-gray-400"
            >
              이메일로 로그인 (준비 중)
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm leading-relaxed text-gray-500">
            로그인하면 수업 시간표를 저장하고 관리할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
