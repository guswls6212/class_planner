"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { logger } from "../../lib/logger";

type Role = "owner" | "admin" | "member";

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "owner", label: "원장", description: "학원 전체를 관리합니다" },
  { value: "admin", label: "강사", description: "수업과 학생을 관리합니다" },
  { value: "member", label: "직원", description: "시간표를 조회합니다" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [academyName, setAcademyName] = useState("");
  const [role, setRole] = useState<Role>("owner");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const uid = session.user.id;
      setUserId(uid);
      setUserName(
        session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          ""
      );

      // 이미 온보딩 완료된 사용자인지 확인
      try {
        const res = await fetch(
          `/api/onboarding/status?userId=${encodeURIComponent(uid)}`
        );
        const data = await res.json();
        if (data.hasAcademy) {
          router.replace("/schedule");
          return;
        }
      } catch {
        // status 확인 실패 시 폼 표시 (최악의 경우 중복 생성은 idempotency가 방어)
        logger.warn("온보딩 상태 확인 실패");
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [router]);

  const isValid = academyName.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !userId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/onboarding?userId=${encodeURIComponent(userId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ academyName: academyName.trim(), role }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "학원 생성에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      logger.info("온보딩 완료", { academyId: data.academyId });
      router.push("/students");
    } catch {
      setError("네트워크 연결을 확인해주세요.");
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">확인 중...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "calc(100vh - 60px)",
      }}
    >
      <div
        className="bg-white w-full max-w-[440px] rounded-2xl p-10"
        style={{ boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)" }}
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
          학원 정보 설정
        </h1>
        {userName && (
          <p className="text-gray-500 text-center mb-8">
            {userName}님, 환영합니다!
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* 학원명 입력 */}
          <div>
            <label
              htmlFor="academyName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              학원명
            </label>
            <input
              id="academyName"
              type="text"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              placeholder="예: 해피수학학원"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
              disabled={isSubmitting}
            />
            {academyName.length > 0 && academyName.trim().length < 2 && (
              <p className="text-red-500 text-sm mt-1">
                학원명은 2글자 이상 입력해주세요.
              </p>
            )}
          </div>

          {/* 역할 선택 */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              역할
            </legend>
            <div className="flex flex-col gap-2">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === option.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="accent-purple-600"
                    disabled={isSubmitting}
                  />
                  <div>
                    <span className="font-medium text-gray-800">
                      {option.label}
                    </span>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 에러 표시 */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                isValid && !isSubmitting
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : undefined,
              backgroundColor:
                !isValid || isSubmitting ? "#d1d5db" : undefined,
            }}
          >
            {isSubmitting ? "생성 중..." : "시작하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
