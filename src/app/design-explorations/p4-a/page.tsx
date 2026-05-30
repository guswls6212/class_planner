"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  PROTOTYPE_DATE_LABEL,
} from "../_mock/data";
import MockGrid from "../_mock/MockGrid";

export default function P4ASidebar() {
  const [selected, setSelected] = useState<string[]>(["s1", "s2"]);
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <main className="flex h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <aside
        className={`shrink-0 border-r border-[var(--color-border)] flex flex-col transition-[width] duration-200 ${
          collapsed ? "w-14" : "w-[240px]"
        }`}
      >
        <div className="px-3 py-2.5 border-b border-[var(--color-border)] flex items-center">
          {!collapsed && (
            <span className="text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
              FILTERS
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] w-6 h-6 inline-flex items-center justify-center rounded hover:bg-[var(--color-bg-secondary)]"
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {collapsed ? "▶" : "◀"}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <input
                type="text"
                placeholder="🔍 학생 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-2">
                <div className="text-[11px] font-semibold uppercase text-[var(--color-text-muted)] mb-1.5 flex justify-between items-center">
                  <span>학생 ({MOCK_STUDENTS.length})</span>
                  {selected.length > 0 && (
                    <button
                      onClick={() => setSelected([])}
                      className="text-[10px] text-[var(--color-accent)] hover:underline"
                    >
                      해제
                    </button>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {filtered.map((s) => {
                    const isSel = selected.includes(s.id);
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => toggle(s.id)}
                          className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors ${
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
              </div>

              <div className="px-3 py-2 border-t border-[var(--color-border)]">
                <div className="text-[11px] font-semibold uppercase text-[var(--color-text-muted)] mb-1.5">
                  강사 ({MOCK_TEACHERS.length})
                </div>
                <ul className="space-y-0.5">
                  {MOCK_TEACHERS.map((t) => (
                    <li key={t.id}>
                      <button className="w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: t.color }}
                        />
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-3 min-w-0">
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
              P4-A · Sidebar
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
              ⏱ 9-23시 ▾
            </button>
            <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
              📁 템플릿
            </button>
            <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
              📥 PDF
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <MockGrid selectedStudents={selected} />
        </div>
      </section>
    </main>
  );
}
