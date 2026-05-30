"use client";

import { ChevronDown, PanelLeftOpen, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

interface PopoverItem {
  id: string;
  name: string;
  color?: string;
}

export interface ChipFilterPopoverProps {
  /** "학생" or "강사" — chip 라벨 prefix */
  type: "student" | "teacher";
  items: PopoverItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClearAll: () => void;
  /** 사이드바로 펼치기 클릭 시 호출 */
  onExpandToSidebar: () => void;
}

const TYPE_LABEL: Record<ChipFilterPopoverProps["type"], string> = {
  student: "학생",
  teacher: "강사",
};

export default function ChipFilterPopover({
  type,
  items,
  selectedIds,
  onToggle,
  onClearAll,
  onExpandToSidebar,
}: ChipFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      items.filter((it) => !q || it.name.toLowerCase().includes(q)),
    [items, q],
  );

  const activeNames = items
    .filter((it) => selectedIds.includes(it.id))
    .slice(0, 2)
    .map((it) => it.name);
  const remaining = selectedIds.length - activeNames.length;
  const label = TYPE_LABEL[type];

  return (
    <div className="relative">
      <button
        type="button"
        data-testid={`chip-filter-popover-${type}`}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          selectedIds.length > 0
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/20"
            : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Users size={12} aria-hidden="true" />
        {selectedIds.length === 0 ? (
          <span>{label} 필터</span>
        ) : (
          <span>
            {activeNames.join(", ")}
            {remaining > 0 ? ` +${remaining}명` : ""}
          </span>
        )}
        <ChevronDown size={11} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label={`${label} 필터`}
            className="absolute left-0 top-full mt-1 z-30 w-[280px] max-h-[440px] flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl"
          >
            <div className="p-2 border-b border-[var(--color-border)] relative">
              <Search
                size={13}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              />
              <input
                autoFocus
                type="text"
                placeholder={`${label} 검색...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-7 pr-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <ul className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {filtered.length === 0 && (
                <li className="px-2 py-3 text-center text-xs text-[var(--color-text-muted)]">
                  검색 결과 없음
                </li>
              )}
              {filtered.map((it) => {
                const isSel = selectedIds.includes(it.id);
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => onToggle(it.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                        isSel
                          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                      }`}
                      aria-pressed={isSel}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded border-[1.5px] inline-flex items-center justify-center flex-shrink-0 ${
                          isSel
                            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                            : "border-[var(--color-border)]"
                        }`}
                      >
                        {isSel && (
                          <span className="block text-[8px] text-white">
                            ✓
                          </span>
                        )}
                      </span>
                      {it.color && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: it.color }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{it.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="p-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onExpandToSidebar();
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline"
              >
                <PanelLeftOpen size={12} aria-hidden="true" />
                사이드바로 펼치기
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  전체 해제
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
