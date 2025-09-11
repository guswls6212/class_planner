"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Button from "../../components/atoms/Button";
import { supabase } from "../../utils/supabaseClient";
import styles from "./Login.module.css";

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

        console.log("🔍 LoginPage - 세션 확인:", !!session);

        if (session) {
          console.log("🔍 LoginPage - 이미 로그인됨");
          const redirectUrl = localStorage.getItem("redirectAfterLogin");
          if (redirectUrl && redirectUrl !== "/login") {
            console.log("🔍 LoginPage - 저장된 URL로 리다이렉트:", redirectUrl);
            localStorage.removeItem("redirectAfterLogin");
            router.push(redirectUrl);
          } else {
            router.push("/");
          }
        }
      } catch (error) {
        console.error("로그인 페이지 인증 확인 오류:", error);
      }
    };

    checkAuth();

    // OAuth 리다이렉트 후 세션 확인
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔍 LoginPage - 인증 상태 변화:", event, !!session);

      if (event === "SIGNED_IN" && session) {
        console.log("🔍 LoginPage - 로그인 성공, 토큰 저장 확인");
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
            console.log("🔍 LoginPage - 저장된 URL로 리다이렉트:", redirectUrl);
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
        console.error("Google 로그인 에러:", error);
        setError("로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("로그인 처리 중 오류:", err);
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error("Kakao 로그인 에러:", error);
        setError("로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("로그인 처리 중 오류:", err);
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>클래스 플래너</h1>
          <p className={styles.subtitle}>
            수업 시간표를 쉽고 빠르게 관리하세요
          </p>
        </div>

        <div className={styles.loginSection}>
          <h2 className={styles.loginTitle}>로그인</h2>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.socialButtons}>
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="transparent"
              className={styles.googleButton}
            >
              <div className={styles.buttonContent}>
                <svg
                  className={styles.googleIcon}
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

            <Button
              onClick={handleKakaoLogin}
              disabled={isLoading}
              variant="transparent"
              className={styles.kakaoButton}
            >
              <div className={styles.buttonContent}>
                <svg
                  className={styles.kakaoIcon}
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path
                    fill="#3C1E1E"
                    d="M12 3C6.48 3 2 6.48 2 10.5c0 2.5 1.5 4.7 3.7 6.1L4.5 21l4.9-2.5c1.1.3 2.2.5 3.6.5 5.52 0 10-3.48 10-7.5S17.52 3 12 3z"
                  />
                </svg>
                <span>Kakao로 로그인</span>
              </div>
            </Button>
          </div>

          <div className={styles.divider}>
            <span>또는</span>
          </div>

          <div className={styles.emailSection}>
            <p className={styles.emailNote}>이메일 로그인은 준비 중입니다</p>
            <Button
              disabled={true}
              variant="transparent"
              className={styles.emailButton}
            >
              이메일로 로그인 (준비 중)
            </Button>
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            로그인하면 수업 시간표를 저장하고 관리할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
