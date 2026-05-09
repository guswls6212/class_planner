"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { logger } from "../../lib/logger";

type Role = "owner" | "admin" | "member";

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "owner", label: "원장", description: "학원 전체를 관리합니다" },
  { value: "admin", label: "관리자", description: "수업과 학생을 관리합니다" },
  { value: "member", label: "강사", description: "시간표를 조회합니다" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;
  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "";
  const [academyName, setAcademyName] = useState("");
  const [role, setRole] = useState<Role>("owner");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace("/login");
      return;
    }

    // 이미 온보딩 완료된 사용자인지 확인
    (async () => {
      try {
        const res = await fetch(
          `/api/onboarding/status?userId=${encodeURIComponent(session.user.id)}`
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
    })();
  }, [authLoading, session, router]);

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
      // useGlobalDataInitialization이 academy 변화를 감지하도록 이벤트 dispatch.
      // SPA navigation으로 schedule/students 진입 시 hook의 mig effect가 deps 변화로
      // 재실행 → anonymous → server 마이그레이션 정상 트리거 (UAT 2026-05-08 결함 fix).
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("class-planner:academy-changed"));
      }
      router.push("/students");
    } catch {
      setError("네트워크 연결을 확인해주세요.");
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="onboarding-bg min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">확인 중...</p>
      </div>
    );
  }

  const showInputError =
    academyName.length > 0 && academyName.trim().length < 2;

  return (
    <div className="onboarding-bg min-h-screen flex items-center justify-center px-4 py-12">
      <div className="onboarding-card w-full max-w-[440px] p-10">
        <div className="relative">
          <h1 className="text-[26px] font-extrabold text-white tracking-[-0.025em] mb-1.5">
            학원 정보 설정
          </h1>
          {userName && (
            <p className="text-[13px] text-zinc-400 mb-7">
              <b className="text-amber-400 font-semibold">{userName}</b>님,
              환영합니다
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* 학원명 입력 */}
            <div>
              <label
                htmlFor="academyName"
                className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-300 mb-2"
              >
                학원명
              </label>
              <input
                id="academyName"
                type="text"
                value={academyName}
                onChange={(e) => setAcademyName(e.target.value)}
                placeholder="예: 해피수학학원"
                className={`onboarding-input ${showInputError ? "error" : ""}`}
                autoFocus
                disabled={isSubmitting}
              />
              {showInputError && (
                <p className="text-red-400 text-[13px] mt-1.5">
                  학원명은 2글자 이상 입력해주세요.
                </p>
              )}
            </div>

            {/* 역할 선택 */}
            <fieldset>
              <legend className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-300 mb-2.5">
                역할
              </legend>
              <div className="flex flex-col gap-2">
                {ROLE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`onboarding-radio ${role === option.value ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={role === option.value}
                      onChange={() => setRole(option.value)}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    <span className="onboarding-radio-dot" />
                    <div>
                      <span className="block font-semibold text-[14px] text-white">
                        {option.label}
                      </span>
                      <p className="text-[12px] text-zinc-400 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* 에러 표시 */}
            {error && (
              <div
                role="alert"
                className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-3 rounded-lg text-[13px]"
              >
                {error}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="onboarding-btn"
            >
              {isSubmitting ? "생성 중..." : "시작하기"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
