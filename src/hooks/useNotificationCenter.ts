"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearAllNotifications,
  dismissNotification,
  getNotifications,
  isTrackable,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationEntry,
  subscribeNotifications,
} from "@/lib/notificationCenter";

export interface UseNotificationCenterResult {
  entries: NotificationEntry[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

/**
 * 현재 로그인된 사용자(또는 anonymous)의 알림 히스토리 hook.
 * - 자체 storage 이벤트 + cross-tab StorageEvent 둘 다 subscribe.
 * - userId 변경 시 (로그인/로그아웃/계정 전환) 자동 re-sync.
 */
export function useNotificationCenter(): UseNotificationCenterResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [entries, setEntries] = useState<NotificationEntry[]>(() =>
    typeof window === "undefined" ? [] : getNotifications(userId),
  );

  useEffect(() => {
    // userId 바뀐 직후 fresh sync (이전 사용자 entry가 잠깐 보이는 flash 방지)
    setEntries(getNotifications(userId));

    const unsub = subscribeNotifications(() => {
      setEntries(getNotifications(userId));
    });
    return unsub;
  }, [userId]);

  const unreadCount = useMemo(
    () => entries.filter((e) => !e.read && isTrackable(e.level)).length,
    [entries],
  );

  const markRead = useCallback(
    (id: string) => markNotificationRead(userId, id),
    [userId],
  );
  const markAllRead = useCallback(
    () => markAllNotificationsRead(userId),
    [userId],
  );
  const dismiss = useCallback(
    (id: string) => dismissNotification(userId, id),
    [userId],
  );
  const clearAll = useCallback(() => clearAllNotifications(userId), [userId]);

  return { entries, unreadCount, markRead, markAllRead, dismiss, clearAll };
}
