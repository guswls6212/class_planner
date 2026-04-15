"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
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
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // token 파라미터 추출
  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  // 초대 정보 + 로그인 상태 로드
  useEffect(() => {
    if (!token) return;

    const init = async () => {
      setIsLoading(true);
      try {
        const [inviteRes, sessionData] = await Promise.all([
          fetch(`/api/invites/check?token=${token}`).then((r) => r.json()),
          supabase.auth.getSession(),
        ]);

        setInvite(inviteRes);
        if (sessionData.data.session?.user.id) {
          setUserId(sessionData.data.session.user.id);
        }

        // OAuth 리다이렉트 후 자동 수락 체크
        const pendingToken = localStorage.getItem(PENDING_INVITE_KEY);
        if (pendingToken === token && sessionData.data.session?.user.id) {
          localStorage.removeItem(PENDING_INVITE_KEY);
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [token]);

  const handleLogin = async (provider: "google" | "kakao") => {
    if (!token) return;
    localStorage.setItem(PENDING_INVITE_KEY, token);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/invite/${token}` },
    });
  };

  const handleAccept = async () => {
    if (!userId || !token) return;
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/invites/accept?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        logger.info("초대 수락 완료", { academyId: data.academyId });
        router.push("/schedule");
      } else {
        setAcceptError(data.error?.message || "초대 수락에 실패했습니다.");
      }
    } catch {
      setAcceptError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">초대 정보를 확인하는 중...</p>
      </div>
    );
  }

  if (!invite) return null;

  const isInvalid = !invite.valid;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", minHeight: "calc(100vh - 60px)" }}
    >
      <div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl">
        {isInvalid ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {invite.reason === "expired"
                ? "만료된 초대 링크"
                : invite.reason === "used"
                ? "이미 사용된 초대 링크"
                : "유효하지 않은 초대 링크"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {invite.reason === "expired"
                ? "7일이 지난 초대 링크입니다. 새로운 초대 링크를 요청하세요."
                : invite.reason === "used"
                ? "이미 사용된 초대 링크입니다."
                : "초대 링크가 올바르지 않습니다."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              홈으로 이동
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">학원 초대</h2>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{invite.academyName}</strong>에서
            </p>
            <span className="inline-block bg-purple-100 text-purple-700 text-sm px-3 py-0.5 rounded-full mb-6">
              {ROLE_LABEL[invite.role ?? ""] ?? invite.role} 역할
            </span>
            <p className="text-sm text-gray-500 mb-6">로 초대했습니다</p>

            {!userId ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">초대를 수락하려면 먼저 로그인하세요</p>
                </div>
                <button
                  onClick={() => handleLogin("google")}
                  className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 mb-2 flex items-center justify-center gap-2"
                >
                  <span>🔵</span> Google로 로그인
                </button>
              </>
            ) : (
              <>
                {acceptError && (
                  <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                    {acceptError}
                  </div>
                )}
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 mb-2"
                >
                  {isAccepting ? "수락 중..." : "초대 수락하기"}
                </button>
              </>
            )}

            <p className="text-xs text-gray-400 mt-2">
              만료: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString("ko-KR") : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
