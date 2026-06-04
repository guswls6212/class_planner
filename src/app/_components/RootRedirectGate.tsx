"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// invite/[token]/page.tsx 가 OAuth 시작 직전에 set 하는 키 (PR 10 — Supabase Allowed
// Redirect URLs 미등록 시 callback 이 Site URL(=root) 로 fallback 하는 케이스 처리).
// root 가 일반 schedule redirect 전에 이 키를 확인해 invite 페이지로 우선 redirect.
const PENDING_INVITE_KEY = "pending_invite_token";

/**
 * 루트(`/`) 의 클라이언트 리다이렉트 게이트.
 *
 * 마케팅 콘텐츠는 SSR 로 항상 렌더(크롤러 색인용)하고, 로그인 사용자만 이 게이트가
 * 클라이언트에서 /schedule(또는 pending invite) 로 보낸다. 게이트 자체는 DOM 을
 * 그리지 않으므로(`null`) SSR↔클라 hydration mismatch 가 없다.
 */
export default function RootRedirectGate() {
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;

      // 우선순위 1 — OAuth callback fallback 처리(invite 흐름이 schedule 보다 우선).
      const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
      if (pendingInvite) {
        router.replace(`/invite/${encodeURIComponent(pendingInvite)}`);
        return;
      }

      const userId = localStorage.getItem("supabase_user_id");
      if (userId) {
        router.replace("/schedule");
      }
    };

    check();
    // 같은 탭에서 OAuth 로그인이 완료되는 케이스를 잡기 위한 폴링 + 로그아웃 이벤트.
    const interval = setInterval(check, 1000);
    window.addEventListener("userLoggedOut", check);

    return () => {
      clearInterval(interval);
      window.removeEventListener("userLoggedOut", check);
    };
  }, [router]);

  return null;
}
