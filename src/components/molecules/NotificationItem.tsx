"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  isTrackable,
  type NotificationEntry,
  type NotificationLevel,
} from "@/lib/notificationCenter";

interface LevelStyle {
  chip: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
}

const LEVEL_STYLES: Record<NotificationLevel, LevelStyle> = {
  error: {
    chip: "bg-red-500/15 text-red-300 border-red-500/30",
    label: "에러",
    icon: AlertCircle,
    iconColor: "text-red-400",
  },
  warning: {
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    label: "경고",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
  },
  success: {
    chip: "bg-green-500/15 text-green-300 border-green-500/30",
    label: "성공",
    icon: CheckCircle2,
    iconColor: "text-green-400",
  },
  info: {
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    label: "정보",
    icon: Info,
    iconColor: "text-sky-400",
  },
};

function formatRelative(now: number, createdAt: number): string {
  const diff = Math.max(0, now - createdAt);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function formatAbsolute(createdAt: number): string {
  const d = new Date(createdAt);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface NotificationItemProps {
  entry: NotificationEntry;
  now: number;
  onMarkRead: () => void;
  onDismiss: () => void;
}

export function NotificationItem({ entry, now, onMarkRead, onDismiss }: NotificationItemProps) {
  const s = LEVEL_STYLES[entry.level];
  const Icon = s.icon;
  const showNew = !entry.read && isTrackable(entry.level);
  const relative = formatRelative(now, entry.createdAt);
  const absolute = formatAbsolute(entry.createdAt);

  return (
    <div
      className={`group relative w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--color-overlay-light)] rounded-admin-md transition-colors ${
        showNew ? "bg-[var(--color-overlay-light)]/40" : ""
      }`}
    >
      {showNew && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-amber-400"
        />
      )}

      <button
        type="button"
        onClick={onMarkRead}
        aria-pressed={entry.read}
        className="flex-1 flex items-start gap-3 text-left min-w-0"
      >
        <Icon size={16} className={`mt-0.5 ${s.iconColor} flex-shrink-0`} strokeWidth={2.2} />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-snug line-clamp-2 ${
              showNew
                ? "text-[var(--color-text-primary)] font-medium"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            {entry.message}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${s.chip}`}>{s.label}</span>
            <span className="text-[11px] text-[var(--color-text-muted)]" title={absolute}>
              {relative}
            </span>
            {showNew && (
              <span className="text-[10px] text-amber-400 font-semibold">NEW</span>
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="이 알림 제거"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] self-start mt-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}
