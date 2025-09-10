import { useEffect, useState } from "react";

export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial); // SSR 안전성을 위해 초기값 사용
  const [isHydrated, setIsHydrated] = useState(false);

  // 클라이언트에서만 localStorage 접근
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // localStorage 접근 실패 시 초기값 유지
    }
    setIsHydrated(true);
  }, [key]);

  // 클라이언트에서만 localStorage에 저장
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // localStorage 저장 실패 시 무시
      }
    }
  }, [key, value, isHydrated]);

  return [value, setValue] as const;
}
