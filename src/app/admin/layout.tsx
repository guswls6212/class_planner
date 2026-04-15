"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getAccessToken } from "../../lib/authUtils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const token = await getAccessToken();

      if (!token) {
        if (!cancelled) router.push("/");
        return;
      }

      // Ping the logs API to verify developer access
      // limit=0은 API에서 1로 클램핑되므로 limit=1로 전송 (인증 확인 전용)
      const res = await fetch("/api/admin/logs?limit=1&offset=0", {
        headers: { Authorization: `Bearer ${token}` },
      });

      await res.text(); // 응답 body 소비 (keep-alive 연결 스트림 방지)

      if (cancelled) return;

      if (res.status === 403) {
        router.push("/");
        return;
      }

      if (res.ok) {
        setAuthorized(true);
      } else {
        // Unexpected error — redirect to home
        router.push("/");
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
