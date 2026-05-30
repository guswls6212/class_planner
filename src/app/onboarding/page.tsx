"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { logger } from "../../lib/logger";
import { getKoMessage } from "../../lib/errors/messages.ko";
import { ACADEMY_NAME_MAX_LENGTH, validateAcademyName } from "../../lib/validation/profileSchemas";

/**
 * Onboarding page — 첫 학원 생성자는 owner 강제 (ADR-019).
 *
 * 정책 (ADR-019):
 *  - 역할 라디오 제거 (이전 owner/admin/member 3-선택 → owner-less 유령 학원 위험).
 *  - admin/member 역할은 초대 수락(`/invite/[token]`)으로만 부여.
 *  - "초대 받았어요" secondary link로 escape hatch 제공.
 *  - server-side 안전망: `/api/onboarding`에서 body.role 무시 + 무조건 owner.
 *
 * Variant E (design-explorations/onboarding-role) 채택.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;
  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "";
  const [academyName, setAcademyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

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

  const nameValidation = validateAcademyName(academyName);
  // SSOT: validateAcademyName이 required/min(NAME_MIN_LENGTH=2)/max 모두 체크.
  const isValid = nameValidation.ok;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!nameValidation.ok) {
      setError(getKoMessage(nameValidation.code));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // ADR-019: client는 role을 보내지 않음. server-side에서 무조건 owner 강제.
      const res = await fetch(
        `/api/onboarding?userId=${encodeURIComponent(userId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ academyName: nameValidation.value }),
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("class-planner:academy-changed"));
      }
      router.push("/students");
    } catch {
      setError("네트워크 연결을 확인해주세요.");
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = () => {
    const code = inviteCode.trim();
    if (!code) return;
    // 초대 코드는 URL 또는 토큰 단독 모두 허용.
    // URL이면 path의 마지막 segment를 token으로 추출.
    const token = code.includes("/invite/")
      ? code.split("/invite/").pop()?.split(/[/?#]/)[0] ?? code
      : code;
    router.push(`/invite/${encodeURIComponent(token)}`);
  };

  if (isChecking) {
    return (
      <div className="onboarding-bg min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">확인 중...</p>
      </div>
    );
  }

  // 사용자가 입력을 시작했지만 유효하지 않은 경우 (빈 상태에선 표시 X).
  const showInputError = academyName.length > 0 && !nameValidation.ok;

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

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                maxLength={ACADEMY_NAME_MAX_LENGTH}
              />
              {showInputError && (
                <p className="text-red-400 text-[13px] mt-1.5">
                  학원명은 2글자 이상 입력해주세요.
                </p>
              )}
            </div>

            {/*
              ADR-019: 첫 학원 생성자는 owner 자동.
              이전 owner/admin/member 라디오 제거 — admin/member는 초대 수락만으로 부여.
            */}
            <div
              role="note"
              aria-label="원장 자동 등록 안내"
              className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.07] border border-amber-400/20"
            >
              <Crown className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] text-amber-200 font-medium">
                  원장으로 등록됩니다
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  직접 생성한 학원의 owner 권한을 받습니다. 관리자·강사는 학원
                  생성 후 초대로 추가하세요.
                </p>
              </div>
            </div>

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
              {isSubmitting ? "생성 중..." : "원장으로 학원 만들기"}
            </button>
          </form>

          {/* Secondary escape hatch — 초대 받았어요 link (ADR-019) */}
          {!showInviteSection ? (
            <button
              type="button"
              onClick={() => setShowInviteSection(true)}
              className="w-full text-center py-2 mt-3 text-xs text-zinc-400 hover:text-amber-300 transition-colors"
              data-testid="invite-toggle"
            >
              초대 받았어요 — 코드 입력하기 →
            </button>
          ) : (
            <div
              className="pt-3 mt-3 border-t border-white/5"
              data-testid="invite-section"
            >
              <label
                htmlFor="inviteCode"
                className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-400 mb-2"
              >
                초대 코드
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="초대 링크 전체 또는 코드 부분"
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none mb-2"
              />
              <button
                type="button"
                onClick={handleInviteSubmit}
                disabled={!inviteCode.trim()}
                className="w-full py-2 border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 font-medium rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                초대 확인
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInviteSection(false);
                  setInviteCode("");
                }}
                className="w-full text-center py-1.5 mt-1 text-xs text-zinc-500 hover:text-zinc-300"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
