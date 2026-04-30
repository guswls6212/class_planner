"use client";

interface Props {
  existingSessionCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function ApplyTemplateConfirm({ existingSessionCount, onConfirm, onCancel, isApplying }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5 w-[380px] max-w-[90vw] shadow-2xl">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
          템플릿을 적용할까요?
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
          이 주에 이미 <strong className="text-[var(--color-text-primary)]">{existingSessionCount}개 수업</strong>이 있어요.
          <br />
          모두 삭제되고 템플릿으로 교체됩니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className="px-3.5 py-1.5 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-md text-sm hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isApplying}
            className="px-3.5 py-1.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {isApplying ? "적용 중..." : "기존 삭제하고 적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
