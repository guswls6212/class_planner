"use client";

/**
 * /schedule-v2 — 공부방형 시간표 재설계 미리보기.
 *
 * 친구(공부방) PDF 모델을 충실히 옮긴 두 뷰(그리드 page1 / 학생별 표 page2) 토글.
 * 기존 /schedule(세션블록 모델)은 그대로 두고 새 route로 분리 — nav 미연결, 라이브 영향 0.
 * 현재 샘플 데이터(디자인 미리보기). 실데이터 연결은 세션→per-student 모델 결정 후.
 *
 * proposal: study-room-fit-validation
 */

import { useState } from "react";
import AuthGuard from "../../components/atoms/AuthGuard";
import StudyRoomGrid from "./_components/StudyRoomGrid";
import StudyRoomTable from "./_components/StudyRoomTable";

type View = "grid" | "table";

export default function ScheduleV2Page() {
  const [view, setView] = useState<View>("grid");

  return (
    <AuthGuard requireAuth={false}>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-accent)]">
            시간표 재설계 미리보기
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-muted)]">
            샘플 데이터
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">시간표 — 한눈에 전주</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
          색 = 강사, 한 칸 = 학생 1명의 개별 시간(들쑥날쑥 그대로). 같은 데이터를 두 가지로 봅니다 —
          <b className="text-[var(--color-text-primary)]"> 그리드</b>(누가 언제 방에) /{" "}
          <b className="text-[var(--color-text-primary)]">학생별 표</b>(이 아이 주간).
        </p>

        {/* 뷰 토글 */}
        <div className="mt-4 inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0.5 text-sm">
          {([
            ["grid", "그리드"],
            ["table", "학생별 표"],
          ] as [View, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`rounded-md px-3 py-1 font-medium transition ${
                view === key
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">{view === "grid" ? <StudyRoomGrid /> : <StudyRoomTable />}</div>
      </div>
    </AuthGuard>
  );
}
