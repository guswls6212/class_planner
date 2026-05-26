"use client";

import { Crown, Shield } from "lucide-react";
import type { TeacherRoleLike } from "@/lib/teacherPickerFilter";

/**
 * Owner / Admin 시각 구분 badge (atom).
 *
 * 사용처: TeacherDropdownPicker / TeacherPillPicker / TeacherFilterChipBar /
 * PrimarySidebar 의 teacher row / TeachersPageLayout 의 grid row.
 *
 * 의도 (teacher-display-identity Phase 1, 2026-05-26):
 * 진짜 원장(role='owner') vs 가짜 "원장님" 이름의 일반 강사 시각 구분.
 * filter 로 hard exclude X — badge 으로 noticeable 차이.
 *
 * - owner: amber Crown + "원장"
 * - admin: blue Shield + "관리자"
 * - member / null / undefined: null (badge 없음)
 *
 * Size 옵션:
 * - 'xs' (기본, dropdown/chip 안 inline): text-[9px] icon 2.5
 * - 'sm' (grid row, sidebar): text-[10px] icon 3
 */
interface RoleBadgeProps {
  role: TeacherRoleLike;
  size?: "xs" | "sm";
  className?: string;
}

export function RoleBadge({ role, size = "xs", className = "" }: RoleBadgeProps) {
  if (role !== "owner" && role !== "admin") return null;

  const isOwner = role === "owner";
  const Icon = isOwner ? Crown : Shield;
  const text = isOwner ? "원장" : "관리자";
  const colorText = isOwner ? "text-amber-300" : "text-blue-300";
  const fontWeight = isOwner ? "font-semibold" : "";

  const sizeMap = {
    xs: { text: "text-[9px]", icon: "w-2.5 h-2.5" },
    sm: { text: "text-[10px]", icon: "w-3 h-3" },
  };
  const s = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${s.text} ${colorText} ${fontWeight} ${className}`}
      data-testid={`role-badge-${role}`}
    >
      <Icon className={s.icon} aria-hidden="true" />
      {text}
    </span>
  );
}
