"use client";

import type { ReactNode } from "react";
import {
  DetailTooltip,
  type DetailTooltipSection,
} from "@/components/atoms/DetailTooltip";

export interface TeacherChipData {
  id: string;
  name: string;
  color: string;
  email?: string | null;
  phone?: string | null;
}

interface TeacherChipProps {
  teacher: TeacherChipData;
  selected?: boolean;
  onClick?: () => void;
  /** "관리자" 같은 보조 태그. 동명이인 부제는 툴팁으로 이동 — 본 prop은 admin/owner 등 컨텍스트 표기에만 사용. */
  contextTag?: ReactNode;
  className?: string;
}

function buildTooltipSections(
  teacher: TeacherChipData,
): DetailTooltipSection[] {
  const rows: { label: string; value: string }[] = [];
  if (teacher.email) rows.push({ label: "이메일", value: teacher.email });
  if (teacher.phone) rows.push({ label: "전화", value: teacher.phone });
  if (rows.length === 0) return [];
  return [{ title: "강사 연락처", rows }];
}

/**
 * 강사 선택용 pill. 색상 도트 + 이름만 노출, email/phone은 호버 툴팁으로.
 * 기존 TeacherPillPicker 인라인 렌더를 추출한 형태.
 */
export function TeacherChip(props: TeacherChipProps) {
  const { teacher, selected = false, onClick, contextTag, className = "" } = props;
  const sections = buildTooltipSections(teacher);

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-testid={`teacher-chip-${teacher.id}`}
      className={[
        "inline-flex items-center gap-2",
        "rounded-full px-3 py-1.5 text-[12px]",
        "transition-all duration-150",
        selected
          ? "border border-[#a78bfa] text-[var(--color-text-primary)] font-medium"
          : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]",
      ].join(" ")}
      style={
        selected
          ? {
              // Tailwind 4의 임의 알파 클래스로 표현 가능하지만 기존 TeacherPillPicker와 시각 동등성 유지를 위해 인라인 RGBA 보존.
              background: "rgba(167,139,250,0.18)",
              boxShadow: "0 0 0 3px rgba(167,139,250,0.08)",
            }
          : { background: "var(--color-bg-secondary)" }
      }
    >
      <span
        className="w-[7px] h-[7px] rounded-full flex-shrink-0"
        // teacher.color는 런타임 값 — 인라인 style 필요
        style={{ backgroundColor: teacher.color }}
      />
      <span>{teacher.name}</span>
      {contextTag &&
        (typeof contextTag === "string" ? (
          <span className="text-[10px] text-[var(--color-text-muted)]">· {contextTag}</span>
        ) : (
          <span className="ml-1">{contextTag}</span>
        ))}
    </button>
  );

  return (
    <DetailTooltip sections={sections} className={className}>
      {button}
    </DetailTooltip>
  );
}
