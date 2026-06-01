"use client";

/**
 * 클라이언트 mount 여부. SSR + 첫 클라이언트 렌더는 false → mount 후 true.
 * localStorage/window 의존 값(예: features.ts dev 모드)을 첫 렌더에서 배제해
 * hydration mismatch 를 회피하는 표준 패턴에 사용.
 */

import { useEffect, useState } from "react";

export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
