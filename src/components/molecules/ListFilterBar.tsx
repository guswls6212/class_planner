"use client";

import { Plus, Search } from "lucide-react";

interface ListFilterBarProps {
  value: string;
  onChange: (v: string) => void;
  /** canAdd가 true이고 trimmed value가 비어있지 않을 때만 호출됨. */
  onAdd?: (trimmed: string) => void;
  canAdd: boolean;
  placeholder?: string;
  addLabel?: string;
  ariaLabelAdd?: string;
}

export default function ListFilterBar({
  value,
  onChange,
  onAdd,
  canAdd,
  placeholder = "이름으로 검색",
  addLabel = "추가",
  ariaLabelAdd = "추가",
}: ListFilterBarProps) {
  const trimmed = value.trim();
  const canSubmit = canAdd && !!onAdd && trimmed.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd!(trimmed);
  };

  return (
    <div className="flex gap-2 p-3 border-b border-[var(--color-border)]">
      <div className="relative flex-1">
        <Search
          size={14}
          strokeWidth={1.5}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSubmit();
          }}
          placeholder={placeholder}
          className="w-full pl-8 pr-2 py-1.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      {canAdd && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-1 px-3 py-1.5 bg-accent text-[var(--color-admin-ink)] rounded-md hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={ariaLabelAdd}
        >
          <Plus size={14} strokeWidth={1.5} />
          {addLabel}
        </button>
      )}
    </div>
  );
}
