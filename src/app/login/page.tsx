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
        logger.error("로그인 페이지 인증 확인 오류:", undefined, error);
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
        console.log(
          "🔍 LoginPage - localStorage 토큰들:",
          Object.keys(localStorage).filter((key) => key.startsWith("sb-"))
        );
        console.log(
          "🔍 LoginPage - 모든 localStorage 키들:",
          Object.keys(localStorage)
        );

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
        logger.error("Google 로그인 에러:", undefined, error);
        setError("로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      logger.error("로그인 처리 중 오류:", undefined, err);
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "calc(100vh - 60px)", // nav 높이만 제외 (footer는 고정)
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="bg-white w-full text-center"
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
          padding: "40px",
          maxWidth: "400px",
        }}
      >
        {/* Header */}
        <div
          className="mb-8"
          style={{
            marginBottom: "32px",
          }}
        >
          <h1
            className="font-bold mb-2"
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#1f2937",
              margin: "0 0 8px 0",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            클래스 플래너
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{
              color: "#6b7280",
              fontSize: "1rem",
              margin: "0",
              lineHeight: "1.5",
            }}
          >
            수업 시간표를 쉽고 빠르게 관리하세요
          </p>
        </div>

        {/* Login Section */}
        <div
          className="mb-8"
          style={{
            marginBottom: "32px",
          }}
        >
          <h2
            className="font-semibold mb-6"
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 24px 0",
            }}
          >
            로그인
          </h2>

          {error && (
            <div
              className="rounded-lg mb-5 text-sm"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Social Buttons */}
          <div
            className="flex flex-col gap-3 mb-6"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="transparent"
              className="w-full py-3 px-4 border transition-all duration-200"
              style={{
                backgroundColor: "white",
                border: "1px solid #d1d5db",
                color: "#374151",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#9ca3af";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                className="flex items-center justify-center gap-3"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}
              >
                <svg
                  className="flex-shrink-0"
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
          <div
            className="mt-6"
            style={{
              marginTop: "24px",
            }}
          >
            <p
              className="text-sm mb-3"
              style={{
                color: "#6b7280",
                fontSize: "0.875rem",
                margin: "0 0 12px 0",
              }}
            >
              이메일 로그인은 준비 중입니다
            </p>
            <Button
              disabled={true}
              variant="transparent"
              className="w-full py-3 px-4 border cursor-not-allowed"
              style={{
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                color: "#9ca3af",
                cursor: "not-allowed",
              }}
            >
              이메일로 로그인 (준비 중)
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="pt-6"
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "24px",
          }}
        >
          <p
            className="text-sm leading-relaxed"
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              margin: "0",
              lineHeight: "1.5",
            }}
          >
            로그인하면 수업 시간표를 저장하고 관리할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
