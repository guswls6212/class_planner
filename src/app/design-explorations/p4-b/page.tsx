"use client";

import Link from "next/link";
import { useState } from "react";
import { MOCK_STUDENTS, PROTOTYPE_DATE_LABEL } from "../_mock/data";
import MockGrid from "../_mock/MockGrid";

export default function P4BPopover() {
  const [selected, setSelected] = useState<string[]>(["s1", "s2"]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = MOCK_STUDENTS.filter(
    (s) =>
      !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const activeNames = MOCK_STUDENTS.filter((s) => selected.includes(s.id))
    .slice(0, 2)
    .map((s) => s.name);
  const remaining = selected.length - activeNames.length;

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <header className="shrink-0 border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-wrap">
          <Link
            href="/design-explorations"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            ←
          </Link>
          <h1 className="text-xl font-bold tracking-tight">주간 시간표</h1>
          <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
            {PROTOTYPE_DATE_LABEL}
          </span>
          <span className="text-[10px] text-[var(--color-accent)] uppercase tracking-wider">
            P4-B · Popover
          </span>

          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selected.length > 0
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/20"
                  : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
              }`}
            >
              <span aria-hidden="true">🔍</span>
              {selected.length === 0 ? (
                <>학생 필터</>
              ) : (
                <>
                  {activeNames.join(", ")}
                  {remaining > 0 ? ` +${remaining}명` : ""}
                </>
              )}
              <span aria-hidden="true" className="text-[10px]">
                ▾
              </span>
            </button>

            {open && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute left-0 top-full mt-1 z-30 w-[260px] max-h-[400px] flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl">
                  <div className="p-2 border-b border-[var(--color-border)]">
                    <input
                      autoFocus
                      type="text"
                      placeholder="학생 검색..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                  <ul className="flex-1 overflow-y-auto p-1">
                    {filtered.map((s) => {
                      const isSel = selected.includes(s.id);
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => toggle(s.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                              isSel
                                ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
                                : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                            }`}
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
                            {s.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {selected.length > 0 && (
                    <div className="p-2 border-t border-[var(--color-border)] flex justify-between items-center">
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {selected.length}명 선택
                      </span>
                      <button
                        onClick={() => setSelected([])}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      >
                        전체 해제
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)]">
            ⏱ 9-23시 ▾
          </button>
          <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)]">
            📁
          </button>
          <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)]">
            📥
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <MockGrid selectedStudents={selected} />
      </div>
    </main>
  );
}
