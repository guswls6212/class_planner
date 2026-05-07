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
 * SSR-safe — 첫 렌더는 storage 미참조로 default 반환. mount 후 useEffect로
 * localStorage read 후 state update. Hydration mismatch 방지.
 */
export function useScheduleLayout(): ScheduleLayoutState {
  const searchParams = useSearchParams();
  const [storedVariant, setStoredVariant] =
    useState<ScheduleLayoutVariant | null>(null);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (value === "p3") setStoredVariant("p3");
      else setStoredVariant("default");
    } catch {
      setStoredVariant("default");
    }
  }, []);

  const variant: ScheduleLayoutVariant = useMemo(() => {
    const fromQuery = searchParams?.get(QUERY_KEY);
    if (fromQuery === "p3") return "p3";
    if (fromQuery === "default") return "default";
    return storedVariant ?? "default";
  }, [searchParams, storedVariant]);

  return { variant, isP3: variant === "p3" };
}

export function setScheduleLayoutPreference(variant: ScheduleLayoutVariant): void {
  if (typeof window === "undefined") return;
  try {
    if (variant === "default") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, variant);
    }
  } catch {
    // localStorage 차단 — 무시
  }
}
