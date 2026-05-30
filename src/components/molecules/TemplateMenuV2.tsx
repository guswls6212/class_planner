"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Trash2, Save, Eye, ChevronDown } from "lucide-react";

interface Props {
  onApply: () => void;
  onClearWeek: () => void;
  onSave: () => void;
  onPreview: () => void;
  canManage: boolean;
  hasTemplate: boolean;
}

/**
 * 템플릿 dropdown menu.
 *
 * UAT 2026-05-21:
 *   - C variant — amber border 제거 → ghost dropdown style (다른 toolbar button 과 일관)
 *   - Portal — schedule grid stacking context 안에 가두던 가려짐 fix
 */
export function TemplateMenuV2({
  onApply,
  onClearWeek,
  onSave,
  onPreview,
  canManage,
  hasTemplate,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const close = () => setOpen(false);
  const wrap = (fn: () => void) => () => {
    fn();
    close();
  };

  const menu =
    open && menuPos
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={close}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="fixed z-[9999] w-64 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-2xl py-2"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                이 주에 작업
              </div>
              <MenuItem
                icon={Download}
                label="템플릿 적용하기"
                onClick={wrap(onApply)}
                disabled={!hasTemplate}
              />
              <MenuItem
                icon={Trash2}
                label="시간표 비우기"
                onClick={wrap(onClearWeek)}
              />

              <div className="my-1 border-t border-[var(--color-border)]" />

              <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                템플릿 자체
              </div>
              <MenuItem
                icon={Save}
                label="현재 주를 템플릿으로 저장"
                onClick={wrap(onSave)}
                disabled={!canManage}
              />
              <MenuItem
                icon={Eye}
                label="미리보기"
                onClick={wrap(onPreview)}
                disabled={!hasTemplate}
              />
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] px-3 py-1.5 rounded-md transition-colors"
      >
        템플릿
        <ChevronDown size={14} strokeWidth={2} />
      </button>
      {menu}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <Icon
        size={16}
        strokeWidth={1.75}
        className="text-[var(--color-text-secondary)] shrink-0"
      />
      <span>{label}</span>
    </button>
  );
}
