"use client";

import { Crown, Shield, GraduationCap, Check, X } from "lucide-react";
import { ROLE_DESCRIPTORS, ROLE_KEYS_ORDERED, type RoleKey } from "@/lib/rolePermissions";

/**
 * RolePermissionCards — 팀 섹션 상단 3-role 권한 카드 (Variant F).
 *
 * 사용자가 owner/admin/member 가 각각 무엇을 할 수 있는지 한눈에 파악하도록.
 * 모바일에서는 1열 stack, 데스크탑은 3열 grid.
 */

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: GraduationCap,
} as const;

const ROLE_COLORS: Record<RoleKey, { text: string; border: string; gradient: string }> = {
  owner: {
    text: "text-amber-300",
    border: "border-amber-400/30",
    gradient: "from-amber-500/15 to-amber-500/[0.04]",
  },
  admin: {
    text: "text-blue-300",
    border: "border-blue-400/25",
    gradient: "from-blue-500/12 to-blue-500/[0.03]",
  },
  member: {
    text: "text-emerald-300",
    border: "border-emerald-400/25",
    gradient: "from-emerald-500/12 to-emerald-500/[0.03]",
  },
};

export function RolePermissionCards() {
  return (
    <div data-testid="role-permission-cards" className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
      {ROLE_KEYS_ORDERED.map((roleKey) => {
        const descriptor = ROLE_DESCRIPTORS[roleKey];
        const colors = ROLE_COLORS[roleKey];
        const Icon = ROLE_ICONS[roleKey];
        // 카드에는 핵심 3개만 표시 — 전체는 InviteModal / tooltip 에서.
        const previewPermissions = descriptor.permissions.slice(0, 3);

        return (
          <div
            key={roleKey}
            data-testid={`role-card-${roleKey}`}
            className={`rounded-xl border bg-gradient-to-br p-3 ${colors.gradient} ${colors.border}`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className={`w-3.5 h-3.5 ${colors.text}`} strokeWidth={2} />
              <span className={`font-bold text-xs ${colors.text}`}>
                {descriptor.label}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-2">
              {descriptor.shortDescription}
            </p>
            <ul className="space-y-1 text-[10px] text-[var(--color-text-secondary)]">
              {previewPermissions.map((p, i) => (
                <li key={i} className="flex items-start gap-1">
                  {p.ok ? (
                    <Check className="w-2.5 h-2.5 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <X className="w-2.5 h-2.5 text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                  )}
                  <span className={p.ok ? "" : "line-through opacity-60"}>
                    {p.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
