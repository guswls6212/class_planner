"use client";

/**
 * InfoHint — `?` 아이콘 + 호버/포커스 시 설명 툴팁.
 *
 * 한 문장 책임: 보조 설명을 차지 공간 최소로 제공한다 (호버 전엔 `?` 만).
 * 비개발자(학원 운영자) 대상이라 아이콘 의미 추측 부담 없이 "?" = 도움말 관습 사용.
 * 접근성: button + aria-label, 키보드 focus 시에도 노출 (focus-within).
 */
interface InfoHintProps {
  /** 툴팁 본문 (여러 문장 가능 — 줄바꿈은 \n) */
  text: string;
  /** 스크린리더용 라벨 (기본: "도움말") */
  label?: string;
}

export function InfoHint({ text, label = "도움말" }: InfoHintProps) {
  return (
    <span className="group relative inline-flex items-center align-middle">
      <button
        type="button"
        aria-label={label}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-[var(--color-overlay-light)] text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1.5 w-64 -translate-x-1/2 whitespace-pre-line rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-text-secondary)] opacity-0 shadow-admin-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
