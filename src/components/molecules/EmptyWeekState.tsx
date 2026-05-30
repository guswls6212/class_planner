"use client";
import { CalendarX2, Copy, Plus } from "lucide-react";

interface Props {
  hasTemplate: boolean;
  onApplyTemplate: () => void;
  onAddSession: () => void;
}

export function EmptyWeekState({ hasTemplate, onApplyTemplate, onAddSession }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 pt-12">
      <div
        className="pointer-events-auto flex flex-col items-center gap-5 p-8 rounded-2xl
                   bg-[var(--color-bg-primary)]/90 backdrop-blur-sm
                   border border-[var(--color-border)] shadow-xl
                   max-w-xs w-full mx-4 text-center"
      >
        <div className="w-14 h-14 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center">
          <CalendarX2 size={26} className="text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        </div>

        <div className="space-y-1.5">
          <p className="text-base font-semibold text-[var(--color-text-primary)]">
            이번 주 수업이 없어요
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
            {hasTemplate
              ? "지난 시간표를 그대로 적용하거나\n수업을 직접 추가해보세요"
              : "수업을 추가하고 저장하면\n다음 주에 바로 재사용할 수 있어요"}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {hasTemplate && (
            <button
              type="button"
              onClick={onApplyTemplate}
              className="flex items-center justify-center gap-2 w-full
                         bg-[var(--color-accent)] text-white
                         px-4 py-2.5 rounded-lg text-sm font-semibold
                         hover:opacity-90 active:opacity-80 transition-opacity"
            >
              <Copy size={14} strokeWidth={2.5} />
              템플릿 적용
            </button>
          )}
          <button
            type="button"
            onClick={onAddSession}
            className="flex items-center justify-center gap-2 w-full
                       border border-[var(--color-border)]
                       text-[var(--color-text-primary)]
                       px-4 py-2.5 rounded-lg text-sm
                       hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            수업 추가
          </button>
        </div>
      </div>
    </div>
  );
}
