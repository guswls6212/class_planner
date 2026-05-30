"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MOCK_STUDENTS, PROTOTYPE_DATE_LABEL } from "../_mock/data";
import MockGrid from "../_mock/MockGrid";

export default function P4CHideOnScroll() {
  const [selected, setSelected] = useState<string[]>(["s1"]);
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      setScrolled(el.scrollTop > 50);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = MOCK_STUDENTS.filter(
    (s) =>
      !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const visibleChips = filtered.slice(0, 6);
  const hiddenCount = filtered.length - visibleChips.length;

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <header
        className={`shrink-0 border-b border-[var(--color-border)] transition-all duration-200 ${
          scrolled ? "py-1.5" : "py-3"
        }`}
      >
        <div className="px-6 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <Link
              href="/design-explorations"
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              ←
            </Link>
            <h1
              className={`font-bold tracking-tight transition-all duration-200 ${
                scrolled ? "text-base" : "text-xl"
              }`}
            >
              주간 시간표
            </h1>
            {!scrolled && (
              <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
                {PROTOTYPE_DATE_LABEL}
              </span>
            )}
            <span className="text-[10px] text-[var(--color-accent)] uppercase tracking-wider">
              P4-C · Hide-on-Scroll
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)]">
              ⏱ 9-23 ▾
            </button>
            {!scrolled && (
              <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)]">
                📁 템플릿
              </button>
            )}
            <button className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)]">
              📥 PDF
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-200 ${
            scrolled ? "max-h-0 mt-0 opacity-0" : "max-h-12 mt-2 opacity-100"
          }`}
        >
          <div className="px-6 flex items-center gap-1.5 flex-wrap">
            <input
              type="text"
              placeholder="🔍 학생 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-0.5 text-xs w-32 outline-none focus:border-[var(--color-accent)]"
            />
            {visibleChips.map((s) => {
              const isSel = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
                    isSel
                      ? "bg-[var(--color-accent)] text-white font-medium"
                      : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
            {hiddenCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)]">
                + {hiddenCount}명
              </span>
            )}
          </div>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-auto">
        <MockGrid selectedStudents={selected} />
      </div>
    </main>
  );
}
