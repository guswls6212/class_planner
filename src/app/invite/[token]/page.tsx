"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import { logger } from "../../../lib/logger";

const ROLE_LABEL: Record<string, string> = {
  owner: "원장",
  admin: "관리자",
  member: "강사",
};

const PENDING_INVITE_KEY = "pending_invite_token";

interface InviteInfo {
  valid: boolean;
  reason?: string;
  id?: string;
  role?: string;
  academyName?: string;
  expiresAt?: string;
  teacherName?: string | null;
  inviteEmail?: string | null;
}

type InviteState =
  | "loading"
  | "invalid"
  | "state-a" // not logged in
  | "state-b" // logged in, email matches
  | "state-c" // logged in, email mismatch
  | "state-d" // already a member
  | "accepting";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<InviteState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const inviteInfoRef = useRef<InviteInfo | null>(null);

  // Keep ref in sync with state for use inside auth subscription callback
  useEffect(() => {
    inviteInfoRef.current = inviteInfo;
  }, [inviteInfo]);

  // Extract token param
  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  // Compute state given invite info + session email
  const computeState = (
    invite: InviteInfo | null,
    email: string | null
  ): InviteState => {
    if (!invite || !invite.valid) return "invalid";
    if (!email) return "state-a";
    if (invite.inviteEmail && invite.inviteEmail !== email) return "state-c";
    return "state-b";
  };

  // Load invite info + initial auth state
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        const [inviteRes, sessionData] = await Promise.all([
          fetch(`/api/invites/check?token=${token}`).then(
            (r): Promise<InviteInfo> => r.json()
          ),
          supabase.auth.getSession(),
        ]);

        if (cancelled) return;

        setInviteInfo(inviteRes);

        const email = sessionData.data.session?.user.email ?? null;
        setSessionEmail(email);

        // If invite info itself is invalid, short-circuit
        if (!inviteRes.valid) {
          setInviteState("invalid");
          return;
        }

        // No session — check for pending OAuth redirect
        if (!email) {
          const pendingToken = localStorage.getItem(PENDING_INVITE_KEY);
          if (pendingToken === token) {
            // OAuth redirect in flight; wait for auth state change
            const { data: subscription } = supabase.auth.onAuthStateChange(
              (_event, session) => {
                if (cancelled) return;
                if (session?.user.email) {
                  localStorage.removeItem(PENDING_INVITE_KEY);
                  setSessionEmail(session.user.email);
                  setInviteState(
                    computeState(inviteInfoRef.current, session.user.email)
                  );
                }
              }
            );
            unsubscribe = () => subscription.subscription.unsubscribe();
            // While we wait, show state-a so the user can also choose other options
            setInviteState("state-a");
            return;
          }

          setInviteState("state-a");
          return;
        }

        // Logged in — compute b/c based on email match
        setInviteState(computeState(inviteRes, email));
      } catch (err) {
        if (!cancelled) {
          logger.error("Invite init failed", { token }, err as Error);
          setInviteState("invalid");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [token]);

  async function handleLogin() {
    if (!token) return;
    localStorage.setItem(PENDING_INVITE_KEY, token);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/invite/${token}` },
    });
  }

  async function handleAccept() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || !inviteInfo || !token) return;

    setError(null);
    setInviteState("accepting");
    try {
      const res = await fetch(`/api/invites/accept?userId=${session.user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error_code === "email_mismatch") {
          setError(null);
          setInviteState("state-c");
          return;
        }
        setError(
          (typeof data.error === "string" ? data.error : data.error?.message) ??
            "초대 수락에 실패했습니다."
        );
        setInviteState("state-b");
        return;
      }

      if (data.alreadyMember) {
        setInviteState("state-d");
        return;
      }

      // PR 13 — invite accept 직후 active_academy 직접 localStorage set.
      // MemberContext 가 /api/academies/mine fetch 후 비동기 setActiveAcademyId
      // 호출하지만, 같은 tab 의 localStorage 변경은 storage event 발동 안 함 →
      // useGlobalDataInitialization 가 첫 mount 시 academy NULL 로 sessions
      // fetch → 빈 화면 → 사용자 새로고침 (사용자 2026-05-23 발견 race).
      if (data.academyId) {
        try {
          const { setActiveAcademyId } = await import("@/lib/localStorageCrud");
          setActiveAcademyId(session.user.id, data.academyId);
          // dispatch storage event 수동 — useGlobalDataInitialization 의 bump 발동.
          window.dispatchEvent(new CustomEvent("class-planner:academy-changed"));
        } catch (e) {
          logger.warn("active_academy 사전 설정 실패 (새로고침 시 회복)", { academyId: data.academyId }, e as Error);
        }
      }

      logger.info("초대 수락 완료", { academyId: data.academyId });
      router.push("/schedule");
    } catch (err) {
      logger.error("Invite accept network error", { token }, err as Error);
      setError("네트워크 연결을 확인해주세요.");
      setInviteState("state-b");
    }
  }

  async function handleSwitchAccount() {
    if (!token) return;
    localStorage.setItem(PENDING_INVITE_KEY, token);
    await supabase.auth.signOut();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/invite/${token}` },
    });
  }

  async function handleShareLinkOnly() {
    if (!token) return;
    setError(null);
    setShareLinkLoading(true);
    try {
      const res = await fetch("/api/share-tokens/from-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: token }),
      });
      const data = await res.json();
      if (res.ok && data.shareUrl) {
        localStorage.removeItem(PENDING_INVITE_KEY);
        setShareUrl(data.shareUrl);
      } else {
        setError(data.error ?? "링크 생성에 실패했습니다.");
      }
    } catch (err) {
      logger.error("Share link from-invite error", { token }, err as Error);
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setShareLinkLoading(false);
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError("클립보드 복사에 실패했습니다.");
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────

  if (inviteState === "loading") {
    return (
      <div className="onboarding-bg min-h-screen flex items-center justify-center p-5">
        <p className="text-zinc-400 text-sm">초대 정보를 확인하는 중...</p>
      </div>
    );
  }

  if (inviteState === "invalid" || !inviteInfo) {
    const reason = inviteInfo?.reason;
    return (
      <div className="onboarding-bg min-h-screen flex items-center justify-center p-5">
        <div className="onboarding-card w-full max-w-sm p-8 text-center">
          <div className="relative">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {reason === "expired"
                ? "만료된 초대 링크"
                : reason === "used"
                ? "이미 사용된 초대 링크"
                : "유효하지 않은 초대 링크"}
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              {reason === "expired"
                ? "7일이 지난 초대 링크입니다. 학원장에게 새로운 초대를 요청하세요."
                : reason === "used"
                ? "이미 사용된 초대 링크입니다."
                : "초대 링크가 올바르지 않습니다."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 text-sm font-medium hover:border-amber-400/40 hover:bg-white/[0.07] transition-all"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel =
    ROLE_LABEL[inviteInfo.role ?? ""] ?? inviteInfo.role ?? "구성원";

  return (
    <div className="onboarding-bg min-h-screen flex items-center justify-center p-5">
      <div className="onboarding-card w-full max-w-sm p-8">
        <div className="relative">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎓</div>
            <h2 className="text-2xl font-bold text-white mb-2">학원 초대</h2>
            {inviteInfo.teacherName ? (
              <p className="text-sm text-zinc-300">
                <strong className="text-white">{inviteInfo.academyName}</strong>의
                강사{" "}
                <strong className="text-white">
                  {inviteInfo.teacherName}
                </strong>
                으로 초대되었습니다
              </p>
            ) : (
              <p className="text-sm text-zinc-300">
                <strong className="text-white">{inviteInfo.academyName}</strong>
                에서{" "}
                <span className="inline-block bg-accent/15 text-amber-400 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {roleLabel}
                </span>{" "}
                역할로 초대했습니다
              </p>
            )}
          </div>

          {/* Error banner (shared) */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* State A — not logged in */}
          {inviteState === "state-a" && (
            <div>
              {!shareUrl ? (
                <>
                  <button
                    onClick={handleLogin}
                    className="onboarding-btn mb-3"
                  >
                    Google로 가입하기
                  </button>
                  {/* 카카오 — frosted 비활성 (/login 페이지와 일관성, PR 10) */}
                  <button
                    disabled
                    title="준비 중"
                    className="relative flex min-h-[44px] w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-[#FEE500]/[0.06] px-4 py-3 text-sm font-medium text-[#FEE500]/40 cursor-not-allowed mb-3"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0 opacity-40" fill="#3C1E1E" aria-hidden="true">
                      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.713 1.68 5.1 4.237 6.55L5.17 21l4.524-2.903C10.4 18.36 11.19 18.5 12 18.5c5.523 0 10-3.477 10-7.7S17.523 3 12 3z"/>
                    </svg>
                    카카오로 가입하기
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                      준비 중
                    </span>
                  </button>
                  {/* share-only 옵션은 admin invite 에는 의미 없음 (관리자는 풀 권한 필요).
                      member/teacher invite 에만 노출. PR 10 — 사용자 발견. */}
                  {inviteInfo.role !== "admin" && (
                    <button
                      onClick={handleShareLinkOnly}
                      disabled={shareLinkLoading}
                      className="w-full py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
                    >
                      {shareLinkLoading
                        ? "링크 생성 중..."
                        : "시간표 보기 링크만 받기 →"}
                    </button>
                  )}
                </>
              ) : (
                <div>
                  <div className="bg-black/40 border border-white/10 rounded-lg p-3 mb-3">
                    <p className="text-xs text-zinc-400 mb-1.5">시간표 공유 링크</p>
                    <p className="text-xs text-zinc-200 break-all font-mono">
                      {shareUrl}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyShareUrl}
                    className="w-full py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-100 text-sm font-medium hover:border-amber-400/40 hover:bg-white/[0.07] transition-all"
                  >
                    {copySuccess ? "✓ 복사됨" : "링크 복사"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* State B — logged in, accept-ready */}
          {(inviteState === "state-b" || inviteState === "accepting") && (
            <div>
              {inviteInfo.inviteEmail && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg text-sm mb-4">
                  <strong className="text-emerald-300">{inviteInfo.inviteEmail}</strong>
                  {" "}계정으로 로그인됨
                </div>
              )}
              <button
                onClick={handleAccept}
                disabled={inviteState === "accepting"}
                className="onboarding-btn"
              >
                {inviteState === "accepting" ? "수락 중..." : "초대 수락"}
              </button>
            </div>
          )}

          {/* State C — email mismatch */}
          {inviteState === "state-c" && (
            <div>
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                <p className="font-medium text-red-300 mb-1">
                  다른 이메일로 로그인됨
                </p>
                <p className="text-xs text-red-400/80">
                  이 초대는{" "}
                  <strong className="text-red-300">
                    {inviteInfo.inviteEmail}
                  </strong>
                  {" "}계정 전용입니다.
                  {sessionEmail && (
                    <>
                      {" "}현재{" "}
                      <strong className="text-red-300">{sessionEmail}</strong>으로
                      로그인되어 있습니다.
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={handleSwitchAccount}
                className="onboarding-btn mb-3"
              >
                {inviteInfo.inviteEmail} 계정으로 전환하기
              </button>
              <p className="text-xs text-zinc-400 text-center">
                계정 전환이 어려우신가요? 학원장에게 문의해주세요.
              </p>
            </div>
          )}

          {/* State D — already a member */}
          {inviteState === "state-d" && (
            <div>
              <div className="bg-accent/10 border border-amber-400/30 text-amber-300 px-4 py-3 rounded-lg text-sm mb-4">
                <p className="font-medium text-amber-200 mb-1">이미 멤버입니다</p>
                <p className="text-xs text-amber-300/80">
                  이 학원의 구성원으로 등록되어 있습니다.
                </p>
              </div>
              <button
                onClick={() => router.push("/schedule")}
                className="onboarding-btn"
              >
                학원으로 이동하기
              </button>
            </div>
          )}

          {/* Footer — expiry */}
          {inviteInfo.expiresAt && (
            <p className="text-xs text-zinc-500 mt-5 text-center">
              만료: {new Date(inviteInfo.expiresAt).toLocaleDateString("ko-KR")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
