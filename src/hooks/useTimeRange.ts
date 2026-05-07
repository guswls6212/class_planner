"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Session } from "../lib/planner";

export type TimeRangeMode = "default" | "auto" | "custom";

export interface TimeRange {
  startHour: number;
  endHour: number;
  mode: TimeRangeMode;
}

export interface StoredTimeRange {
  mode: TimeRangeMode;
  startHour?: number;
  endHour?: number;
}

interface UseTimeRangeOptions {
  sessions?: Session[];
  userId?: string | null;
}

export const DEFAULT_TIME_RANGE: TimeRange = {
  startHour: 9,
  endHour: 23,
  mode: "default",
};

const AUTO_FALLBACK: TimeRange = {
  startHour: 9,
  endHour: 18,
  mode: "auto",
};

const STORAGE_KEY_PREFIX = "class_planner_";
const STORAGE_KEY_SUFFIX = "_time_range";

export function timeRangeStorageKey(userId: string | null): string {
  const id = userId ?? "anonymous";
  return `${STORAGE_KEY_PREFIX}${id}${STORAGE_KEY_SUFFIX}`;
}

export function useTimeRange(options: UseTimeRangeOptions = {}): TimeRange {
  const { sessions = [], userId = null } = options;
  const searchParams = useSearchParams();
  const queryValue = searchParams?.get("range") ?? null;

  return useMemo(
    () => resolveTimeRange({ queryValue, sessions, userId }),
    [queryValue, sessions, userId],
  );
}

interface ResolveInput {
  queryValue: string | null;
  sessions: Session[];
  userId: string | null;
}

export function resolveTimeRange({
  queryValue,
  sessions,
  userId,
}: ResolveInput): TimeRange {
  // 1. URL query (preview/debug)
  if (queryValue) {
    if (queryValue === "auto") return computeAutoRange(sessions);
    if (queryValue === "default") return DEFAULT_TIME_RANGE;
    const parsed = parseRangeString(queryValue);
    if (parsed) return parsed;
  }

  // 2. localStorage user setting
  const stored = readStoredRange(userId);
  if (stored) {
    if (stored.mode === "default") return DEFAULT_TIME_RANGE;
    if (stored.mode === "auto") return computeAutoRange(sessions);
    if (
      stored.mode === "custom" &&
      isValidHour(stored.startHour) &&
      isValidHour(stored.endHour) &&
      stored.startHour < stored.endHour
    ) {
      return {
        startHour: stored.startHour,
        endHour: stored.endHour,
        mode: "custom",
      };
    }
  }

  // 3. BC: 미설정 사용자는 default 9-23
  return DEFAULT_TIME_RANGE;
}

function readStoredRange(userId: string | null): StoredTimeRange | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(timeRangeStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "mode" in parsed &&
      ((parsed as StoredTimeRange).mode === "default" ||
        (parsed as StoredTimeRange).mode === "auto" ||
        (parsed as StoredTimeRange).mode === "custom")
    ) {
      return parsed as StoredTimeRange;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredRange(
  userId: string | null,
  value: StoredTimeRange,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      timeRangeStorageKey(userId),
      JSON.stringify(value),
    );
  } catch {
    // 무시
  }
}

function parseRangeString(value: string): TimeRange | null {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(value);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!isValidHour(start) || !isValidHour(end) || start >= end) return null;
  return { startHour: start, endHour: end, mode: "custom" };
}

function isValidHour(h: unknown): h is number {
  return (
    typeof h === "number" && Number.isInteger(h) && h >= 0 && h <= 24
  );
}

export function computeAutoRange(sessions: Session[]): TimeRange {
  if (sessions.length === 0) return AUTO_FALLBACK;

  let minStart = 24;
  let maxEnd = 0;
  for (const s of sessions) {
    const startH = parseHourFloat(s.startsAt);
    const endH = parseHourFloat(s.endsAt);
    if (startH !== null && startH < minStart) minStart = startH;
    if (endH !== null && endH > maxEnd) maxEnd = endH;
  }
  if (minStart === 24 || maxEnd === 0) return AUTO_FALLBACK;

  const startHour = Math.max(0, Math.floor(minStart) - 1);
  const endHour = Math.min(24, Math.ceil(maxEnd) + 1);
  if (startHour >= endHour) return AUTO_FALLBACK;

  return { startHour, endHour, mode: "auto" };
}

function parseHourFloat(t: string | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{1,2})/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const mn = Number(m[2]);
  if (!Number.isFinite(h)) return null;
  return h + (Number.isFinite(mn) ? mn / 60 : 0);
}
