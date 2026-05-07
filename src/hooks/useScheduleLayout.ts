"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export type ScheduleLayoutVariant = "default" | "p3";

export interface ScheduleLayoutState {
  variant: ScheduleLayoutVariant;
  isP3: boolean;
}

const QUERY_KEY = "layout";
const STORAGE_KEY = "class_planner_schedule_layout";

export function useScheduleLayout(): ScheduleLayoutState {
  const searchParams = useSearchParams();

  const variant: ScheduleLayoutVariant = useMemo(() => {
    const fromQuery = searchParams?.get(QUERY_KEY);
    if (fromQuery === "p3") return "p3";
    if (fromQuery === "default") return "default";

    if (typeof window !== "undefined") {
      try {
        const fromStorage = window.localStorage.getItem(STORAGE_KEY);
        if (fromStorage === "p3") return "p3";
      } catch {
        // localStorage 접근 차단 (private mode 등) — fallthrough
      }
    }
    return "default";
  }, [searchParams]);

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
