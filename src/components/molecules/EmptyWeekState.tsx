"use client";

interface Props {
  hasTemplate: boolean;
  onApplyTemplate: () => void;
  onAddSession: () => void;
}

export function EmptyWeekState({ hasTemplate, onApplyTemplate, onAddSession }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
      <p className="text-sm text-[var(--color-text-secondary)]">이번 주 시간표가 비어있어요</p>
      <div className="flex gap-2 pointer-events-auto">
        {hasTemplate && (
          <button
            type="button"
            onClick={onApplyTemplate}
            className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            템플릿 적용
          </button>
        )}
        <button
          type="button"
          onClick={onAddSession}
          className="border border-[var(--color-border)] text-[var(--color-text-primary)] px-3.5 py-2 rounded-md text-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          + 수업 추가
        </button>
      </div>
      {!hasTemplate && (
        <p className="text-xs text-[var(--color-text-secondary)] pointer-events-none mt-1">
          한 주를 짜고 저장하면 다음 주에 재사용할 수 있어요
        </p>
      )}
    </div>
  );
}
