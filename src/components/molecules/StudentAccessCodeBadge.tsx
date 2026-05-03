"use client";

import type { AccessCodeEntry } from "../../hooks/useAccessCodes";

interface StudentAccessCodeBadgeProps {
  code: AccessCodeEntry;
  /** Visual variant — inline (list row) or large (detail panel) */
  variant?: "inline" | "large";
}

function getDaysLeft(expiresAt: string): number {
  return Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

export function StudentAccessCodeBadge({
  code,
  variant = "inline",
}: StudentAccessCodeBadgeProps) {
  const daysLeft = getDaysLeft(code.expires_at);
  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;

  const colorClass = isExpired
    ? "text-red-500"
    : isExpiringSoon
      ? "text-orange-400"
      : "text-amber-400";

  if (variant === "large") {
    return (
      <div className="flex items-baseline gap-3">
        <span className={`font-mono text-xl font-bold tracking-wider ${colorClass}`}>
          {code.access_code}
        </span>
        <span
          className={`text-xs ${
            isExpired
              ? "text-red-500 font-medium"
              : isExpiringSoon
                ? "text-orange-400"
                : "text-[var(--color-text-muted)]"
          }`}
        >
          {isExpired ? "만료됨" : `D-${daysLeft}`}
        </span>
      </div>
    );
  }

  return (
    <span
      className={`font-mono text-xs font-semibold tracking-wide ${colorClass}`}
      title={isExpired ? "만료됨" : `${daysLeft}일 남음`}
    >
      {code.access_code}
    </span>
  );
}
