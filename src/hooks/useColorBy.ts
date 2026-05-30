"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * ColorByMode — session 본체 색의 결정 기준.
 *
 * ADR-020 (2026-05-21) 이후 "student" 는 deprecated. selector 에서 제거됐고,
 * localStorage 에 저장된 "student" 값은 마이그레이션으로 "subject" 로 교체.
 * type 자체는 호환을 위해 union 에 남아있되, 신규 호출처는 "subject" | "teacher" 만 사용.
 */
export type ColorByMode = "subject" | "student" | "teacher";

const STORAGE_KEY = "ui:colorBy";
const DEFAULT_MODE: ColorByMode = "subject";

/** ADR-020 R5: "student" 가 더 이상 사용되지 않으므로 저장된 값도 subject 로 변환. */
function migrateStoredMode(raw: string | null): ColorByMode {
  if (raw === "subject" || raw === "teacher") return raw;
  // "student" 또는 알 수 없는 값 → subject
  return DEFAULT_MODE;
}

export function useColorBy() {
  const [colorBy, setColorByState] = useState<ColorByMode>(DEFAULT_MODE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const migrated = migrateStoredMode(stored);
      setColorByState(migrated);
      // 마이그레이션 발생 시 storage 도 갱신 (다음 진입 부터 일관)
      if (stored !== migrated) {
        localStorage.setItem(STORAGE_KEY, migrated);
      }
    } catch {
      // localStorage unavailable (SSR)
    }
  }, []);

  const setColorBy = useCallback((mode: ColorByMode) => {
    // ADR-020: "student" 입력은 무시하고 subject 로 정규화
    const normalized: ColorByMode = mode === "student" ? "subject" : mode;
    setColorByState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { colorBy, setColorBy };
}
