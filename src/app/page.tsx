"use client";

import Link from "next/link";
import { logger } from "../lib/logger";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthGuard from "../components/atoms/AuthGuard";
import { supabase } from "../utils/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 인증 상태 변화 감지하여 리다이렉트 처리
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // 로그인 성공 시 저장된 리다이렉트 URL로 이동
        const redirectUrl = localStorage.getItem("redirectAfterLogin");
        if (redirectUrl && redirectUrl !== "/login" && redirectUrl !== "/") {
          logger.debug("HomePage - 저장된 URL로 리다이렉트:", { redirectUrl });
          localStorage.removeItem("redirectAfterLogin");
          router.push(redirectUrl);
        }
      }
    });

    // 컴포넌트 마운트 시에도 확인 (이미 로그인된 상태)
    const checkExistingSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const redirectUrl = localStorage.getItem("redirectAfterLogin");
        if (redirectUrl && redirectUrl !== "/login" && redirectUrl !== "/") {
          console.log(
            "🔍 HomePage - 기존 세션으로 저장된 URL 리다이렉트:",
            redirectUrl
          );
          localStorage.removeItem("redirectAfterLogin");
          router.push(redirectUrl);
        }
      }
    };

    checkExistingSession();
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <AuthGuard requireAuth={false}>
      <HomeContent />
    </AuthGuard>
  );
}

function HomeContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          클래스 플래너
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
          효율적인 수업 관리와 시간표 작성 도구
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/students"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              학생 관리
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              학생 정보를 추가하고 관리하세요
            </p>
          </Link>

          <Link
            href="/subjects"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              과목 관리
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              과목을 추가하고 색상을 설정하세요
            </p>
          </Link>

          <Link
            href="/schedule"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="text-3xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              시간표
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              드래그 앤 드롭으로 수업을 배치하세요
            </p>
          </Link>

          <Link
            href="/manual"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="text-3xl mb-4">📖</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              사용법
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              자세한 사용법을 확인하세요
            </p>
          </Link>
        </div>

        <div className="mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            시작하려면 로그인해주세요
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            로그인하기
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-gray-500 dark:text-gray-400">
            Next.js + Clean Architecture + Atomic Design으로 구축된 현대적인 웹
            애플리케이션
          </p>
        </div>
      </div>
    </div>
  );
}
