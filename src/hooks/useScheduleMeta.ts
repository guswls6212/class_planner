"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeSelfSync } from "@/lib/apiSync";

const POLL_INTERVAL_MS = 30_000;
/**
 * 본인 sync 발사 후 server timestamp가 이 시간 이내에 들어오면 "본인 변경"으로 판단.
 * Network latency + retry + DB trigger lag을 충분히 커버하면서, 다른 admin이 같은
 * 윈도우 안에 변경했을 가능성은 매우 낮은 값.
 *
 * (참고) 다른 admin이 본인 sync 직후 10초 안에 변경하면 그 변경은 banner로 못 잡고
 * 다음 변경 시 잡힘 — 빈도 매우 낮은 edge case라 수용.
 */
const SELF_SYNC_WINDOW_MS = 10_000;

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
  /**
   * 본인이 마지막으로 sync 발사한 시각 (epoch ms). apiSync.onSyncSuccess에서
   * dispatch되는 selfSync 이벤트로 갱신. polling 결과의 server timestamp가
   * 이 시점 +SELF_SYNC_WINDOW_MS 이내면 본인 변경으로 판단 → banner 발화 안 함.
   */
  const lastSelfSyncAtRef = useRef<number>(0);

  // apiSync.onSyncSuccess가 발사하는 selfSync 이벤트 구독
  useEffect(() => {
    const unsubscribe = subscribeSelfSync(() => {
      lastSelfSyncAtRef.current = Date.now();
    });
    return unsubscribe;
  }, []);

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

      // ⚠️ 본인 변경 자동 감지 (2026-05-04): server timestamp가 본인 마지막 sync
      // 발사 시점의 윈도우 안이면 본인 변경으로 판단 → 자동 ack (lastViewedAt 갱신 +
      // hasChanges 발화 안 함). 멀티 admin 환경에서 본인 변경에도 banner가 뜨던
      // 사용자 보고 회귀 fix.
      const serverTs = new Date(next).getTime();
      if (
        lastSelfSyncAtRef.current > 0 &&
        Math.abs(serverTs - lastSelfSyncAtRef.current) <= SELF_SYNC_WINDOW_MS
      ) {
        // 본인 변경 → 자동 ack
        window.localStorage.setItem(lastViewedKey(userId), next);
        ackedTimestampRef.current = next;
        return;
      }

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
