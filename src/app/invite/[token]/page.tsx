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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-5">
        <p className="text-slate-400 text-sm">초대 정보를 확인하는 중...</p>
      </div>
    );
  }

  if (inviteState === "invalid" || !inviteInfo) {
    const reason = inviteInfo?.reason;
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-5">
        <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            {reason === "expired"
              ? "만료된 초대 링크"
              : reason === "used"
              ? "이미 사용된 초대 링크"
              : "유효하지 않은 초대 링크"}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {reason === "expired"
              ? "7일이 지난 초대 링크입니다. 학원장에게 새로운 초대를 요청하세요."
              : reason === "used"
              ? "이미 사용된 초대 링크입니다."
              : "초대 링크가 올바르지 않습니다."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600 transition-colors"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  const roleLabel =
    ROLE_LABEL[inviteInfo.role ?? ""] ?? inviteInfo.role ?? "구성원";

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-5">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎓</div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">학원 초대</h2>
          {inviteInfo.teacherName ? (
            <p className="text-sm text-slate-300">
              <strong className="text-slate-100">{inviteInfo.academyName}</strong>의
              강사{" "}
              <strong className="text-slate-100">
                {inviteInfo.teacherName}
              </strong>
              으로 초대되었습니다
            </p>
          ) : (
            <p className="text-sm text-slate-300">
              <strong className="text-slate-100">{inviteInfo.academyName}</strong>
              에서{" "}
              <span className="inline-block bg-purple-900/40 text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                {roleLabel}
              </span>{" "}
              역할로 초대했습니다
            </p>
          )}
        </div>

        {/* Error banner (shared) */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-2.5 rounded-lg text-sm mb-4">
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
                  className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-500 transition-colors mb-3"
                >
                  Google로 가입하기
                </button>
                <button
                  onClick={handleShareLinkOnly}
                  disabled={shareLinkLoading}
                  className="w-full py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  {shareLinkLoading
                    ? "링크 생성 중..."
                    : "시간표 보기 링크만 받기 →"}
                </button>
              </>
            ) : (
              <div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mb-3">
                  <p className="text-xs text-slate-400 mb-1.5">시간표 공유 링크</p>
                  <p className="text-xs text-slate-200 break-all font-mono">
                    {shareUrl}
                  </p>
                </div>
                <button
                  onClick={handleCopyShareUrl}
                  className="w-full py-2.5 bg-slate-700 text-slate-100 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
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
              <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-lg text-sm mb-4">
                <strong className="text-emerald-200">{inviteInfo.inviteEmail}</strong>
                {" "}계정으로 로그인됨
              </div>
            )}
            <button
              onClick={handleAccept}
              disabled={inviteState === "accepting"}
              className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {inviteState === "accepting" ? "수락 중..." : "초대 수락"}
            </button>
          </div>
        )}

        {/* State C — email mismatch */}
        {inviteState === "state-c" && (
          <div>
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
              <p className="font-medium text-red-200 mb-1">
                다른 이메일로 로그인됨
              </p>
              <p className="text-xs text-red-300/80">
                이 초대는{" "}
                <strong className="text-red-200">
                  {inviteInfo.inviteEmail}
                </strong>
                {" "}계정 전용입니다.
                {sessionEmail && (
                  <>
                    {" "}현재{" "}
                    <strong className="text-red-200">{sessionEmail}</strong>으로
                    로그인되어 있습니다.
                  </>
                )}
              </p>
            </div>
            <button
              onClick={handleSwitchAccount}
              className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-500 transition-colors mb-3"
            >
              {inviteInfo.inviteEmail} 계정으로 전환하기
            </button>
            <p className="text-xs text-slate-400 text-center">
              계정 전환이 어려우신가요? 학원장에게 문의해주세요.
            </p>
          </div>
        )}

        {/* State D — already a member */}
        {inviteState === "state-d" && (
          <div>
            <div className="bg-purple-900/30 border border-purple-800 text-purple-300 px-4 py-3 rounded-lg text-sm mb-4">
              <p className="font-medium text-purple-200 mb-1">이미 멤버입니다</p>
              <p className="text-xs text-purple-300/80">
                이 학원의 구성원으로 등록되어 있습니다.
              </p>
            </div>
            <button
              onClick={() => router.push("/schedule")}
              className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-500 transition-colors"
            >
              학원으로 이동하기
            </button>
          </div>
        )}

        {/* Footer — expiry */}
        {inviteInfo.expiresAt && (
          <p className="text-xs text-slate-500 mt-5 text-center">
            만료: {new Date(inviteInfo.expiresAt).toLocaleDateString("ko-KR")}
          </p>
        )}
      </div>
    </div>
  );
}
