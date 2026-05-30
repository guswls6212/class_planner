"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNotificationCenter } from "@/hooks/useNotificationCenter";
import type { NotificationEntry, NotificationLevel } from "@/lib/notificationCenter";
import {
  NotificationBell,
  type NotificationBellSize,
} from "@/components/atoms/NotificationBell";
import { NotificationItem } from "@/components/molecules/NotificationItem";

type Filter = "all" | NotificationLevel;

const FILTER_OPTIONS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "error", label: "에러" },
  { key: "warning", label: "경고" },
  { key: "success", label: "성공" },
  { key: "info", label: "정보" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function groupByDay(entries: NotificationEntry[], now: number): { label: string; items: NotificationEntry[] }[] {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart.getTime() - DAY_MS;

  const today: NotificationEntry[] = [];
  const yesterday: NotificationEntry[] = [];
  const earlier: NotificationEntry[] = [];

  for (const e of entries) {
    if (e.createdAt >= todayStart.getTime()) today.push(e);
    else if (e.createdAt >= yesterdayStart) yesterday.push(e);
    else earlier.push(e);
  }

  const groups: { label: string; items: NotificationEntry[] }[] = [];
  if (today.length) groups.push({ label: "오늘", items: today });
  if (yesterday.length) groups.push({ label: "어제", items: yesterday });
  if (earlier.length) groups.push({ label: "이전", items: earlier });
  return groups;
}

interface NotificationDropdownProps {
  /** 모바일 TopBar에서 호출 시 컴팩트 사이즈 + 패널 anchor를 하단으로. */
  compact?: boolean;
  /**
   * Sidebar에서 trigger 사이즈 override. compact가 true면 무시(`sm` 강제).
   * - "md": Sidebar expanded — 학원 이름 옆 inline
   * - "nav": Sidebar collapsed — nav menu item과 동일 크기
   */
  size?: NotificationBellSize;
}

export function NotificationDropdown({ compact, size }: NotificationDropdownProps) {
  const { entries, unreadCount, markRead, markAllRead, dismiss } =
    useNotificationCenter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(() => Date.now());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 패널 열리는 동안 1분마다 relative time refresh
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [open]);

  // Outside click & ESC 닫기
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const filtered = useMemo(
    () => entries.filter((e) => filter === "all" || e.level === filter),
    [entries, filter],
  );

  const groups = useMemo(() => groupByDay(filtered, now), [filtered, now]);

  const errorCount = filtered.filter((e) => e.level === "error" && !e.read).length;
  const warnCount = filtered.filter((e) => e.level === "warning" && !e.read).length;

  return (
    <div className="relative inline-block">
      <NotificationBell
        ref={triggerRef}
        unread={unreadCount}
        pulse={unreadCount > 0}
        onClick={() => setOpen((v) => !v)}
        active={open}
        size={compact ? "sm" : (size ?? "md")}
      />

      {open && (
        <div
          ref={panelRef}
          role="region"
          aria-label="알림 히스토리"
          aria-live="polite"
          className={`absolute z-[60] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-admin-lg shadow-admin-lg flex flex-col ${
            compact
              ? "right-0 top-full mt-2 w-[calc(100vw-32px)] max-w-[420px]"
              : "left-full top-0 ml-2 w-[420px]"
          }`}
          style={{ maxHeight: "480px" }}
        >
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">알림</span>
              {(errorCount + warnCount > 0) && (
                <span className="text-[11px] mt-0.5">
                  {errorCount > 0 && <span className="text-red-300">에러 {errorCount}</span>}
                  {errorCount > 0 && warnCount > 0 && (
                    <span className="text-[var(--color-text-muted)] mx-1">·</span>
                  )}
                  {warnCount > 0 && <span className="text-amber-300">경고 {warnCount}</span>}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                disabled={unreadCount === 0}
              >
                모두 읽음
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="알림 패널 닫기"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map((o) => {
                const active = filter === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setFilter(o.key)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      active
                        ? "bg-amber-500/20 text-amber-200 border-amber-500/50"
                        : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
                <Bell size={28} className="text-[var(--color-text-muted)] mb-2 opacity-60" strokeWidth={1.5} />
                <span className="text-sm">알림이 없습니다</span>
                <span className="text-[11px] mt-1 opacity-70">새 알림이 발생하면 여기에 표시됩니다</span>
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.label} className="mb-1">
                  <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-medium">
                    {g.label}
                  </div>
                  {g.items.map((entry) => (
                    <NotificationItem
                      key={entry.id}
                      entry={entry}
                      now={now}
                      onMarkRead={() => markRead(entry.id)}
                      onDismiss={() => dismiss(entry.id)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {filtered.length > 0 && (
            <div className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-text-muted)] text-center">
              총 {filtered.length}건 · 24시간 이내 · 최대 50개 보관
            </div>
          )}
        </div>
      )}
    </div>
  );
}
