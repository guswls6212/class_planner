"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// invite/[token]/page.tsx 가 OAuth 시작 직전에 set 하는 키 (PR 10 — Supabase Allowed
// Redirect URLs 미등록 시 callback 이 Site URL(=root) 로 fallback 하는 케이스 처리).
// root 가 일반 schedule redirect 전에 이 키를 확인해 invite 페이지로 우선 redirect.
const PENDING_INVITE_KEY = "pending_invite_token";

// 로그인 진입 직전에 set 하는 1회성 신호(sessionStorage — OAuth 왕복·탭 단위 보존).
// 이 신호가 있을 때만 루트가 작업공간으로 자동 이동한다. login/page.tsx 가 set, 게이트가 소비.
const JUST_LOGGED_IN_KEY = "cp_just_logged_in";

/**
 * 루트(`/`) 의 클라이언트 게이트.
 *
 * `/` 는 **모두의 랜딩**(SSR, 크롤러 색인). 자동 이동은 **로그인 직후**(JUST_LOGGED_IN_KEY)
 * 또는 pending invite 일 때만. 이미 로그인된 재방문자(끈적한 `supabase_user_id` 마커만 있음)는
 * 랜딩을 그대로 보고 "내 시간표로 가기" 바로가기만 노출한다 — 마커만으로 강제 이동하지 않는다
 * (랜딩·FAQ 접근성, ADR-025). SSR·첫 클라 렌더에서 null → mount 후에만 바로가기(hydration 0).
 */
export default function RootRedirectGate() {
  const router = useRouter();
  const [showAppLink, setShowAppLink] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;

      // 우선순위 1 — OAuth callback fallback(invite 흐름이 우선).
      const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
      if (pendingInvite) {
        router.replace(`/invite/${encodeURIComponent(pendingInvite)}`);
        return;
      }

      const userId = localStorage.getItem("supabase_user_id");
      const justLoggedIn = sessionStorage.getItem(JUST_LOGGED_IN_KEY);

      // 로그인 "직후" 에만 작업공간으로 자동 이동(1회성 신호 소비).
      if (userId && justLoggedIn) {
        sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
        router.replace("/schedule");
        return;
      }

      // 재방문 로그인 사용자: 랜딩 유지 + 바로가기만 노출.
      setShowAppLink(Boolean(userId));
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

  if (!showAppLink) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-admin-ink px-4 py-2 text-center text-sm text-white">
      <span className="text-[--color-text-muted]">이미 로그인되어 있어요</span>
      <Link
        href="/schedule"
        className="inline-flex items-center gap-1 rounded-admin-md bg-accent px-3 py-1 font-semibold text-admin-ink transition-colors hover:bg-accent-hover"
      >
        내 시간표로 가기 →
      </Link>
    </div>
  );
}
