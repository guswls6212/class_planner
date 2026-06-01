"use client";

/**
 * 숨김 처리된 기능의 route 직접 진입 시 /schedule-v2 로 redirect (features.ts gated).
 * 개발자(?dev=1 또는 localStorage cp:show-hidden=1)는 isHidden=false → 그대로 표시.
 *
 * SSR-safe: SSR + 첫 클라이언트 렌더는 정적 설정값(dev 무시)을 써 서버와 일치(hydration
 * mismatch 회피). dev 모드 반영 + redirect 판단은 mount 이후에만.
 *
 * 사용: 페이지 컴포넌트 최상단에서
 *   const hidden = useHiddenRedirect("attendance");
 *   if (hidden) return null;
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { featureVisibleStatic, isHidden, type FeatureKey } from "@/config/features";

export function useHiddenRedirect(feature: FeatureKey): boolean {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 첫 렌더: 정적 설정값(dev 무시) → SSR 과 일치. mount 후: dev 모드 반영.
  const hidden = mounted ? isHidden(feature) : !featureVisibleStatic(feature);

  useEffect(() => {
    // redirect 는 mount 후 dev-반영 값으로만 — 개발자(?dev=1) 접근 시 redirect 안 함.
    if (mounted && isHidden(feature)) router.replace("/schedule-v2");
  }, [mounted, feature, router]);

  return hidden;
}
