"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

export interface ScheduleMeta {
  /** 마지막으로 sessions 테이블이 변경된 시각 (academies.schedule_updated_at). null이면 미로드. */
  scheduleUpdatedAt: string | null;
  /** 초기 fetch 진행 중 */
  isLoading: boolean;
  /** 사용자가 이 페이지를 마지막 본 시점 이후 schedule_updated_at이 새로 갱신됐는가. ScheduleChangeBanner 표시 조건. */
  hasChanges: boolean;
  /** banner 닫기 + lastViewedAt을 현재 시각으로 갱신. */
  acknowledgeChanges: () => void;
}

const lastViewedKey = (userId: string) =>
  `class_planner_${userId}_lastViewedAt_schedule`;

/**
 * 활성 academy의 schedule meta(갱신 시각)를 30초 polling으로 가져온다.
 * 다른 admin이 sessions를 변경하면 다음 polling tick에서 hasChanges=true가 됨.
 *
 * 탭이 백그라운드면 polling 정지 — 보이는 동안만 동기화 (학부모 share 페이지와 동일 패턴).
 *
 * @param userId Supabase user.id. null이면 hook은 idle 상태 (anonymous 또는 로그인 전).
 */
export function useScheduleMeta(userId: string | null): ScheduleMeta {
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 같은 timestamp에서 hasChanges 토글 반복 방지용
  const ackedTimestampRef = useRef<string | null>(null);

  const fetchMeta = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(
        `/api/academies/active/schedule-meta?userId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) return;
      const json = await res.json();
      const next = (json.scheduleUpdatedAt as string | null) ?? null;
      setScheduleUpdatedAt(next);
      if (typeof window === "undefined" || !next) return;
      const lastViewed = window.localStorage.getItem(lastViewedKey(userId));
      if (
        lastViewed &&
        new Date(next) > new Date(lastViewed) &&
        ackedTimestampRef.current !== next
      ) {
        setHasChanges(true);
      }
    } catch {
      // silent — stale 값 유지
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 초기 진입 — lastViewedAt 초기화 + 즉시 fetch
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    if (typeof window !== "undefined") {
      const key = lastViewedKey(userId);
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, new Date().toISOString());
      }
    }
    void fetchMeta();
  }, [userId, fetchMeta]);

  // 폴링 (visibility gate)
  useEffect(() => {
    if (!userId) return;
    function tick() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void fetchMeta();
    }
    pollerRef.current = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [userId, fetchMeta]);

  const acknowledgeChanges = useCallback(() => {
    if (!userId || typeof window === "undefined") return;
    window.localStorage.setItem(lastViewedKey(userId), new Date().toISOString());
    if (scheduleUpdatedAt) ackedTimestampRef.current = scheduleUpdatedAt;
    setHasChanges(false);
  }, [userId, scheduleUpdatedAt]);

  return { scheduleUpdatedAt, isLoading, hasChanges, acknowledgeChanges };
}
