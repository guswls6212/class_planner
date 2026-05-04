"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SELF_SYNC_STORAGE_KEY, subscribeSelfSync } from "@/lib/apiSync";

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

/**
 * 24시간 이상 묵힌 변경은 stale로 자동 ack — page reload 후에도 토스트 발화 방지.
 *
 * 시나리오: 어제 사용자가 변경 → server schedule_updated_at = 어제. 오늘 페이지를
 * 새로 열면 lastViewedAt이 어제보다 더 옛날일 수 있음(또는 reload 직후 ref가 0).
 * 24h 이상 차이면 사용자에게 알릴 가치 없음(이미 봤거나 더 최신 변경 곧 옴).
 */
const STALE_CHANGE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

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
   * 본인이 마지막으로 sync 발사한 시각 (epoch ms).
   *
   * 갱신 경로:
   *   1) apiSync.onSyncSuccess가 같은 탭 EventTarget으로 self-sync 이벤트 dispatch
   *   2) apiSync가 SELF_SYNC_STORAGE_KEY localStorage write → 다른 탭은 storage event로 받음
   *   3) mount 시 SELF_SYNC_STORAGE_KEY localStorage 값 fallback (page reload 직후 ref가
   *      0이라도 이전 세션 self-sync 시각 복구)
   *
   * Polling 결과 server timestamp가 이 시점 +SELF_SYNC_WINDOW_MS 이내면 본인 변경으로
   * 판단 → 토스트 발화 안 함.
   */
  const lastSelfSyncAtRef = useRef<number>(0);

  // (1) 같은 탭 self-sync 이벤트 구독
  useEffect(() => {
    const unsubscribe = subscribeSelfSync(() => {
      lastSelfSyncAtRef.current = Date.now();
    });
    return unsubscribe;
  }, []);

  // (2) 다른 탭의 self-sync localStorage write를 storage event로 받음 + (3) mount 시 fallback
  useEffect(() => {
    if (typeof window === "undefined") return;
    // mount fallback — 페이지 reload 직후라도 이전 세션의 마지막 self-sync 시각 복구.
    // localStorage 접근이 실패할 수 있는 환경(SecurityError, QuotaExceededError 등)도
    // silent fallback — 본인 변경 감지는 best-effort.
    try {
      const stored = Number(
        window.localStorage.getItem(SELF_SYNC_STORAGE_KEY) ?? 0,
      );
      if (stored > 0) {
        lastSelfSyncAtRef.current = Math.max(lastSelfSyncAtRef.current, stored);
      }
    } catch {
      // 안전하게 무시
    }
    // storage event는 같은 탭에서는 안 발생, 같은 origin의 다른 탭에서만 발생
    const handler = (e: StorageEvent) => {
      if (e.key !== SELF_SYNC_STORAGE_KEY || !e.newValue) return;
      const ts = Number(e.newValue);
      if (Number.isFinite(ts) && ts > lastSelfSyncAtRef.current) {
        lastSelfSyncAtRef.current = ts;
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
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

      const serverTs = new Date(next).getTime();
      // (a) 본인 변경 자동 감지 — ref + localStorage 둘 다 검사 (탭 race / page reload race 보호)
      let fallbackSync = 0;
      try {
        fallbackSync = Number(
          window.localStorage.getItem(SELF_SYNC_STORAGE_KEY) ?? 0,
        );
      } catch {
        // localStorage 접근 실패 시 silent fallback (ref만 사용)
      }
      const effectiveSelfSync = Math.max(
        lastSelfSyncAtRef.current,
        Number.isFinite(fallbackSync) ? fallbackSync : 0,
      );
      if (
        effectiveSelfSync > 0 &&
        Math.abs(serverTs - effectiveSelfSync) <= SELF_SYNC_WINDOW_MS
      ) {
        // 본인 변경 → 자동 ack
        window.localStorage.setItem(lastViewedKey(userId), next);
        ackedTimestampRef.current = next;
        return;
      }

      const lastViewed = window.localStorage.getItem(lastViewedKey(userId));
      const lastViewedTs = lastViewed ? new Date(lastViewed).getTime() : 0;

      // (b) Stale 변경 자동 ack — 24시간 이상 묵힌 변경은 알릴 가치 없음.
      // page reload 후 lastSelfSyncAt이 0이고 server timestamp는 어제 시각인 경우 등
      // (사용자 보고: \"어제 변경했는데 오늘 페이지 열자마자 다른 관리자가 변경했다고 뜸\")
      if (lastViewedTs > 0 && serverTs - lastViewedTs > STALE_CHANGE_THRESHOLD_MS) {
        window.localStorage.setItem(lastViewedKey(userId), next);
        ackedTimestampRef.current = next;
        return;
      }

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
