"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type ScheduleLayoutVariant = "default" | "p3";

export interface ScheduleLayoutState {
  variant: ScheduleLayoutVariant;
  isP3: boolean;
}

const QUERY_KEY = "layout";
const STORAGE_KEY = "class_planner_schedule_layout";

/**
 * SSR-safe — 첫 렌더는 storage 미참조로 "p3" 반환 (new default). mount 후
 * useEffect로 localStorage read 후 state update. Hydration mismatch 방지.
 *
 * 우선순위: query > localStorage > "p3" (default).
 * P3는 ADR-010에서 default로 승격됨 (2026-05-08). "default" layout으로의 back-out은
 * `?layout=default` query 또는 localStorage에 'default' 저장으로 가능.
 */
export function useScheduleLayout(): ScheduleLayoutState {
  const searchParams = useSearchParams();
  const [storedVariant, setStoredVariant] =
    useState<ScheduleLayoutVariant | null>(null);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      // 'default'만 explicit opt-out으로 인정. 그 외(없음/p3/기타)는 새 기본값 'p3'.
      if (value === "default") setStoredVariant("default");
      else setStoredVariant("p3");
    } catch {
      setStoredVariant("p3");
    }
  }, []);

  const variant: ScheduleLayoutVariant = useMemo(() => {
    const fromQuery = searchParams?.get(QUERY_KEY);
    if (fromQuery === "default") return "default";
    if (fromQuery === "p3") return "p3";
    return storedVariant ?? "p3";
  }, [searchParams, storedVariant]);

  return { variant, isP3: variant === "p3" };
}

/**
 * Storage 의미 반전 (ADR-010): 이제 'default'가 explicit opt-out, 'p3'는 default라
 * 저장 불필요. 'p3' 저장 = removeItem (storage 깨끗) / 'default' 저장 = setItem.
 */
export function setScheduleLayoutPreference(variant: ScheduleLayoutVariant): void {
  if (typeof window === "undefined") return;
  try {
    if (variant === "p3") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, variant);
    }
  } catch {
    // localStorage 차단 — 무시
  }
}
