"use client";

import React from "react";
import { supabase } from "../../utils/supabaseClient";
import { logger } from "../../lib/logger";

interface LoginButtonProps {
  className?: string;
}

const LoginButton: React.FC<LoginButtonProps> = ({ className }) => {
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      alert("로그인 기능이 설정되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/students` },
    });
    if (error) {
      logger.error("Google 로그인 에러:", undefined, error as Error);
    }
  };

  return (
    <button
      className={`flex cursor-pointer items-center gap-2 rounded-xl border-none bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to px-[18px] py-2.5 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(102,126,234,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] active:translate-y-0 ${className ?? ""}`}
      onClick={handleGoogleLogin}
      title="로그인"
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10,17 15,12 10,7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      로그인
    </button>
  );
};

export default LoginButton;
