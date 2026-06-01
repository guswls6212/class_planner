"use client";

/**
 * 숨김 처리된 기능의 route 직접 진입 시 /schedule-v2 로 redirect (features.ts gated).
 * 개발자(?dev=1 또는 localStorage cp:show-hidden=1)는 isHidden=false → 그대로 표시.
 *
 * 사용: 페이지 컴포넌트 최상단에서
 *   const hidden = useHiddenRedirect("attendance");
 *   if (hidden) return null;
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isHidden, type FeatureKey } from "@/config/features";

export function useHiddenRedirect(feature: FeatureKey): boolean {
  const router = useRouter();
  const hidden = isHidden(feature);
  useEffect(() => {
    if (hidden) router.replace("/schedule-v2");
  }, [hidden, router]);
  return hidden;
}
