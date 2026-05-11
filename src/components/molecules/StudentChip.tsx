"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { GradeBadge } from "@/components/atoms/GradeBadge";
import {
  DetailTooltip,
  type DetailTooltipSection,
} from "@/components/atoms/DetailTooltip";

export interface StudentChipData {
  id: string;
  name: string;
  grade?: string | null;
  /** 도메인은 "male" | "female" | "" 사용 — 컴포넌트는 string 수용, 매핑 불가 값은 표시 안 함. */
  gender?: string | null;
  birthDate?: string | null;
  school?: string | null;
}

interface StudentChipProps {
  student: StudentChipData;
  /**
   * - "compact": 학년 배지 + 이름 (+ optional ✕). 부가정보는 hover/focus 툴팁.
   * - "row": 검색 결과 row (avatar + 학년 배지 + 이름 + meta). 툴팁 없음 — 공간 충분 영역.
   */
  variant?: "compact" | "row";
  /** "compact" + onRemove 제공 시 ✕ 버튼 표시. */
  onRemove?: () => void;
  onClick?: () => void;
  /** "row" variant: 이름 옆 부제 (예: 동명이인 식별 라벨, "프로필 미입력 · 동명이인" 등). */
  subtitle?: ReactNode;
  /** "row" variant: 우측 메타 (예: "남 · 2020-09-09"). */
  metaRight?: ReactNode;
  /** "row" variant: 선택 강조 (좌측 accent border). */
  selected?: boolean;
  className?: string;
}

const GENDER_LABEL: Record<string, string> = { male: "남", female: "여" };

function buildTooltipSections(
  student: StudentChipData,
): DetailTooltipSection[] {
  const rows: { label: string; value: string }[] = [];
  const gender = student.gender ? GENDER_LABEL[student.gender] : null;
  if (gender) rows.push({ label: "성별", value: gender });
  if (student.birthDate)
    rows.push({ label: "생년월일", value: student.birthDate });
  if (student.school) rows.push({ label: "학교", value: student.school });
  if (rows.length === 0) return [];
  return [{ title: "학생 정보", rows }];
}

export function StudentChip(props: StudentChipProps) {
  const {
    student,
    variant = "compact",
    onRemove,
    onClick,
    subtitle,
    metaRight,
    selected = false,
    className = "",
  } = props;

  if (variant === "row") {
    const Container = onClick ? "button" : "div";
    return (
      <Container
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={[
          "w-full flex items-center gap-3 px-3 py-2.5 text-left",
          onClick
            ? "hover:bg-[var(--color-overlay-light)] transition-colors cursor-pointer"
            : "",
          selected
            ? "bg-[var(--color-overlay-light)] border-l-2 border-l-[var(--color-accent)]"
            : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid={`student-chip-row-${student.id}`}
      >
        <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
          {student.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GradeBadge grade={student.grade} testIdSuffix={student.id} />
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {student.name}
            </p>
          </div>
          {subtitle && (
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
              {subtitle}
            </p>
          )}
        </div>
        {metaRight && (
          <span className="text-[11px] text-[var(--color-text-muted)] flex-shrink-0">
            {metaRight}
          </span>
        )}
      </Container>
    );
  }

  // compact variant
  const sections = buildTooltipSections(student);
  const chip = (
    <span
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5",
        "rounded-full border border-amber-500/20 bg-amber-500/10",
        "pl-2 pr-2 py-1 text-[12px]",
        "text-[var(--color-text-primary)]",
        onClick ? "cursor-pointer hover:bg-amber-500/15" : "",
      ].join(" ")}
      data-testid={`student-chip-compact-${student.id}`}
    >
      <GradeBadge grade={student.grade} testIdSuffix={student.id} />
      <span className="font-medium">{student.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`${student.name} 제거`}
          className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );

  return (
    <DetailTooltip sections={sections} className={className}>
      {chip}
    </DetailTooltip>
  );
}
