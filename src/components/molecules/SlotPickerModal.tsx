"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";

const FREE_TIER_QUOTA = 2;
/**
 * "추후 업데이트 예정" 슬롯 표시 개수. 사용자가 향후 unlock 가능성을 인지할 정도만.
 * 너무 많으면 paywall 오인 가능 (ADR-008 weakness).
 */
const COMING_SOON_SLOTS = 3;

export type SlotPickerMode = "save" | "apply";

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * 슬롯 확정 시 호출.
   * @param slotIndex 0 또는 1 (FREE_TIER_QUOTA 미만)
   * @param name save mode 시 사용자 입력 (없으면 undefined — 호출 측이 default 결정)
   */
  onSelect: (slotIndex: number, name?: string) => void;
  /** 현재 templates 배열. slotIndex 기준으로 슬롯 매핑. */
  templates: ScheduleTemplate[];
  /**
   * - "save": 빈 슬롯 + 채워진 슬롯 둘 다 선택 가능 (신규 저장 또는 갱신).
   * - "apply": 채워진 슬롯만 활성 (적용 대상).
   */
  mode: SlotPickerMode;
  /** 작업 진행 중 disable 표시. */
  isSubmitting?: boolean;
}

/**
 * ADR-008 의 free 2 슬롯 + "추후 업데이트 예정" disabled UI 의 모달 컴포넌트.
 *
 * UX:
 * - 슬롯 1, 2 — 활성 (save) 또는 채워진 것만 활성 (apply)
 * - 슬롯 3, 4, 5 — disabled, "추후 업데이트 예정" 라벨 + Lock 아이콘
 * - save 시 사용자 name 입력 옵션 (없으면 호출 측이 "슬롯 N" 등 default)
 */
export function SlotPickerModal({
  open,
  onClose,
  onSelect,
  templates,
  mode,
  isSubmitting,
}: Props) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState("");

  // open 변경 시 state 초기화 — default 선택은 save=first-empty, apply=first-filled
  useEffect(() => {
    if (!open) return;
    const slotsInfo = Array.from({ length: FREE_TIER_QUOTA }, (_, i) => ({
      idx: i,
      filled: templates.some((t) => t.slotIndex === i),
    }));
    const defaultSlot =
      mode === "save"
        ? (slotsInfo.find((s) => !s.filled) ?? slotsInfo[0]).idx
        : (slotsInfo.find((s) => s.filled) ?? slotsInfo[0]).idx;
    setSelectedSlot(defaultSlot);
    setName("");
  }, [open, mode, templates]);

  if (!open) return null;

  const slots = Array.from({ length: FREE_TIER_QUOTA }, (_, i) => ({
    slotIndex: i,
    template: templates.find((t) => t.slotIndex === i) ?? null,
  }));
  const comingSoonSlots = Array.from(
    { length: COMING_SOON_SLOTS },
    (_, i) => FREE_TIER_QUOTA + i,
  );

  const handleConfirm = () => {
    if (selectedSlot === null) return;
    const trimmed = name.trim();
    onSelect(selectedSlot, trimmed === "" ? undefined : trimmed);
  };

  const titleText = mode === "save" ? "어느 슬롯에 저장할까요?" : "어느 슬롯을 적용할까요?";
  const confirmText = isSubmitting
    ? mode === "save"
      ? "저장 중..."
      : "적용 중..."
    : mode === "save"
      ? "저장"
      : "적용";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
    >
      <div
        className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5 w-[420px] max-w-[90vw] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          {titleText}
        </h3>

        {/* 활성 슬롯 (FREE_TIER_QUOTA) */}
        <div className="space-y-2 mb-3">
          {slots.map(({ slotIndex, template }) => {
            const isEmpty = template === null;
            const disabled = mode === "apply" && isEmpty;
            const selected = selectedSlot === slotIndex;
            return (
              <button
                type="button"
                key={slotIndex}
                disabled={disabled}
                onClick={() => setSelectedSlot(slotIndex)}
                aria-pressed={selected}
                className={[
                  "w-full text-left px-3 py-2 border rounded-md transition-colors",
                  selected
                    ? "border-[var(--color-accent)] bg-[var(--color-bg-secondary)]"
                    : "border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]",
                  disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    슬롯 {slotIndex + 1}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {template?.name ?? "(비어있음)"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* "추후 업데이트 예정" 슬롯 (COMING_SOON_SLOTS) */}
        <div className="space-y-1 mb-4">
          {comingSoonSlots.map((idx) => (
            <button
              type="button"
              key={idx}
              disabled
              aria-label={`슬롯 ${idx + 1} 추후 업데이트 예정`}
              className="w-full text-left px-3 py-2 border border-[var(--color-border)] rounded-md opacity-40 cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <Lock size={12} strokeWidth={1.75} />
                  슬롯 {idx + 1}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  추후 업데이트 예정
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* save mode 시 name 입력 옵션 */}
        {mode === "save" && (
          <div className="mb-4">
            <label
              htmlFor="slot-picker-name"
              className="text-xs text-[var(--color-text-secondary)] mb-1 block"
            >
              슬롯 이름 (선택)
            </label>
            <input
              id="slot-picker-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`슬롯 ${(selectedSlot ?? 0) + 1}`}
              maxLength={50}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-md text-sm hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedSlot === null || isSubmitting}
            className="px-3.5 py-1.5 bg-[var(--color-accent)] text-white rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
