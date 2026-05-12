/**
 * Notification Center — 토스트 발생 기록을 ring buffer로 유지해 사용자가 사라진 알림을
 * 재조회할 수 있게 한다. localStorage 기반 (Phase 1, server 호출 없음).
 *
 * 보관 위치: localStorage["class_planner_${userId}_notification_history"]
 *           익명은 "class_planner_anonymous_notification_history"
 * 최대 항목: 50 (FIFO — oldest drop)
 * TTL: 24시간 (push/read 시 expired prune)
 *
 * 호출 진입점은 `src/lib/toast.ts`의 wrapper만 — sonner 직접 호출 우회 금지.
 * 상세 정책: `docs/notification-history-spec.md`.
 */

import { logger } from "./logger";

export type NotificationLevel = "error" | "warning" | "success" | "info";

export interface NotificationEntry {
  /** UUID v4 — entry 고유 식별자. */
  id: string;
  /** 토스트 level — UI 시각 그룹 결정. */
  level: NotificationLevel;
  /** 토스트 메시지 텍스트 (소비자가 본 그대로). */
  message: string;
  /** epoch ms. */
  createdAt: number;
  /** 사용자 읽음 여부. error/warning만 NEW 라벨에 반영. */
  read: boolean;
  /** (optional) 발생 시 라우트 URL — 디버깅 보조용. */
  contextUrl?: string;
}

const MAX_ENTRIES = 50;
const TTL_MS = 24 * 60 * 60 * 1000;
const ANONYMOUS_KEY = "class_planner_anonymous_notification_history";
const CHANGE_EVENT = "class-planner:notification-center:change";

/** NEW 라벨/배지 카운트 대상 — 에러/경고만 사용자 관심사로 추적. */
export function isTrackable(level: NotificationLevel): boolean {
  return level === "error" || level === "warning";
}

function storageKey(userId: string | null): string {
  if (!userId) return ANONYMOUS_KEY;
  return `class_planner_${userId}_notification_history`;
}

function readRaw(userId: string | null): NotificationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeRaw(userId: string | null, entries: NotificationEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch (err) {
    // QuotaExceededError 등은 silent — notification은 best-effort
    logger.error("notificationCenter 저장 실패", { userId: userId ?? undefined }, err as Error);
  }
}

function prune(entries: NotificationEntry[], now: number): NotificationEntry[] {
  const fresh = entries.filter((e) => now - e.createdAt < TTL_MS);
  // entries는 최신순(newest first) — 초과 시 가장 오래된(last) 항목부터 drop
  while (fresh.length > MAX_ENTRIES) fresh.pop();
  return fresh;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (SSR or older browsers — 충돌 가능성 매우 낮음)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 새 알림 1건 push. 최신순(unshift)으로 보관, 50개/24h 정책으로 prune.
 * push된 entry 반환 — 호출자가 id로 후속 retract 가능.
 */
export function pushNotification(
  userId: string | null,
  level: NotificationLevel,
  message: string,
  opts: { contextUrl?: string } = {},
): NotificationEntry {
  const entry: NotificationEntry = {
    id: generateId(),
    level,
    message,
    createdAt: Date.now(),
    read: false,
    contextUrl: opts.contextUrl,
  };

  const list = readRaw(userId);
  const next = prune([entry, ...list], entry.createdAt);
  writeRaw(userId, next);
  return entry;
}

/**
 * 현재 로그인된 사용자(또는 anonymous)의 알림 ring buffer에 push.
 * `lib/toast.ts`의 wrapper가 호출 — 호출자는 userId를 모르므로 localStorage의
 * `supabase_user_id`(handleLoginDataMigration/useGlobalDataInitialization이 저장)
 * 를 직접 읽어 결정한다.
 *
 * SSR 환경에서는 no-op (returns null).
 */
export function pushNotificationForCurrentUser(
  level: NotificationLevel,
  message: string,
  opts: { contextUrl?: string } = {},
): NotificationEntry | null {
  if (typeof window === "undefined") return null;
  const userId = window.localStorage.getItem("supabase_user_id");
  const contextUrl = opts.contextUrl ?? window.location.pathname;
  return pushNotification(userId, level, message, { contextUrl });
}

/** 현재 보관된 알림 전체. 최신순. 호출 시점 기준 24h+ entry는 prune. */
export function getNotifications(userId: string | null): NotificationEntry[] {
  const list = readRaw(userId);
  const pruned = prune(list, Date.now());
  // pruned 후 변화 있으면 writeback (idempotent)
  if (pruned.length !== list.length) {
    writeRaw(userId, pruned);
  }
  return pruned;
}

/** 단일 entry read 처리. 존재하지 않으면 no-op. */
export function markNotificationRead(userId: string | null, id: string): void {
  const list = readRaw(userId);
  let changed = false;
  const next = list.map((e) => {
    if (e.id === id && !e.read) {
      changed = true;
      return { ...e, read: true };
    }
    return e;
  });
  if (changed) writeRaw(userId, next);
}

/** 전체 entry read 처리. */
export function markAllNotificationsRead(userId: string | null): void {
  const list = readRaw(userId);
  if (list.every((e) => e.read)) return;
  const next = list.map((e) => (e.read ? e : { ...e, read: true }));
  writeRaw(userId, next);
}

/** 단일 entry 제거. dismiss 또는 undo retract용. */
export function dismissNotification(userId: string | null, id: string): void {
  const list = readRaw(userId);
  const next = list.filter((e) => e.id !== id);
  if (next.length !== list.length) writeRaw(userId, next);
}

/** 전체 entry 제거 (테스트/관리용 — UI에서 "모두 지우기"가 필요하면 사용). */
export function clearAllNotifications(userId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch (err) {
    logger.error("notificationCenter clear 실패", { userId: userId ?? undefined }, err as Error);
  }
}

/**
 * notification-center 변경 이벤트 구독. listener는 인자 없이 호출됨.
 * 반환된 함수 호출로 unsubscribe.
 *
 * 같은 탭의 push/read/dismiss뿐 아니라 다른 탭의 localStorage 변경도 listen
 * (Storage event는 same-tab dispatch 안 해서 CustomEvent로 자체 dispatch).
 */
export function subscribeNotifications(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => listener();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === null || e.key.endsWith("_notification_history")) listener();
  };

  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
