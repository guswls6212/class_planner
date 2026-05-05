"use client";

import React, { useMemo, useState } from "react";
import type { ClassPlannerData } from "../../lib/localStorageCrud";
import type { Student, Subject, Enrollment, Session } from "../../lib/planner";
import { weekdays } from "../../lib/planner";
import { useModalA11y } from "../../hooks/useModalA11y";
import {
  computeLossDiff,
  type LossDiff,
} from "../../lib/conflict/computeLossDiff";
import ConfirmModal from "./ConfirmModal";

interface DataConflictModalProps {
  localData: ClassPlannerData;
  serverData: ClassPlannerData;
  onSelectServer: () => void;
  onSelectLocal: () => void;
  isMigrating?: boolean;
  migrationError?: string | null;
}

function formatLossText(loss: LossDiff): string {
  const parts: string[] = [];
  if (loss.students > 0) parts.push(`학생 ${loss.students}명`);
  if (loss.subjects > 0) parts.push(`과목 ${loss.subjects}개`);
  if (loss.sessions > 0) parts.push(`수업 ${loss.sessions}개`);
  return parts.join(" · ");
}

/** 그룹 수업을 과목 기준으로 포맷. 예: "월 09:30~10:30 중등수학 · 이현진, 강지원" */
function formatSessionDisplay(
  session: Session,
  enrollments: Enrollment[],
  students: { id: string; name: string }[],
  subjects: Subject[]
): { weekday: string; time: string; subject: string; studentNames: string[]; isGroup: boolean } {
  const weekday = weekdays[session.weekday] ?? "?";
  const time = `${session.startsAt}~${session.endsAt}`;

  const studentNames: string[] = [];
  let subjectName = "";

  for (const eId of session.enrollmentIds ?? []) {
    const enrollment = enrollments.find((e) => e.id === eId);
    if (!enrollment) continue;
    const student = students.find((s) => s.id === enrollment.studentId);
    if (student) studentNames.push(student.name);
    if (!subjectName) {
      const subject = subjects.find((s) => s.id === enrollment.subjectId);
      subjectName = subject?.name ?? "";
    }
  }

  return {
    weekday,
    time,
    subject: subjectName || "?",
    studentNames,
    isGroup: studentNames.length > 1,
  };
}

function formatLastModified(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  } catch {
    return "";
  }
}

const DataConflictModal: React.FC<DataConflictModalProps> = ({
  localData,
  serverData,
  onSelectServer,
  onSelectLocal,
  isMigrating,
  migrationError,
}) => {
  const [activeTab, setActiveTab] = useState<"local" | "server">("local");
  const [selectedSide, setSelectedSide] = useState<"local" | "server" | null>(null);
  // 큰 손실 시 2단계 확인 다이얼로그 — null이면 미표시
  const [pendingConfirmSide, setPendingConfirmSide] = useState<"local" | "server" | null>(null);

  // DataConflictModal must be explicitly resolved — Escape is intentionally a no-op
  const { containerRef } = useModalA11y({ isOpen: true, onClose: () => {} });

  // 각 카드 선택 시 잃을 entity 수 (rejected = 반대편 데이터)
  const lossLocal = useMemo(
    () => computeLossDiff(localData, serverData),
    [localData, serverData],
  );
  const lossServer = useMemo(
    () => computeLossDiff(serverData, localData),
    [localData, serverData],
  );
  const lossForSelected: LossDiff | null =
    selectedSide === "local" ? lossLocal : selectedSide === "server" ? lossServer : null;

  const proceed = (side: "local" | "server") => {
    if (side === "local") onSelectLocal();
    else onSelectServer();
  };

  const requestConfirm = (side: "local" | "server") => {
    const loss = side === "local" ? lossLocal : lossServer;
    if (loss.isLargeLoss) {
      setPendingConfirmSide(side);
    } else {
      proceed(side);
    }
  };

  const handleDesktopConfirm = () => {
    if (selectedSide) requestConfirm(selectedSide);
  };

  return (
    /* No backdrop click handler — modal must be explicitly resolved via the buttons below */
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-[660px] rounded-2xl border border-white/[0.08] bg-[--color-bg-primary] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.5)] max-sm:max-w-full max-sm:rounded-xl max-sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-conflict-modal-title"
        ref={containerRef}
      >
        {isMigrating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/60" aria-live="polite">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-500/30 border-t-indigo-500" />
            <span className="text-sm font-medium text-[--color-text-primary]">데이터를 동기화하는 중...</span>
          </div>
        )}

        <div className="mb-6">
          <h2 id="data-conflict-modal-title" className="mb-1.5 text-xl font-bold tracking-tight text-[--color-text-primary]">
            데이터 충돌이 감지되었습니다
          </h2>
          <p className="text-sm leading-relaxed text-[--color-text-secondary]">
            어느 데이터로 시작할지 선택해주세요.
          </p>
        </div>

        {/* 데스크탑: 카드 Side-by-Side */}
        <div className="mb-4 grid grid-cols-2 grid-rows-[repeat(5,auto)] gap-x-3 gap-y-0 max-sm:hidden">
          <DataCard
            testId="card-local"
            sourceLabel="이 기기의 데이터"
            data={localData}
            selected={selectedSide === "local"}
            onSelect={() => setSelectedSide("local")}
            disabled={isMigrating}
            lossOnSelect={lossLocal}
          />
          <DataCard
            testId="card-server"
            sourceLabel="내 계정의 데이터"
            data={serverData}
            selected={selectedSide === "server"}
            onSelect={() => setSelectedSide("server")}
            disabled={isMigrating}
            lossOnSelect={lossServer}
          />
        </div>

        {/* 데스크탑: 확인 버튼 */}
        <div className="mb-1 mt-4 flex justify-center max-sm:hidden">
          <button
            className={`cursor-pointer rounded-[10px] border-none px-9 py-[11px] text-[0.9375rem] font-semibold tracking-tight text-white transition-[background,opacity,transform] duration-150 hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-35 ${
              lossForSelected?.isLargeLoss
                ? "bg-red-500 hover:enabled:bg-red-600"
                : "bg-indigo-500 hover:enabled:bg-indigo-600"
            }`}
            onClick={handleDesktopConfirm}
            disabled={!selectedSide || isMigrating}
          >
            {isMigrating
              ? "저장 중..."
              : lossForSelected?.isLargeLoss
                ? "선택한 데이터로 시작 (위험)"
                : "선택한 데이터로 시작"}
          </button>
        </div>

        {/* 모바일: 탭 전환 */}
        <div className="mb-4 hidden max-sm:block">
          <div className="mb-4 flex gap-1 rounded-lg bg-black/20 p-1" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "local"}
              className={`flex-1 cursor-pointer rounded-md border-none bg-transparent py-2 text-[0.8125rem] font-medium transition-[background,color] duration-150 ${activeTab === "local" ? "bg-slate-700 text-[--color-text-primary]" : "text-[--color-text-secondary]"}`}
              onClick={() => setActiveTab("local")}
            >
              이 기기의 데이터
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "server"}
              className={`flex-1 cursor-pointer rounded-md border-none bg-transparent py-2 text-[0.8125rem] font-medium transition-[background,color] duration-150 ${activeTab === "server" ? "bg-slate-700 text-[--color-text-primary]" : "text-[--color-text-secondary]"}`}
              onClick={() => setActiveTab("server")}
            >
              내 계정의 데이터
            </button>
          </div>

          <div className="min-h-[140px]">
            {activeTab === "local" ? (
              <>
                <StudentSection students={localData.students} />
                <SubjectSection subjects={localData.subjects} />
                <SessionSection
                  sessions={localData.sessions}
                  enrollments={localData.enrollments}
                  students={localData.students}
                  subjects={localData.subjects}
                />
                {lossLocal.isLargeLoss && (
                  <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/[0.10] px-3 py-2.5" role="alert">
                    <div className="flex items-start gap-2">
                      <span className="mt-px text-base text-red-400">⚠</span>
                      <div className="flex-1 text-xs leading-relaxed text-red-300">
                        <span className="font-semibold text-red-400">이 데이터로 시작 시 손실</span>
                        <br />
                        {formatLossText(lossLocal)}이 영구 삭제됩니다.
                      </div>
                    </div>
                  </div>
                )}
                <button
                  className={`mt-4 w-full cursor-pointer rounded-[10px] border-[1.5px] bg-transparent p-3 text-sm font-medium transition-[border-color,color,background] duration-150 ${
                    lossLocal.isLargeLoss
                      ? "border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/[0.06]"
                      : "border-slate-400/25 text-[--color-text-primary] hover:border-indigo-500 hover:bg-indigo-500/[0.06] hover:text-indigo-400"
                  }`}
                  data-testid="card-local"
                  onClick={() => requestConfirm("local")}
                  disabled={isMigrating}
                >
                  {lossLocal.isLargeLoss ? "이 기기의 데이터로 시작 (위험)" : "이 기기의 데이터로 시작"}
                </button>
              </>
            ) : (
              <>
                <StudentSection students={serverData.students} />
                <SubjectSection subjects={serverData.subjects} />
                <SessionSection
                  sessions={serverData.sessions}
                  enrollments={serverData.enrollments}
                  students={serverData.students}
                  subjects={serverData.subjects}
                />
                {lossServer.isLargeLoss && (
                  <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/[0.10] px-3 py-2.5" role="alert">
                    <div className="flex items-start gap-2">
                      <span className="mt-px text-base text-red-400">⚠</span>
                      <div className="flex-1 text-xs leading-relaxed text-red-300">
                        <span className="font-semibold text-red-400">이 데이터로 시작 시 손실</span>
                        <br />
                        {formatLossText(lossServer)}이 영구 삭제됩니다.
                      </div>
                    </div>
                  </div>
                )}
                <button
                  className={`mt-4 w-full cursor-pointer rounded-[10px] border-[1.5px] bg-transparent p-3 text-sm font-medium transition-[border-color,color,background] duration-150 ${
                    lossServer.isLargeLoss
                      ? "border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/[0.06]"
                      : "border-slate-400/25 text-[--color-text-primary] hover:border-indigo-500 hover:bg-indigo-500/[0.06] hover:text-indigo-400"
                  }`}
                  data-testid="card-server"
                  onClick={() => requestConfirm("server")}
                  disabled={isMigrating}
                >
                  {lossServer.isLargeLoss ? "내 계정의 데이터로 시작 (위험)" : "내 계정의 데이터로 시작"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 큰 손실 경고 배너 (데스크톱; 선택된 카드가 위험할 때) */}
        {!isMigrating && lossForSelected?.isLargeLoss && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/[0.10] px-4 py-3 max-sm:hidden" role="alert">
            <div className="flex items-start gap-2">
              <span className="text-base text-red-400">⚠</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-400">데이터 손실 위험</div>
                <div className="mt-0.5 text-xs leading-relaxed text-red-300">
                  {formatLossText(lossForSelected)}이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 배너 */}
        {!isMigrating && migrationError && (
          <div className="mb-3 flex items-center justify-between gap-2.5 rounded-lg border border-red-500/30 bg-red-500/[0.08] px-3.5 py-2.5" role="alert">
            <span className="flex-1 text-xs leading-relaxed text-red-400">{migrationError}</span>
            <button
              className="shrink-0 cursor-pointer rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-[background,border-color] duration-150 hover:border-red-500/60 hover:bg-red-500/20"
              onClick={onSelectLocal}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 안내 배너 */}
        <div className="flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-indigo-400" role="note">
          <span className="mt-px shrink-0">ℹ</span>
          <span>
            선택한 데이터가 내 계정에 저장되며, 양쪽에 같은 데이터가 있으면 내 계정의 데이터가 유지됩니다.
          </span>
        </div>
      </div>

      {/* 큰 손실 — 2단계 확인 다이얼로그 */}
      <ConfirmModal
        isOpen={pendingConfirmSide !== null}
        title="정말 이 데이터로 덮어쓸까요?"
        message={
          pendingConfirmSide
            ? `${formatLossText(pendingConfirmSide === "local" ? lossLocal : lossServer)}이(가) 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ""
        }
        confirmText="덮어쓰기"
        cancelText="취소"
        variant="danger"
        onConfirm={() => {
          if (pendingConfirmSide) proceed(pendingConfirmSide);
          setPendingConfirmSide(null);
        }}
        onCancel={() => setPendingConfirmSide(null)}
      />
    </div>
  );
};

/* ── 하위 컴포넌트 ────────────────────────────── */

interface DataCardProps {
  testId: string;
  sourceLabel: string;
  data: ClassPlannerData;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  lossOnSelect: LossDiff;
}

const DataCard: React.FC<DataCardProps> = ({
  testId,
  sourceLabel,
  data,
  selected,
  onSelect,
  disabled,
  lossOnSelect,
}) => {
  const lastModified = formatLastModified(data.lastModified);
  const totalLoss =
    lossOnSelect.students + lossOnSelect.subjects + lossOnSelect.sessions;

  return (
    <div
      className={`grid row-span-5 [grid-template-rows:subgrid] rounded-xl p-5 outline-none content-start transition-[border-color,background,box-shadow] duration-[180ms] ease-out ${
        selected
          ? lossOnSelect.isLargeLoss
            ? "border-[1.5px] border-red-500 bg-red-500/[0.08] shadow-[0_0_0_1px_#ef4444,0_8px_24px_rgba(239,68,68,0.2)]"
            : "border-[1.5px] border-indigo-500 bg-indigo-500/[0.08] shadow-[0_0_0_1px_#6366f1,0_8px_24px_rgba(99,102,241,0.2)]"
          : "border-[1.5px] border-slate-400/15 bg-white/[0.02]"
      } ${disabled ? "pointer-events-none cursor-not-allowed opacity-50" : "cursor-default"}`}
      data-testid={testId}
    >
      <label className="mb-3.5 flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="dataSelection"
          checked={selected}
          onChange={onSelect}
          className="h-[15px] w-[15px] shrink-0 cursor-pointer accent-indigo-500"
          disabled={disabled}
          aria-label={sourceLabel}
        />
        <span className={`text-[0.6875rem] font-bold uppercase tracking-[0.1em] transition-colors duration-[180ms] ${
          selected
            ? lossOnSelect.isLargeLoss ? "text-red-400" : "text-indigo-400"
            : "text-[--color-text-secondary]"
        }`}>
          {sourceLabel}
        </span>
        {lastModified && (
          <span className="ml-auto whitespace-nowrap text-[0.625rem] text-[--color-text-secondary] opacity-70">
            {lastModified}
          </span>
        )}
      </label>
      <StudentSection students={data.students} />
      <SubjectSection subjects={data.subjects} />
      <SessionSection
        sessions={data.sessions}
        enrollments={data.enrollments}
        students={data.students}
        subjects={data.subjects}
      />
      {totalLoss > 0 && (
        <div
          className={`mt-3 text-[10.5px] leading-snug ${
            lossOnSelect.isLargeLoss
              ? "text-red-400 font-medium"
              : "text-[--color-text-secondary] opacity-70"
          }`}
        >
          {lossOnSelect.isLargeLoss && "⚠ "}
          선택 시 {formatLossText(lossOnSelect)} 잃음
        </div>
      )}
    </div>
  );
};

/* ── StudentSection: 학생 섹션 (이름, 성별, 생년월일 표시) ── */

function formatGender(gender: string | undefined): string {
  if (!gender) return "";
  if (gender === "male" || gender === "남") return "남";
  if (gender === "female" || gender === "여") return "여";
  return gender;
}

function formatBirthDate(birthDate: string | undefined): string {
  if (!birthDate) return "";
  try {
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return birthDate;
    return `${d.getFullYear().toString().slice(2)}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  } catch {
    return birthDate;
  }
}

interface StudentSectionProps {
  students: Student[];
}

const StudentSection: React.FC<StudentSectionProps> = ({ students }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 first:mt-0">
      {students.length > 0 ? (
        <button
          type="button"
          className="-mx-1 -my-0.5 mb-1.5 flex cursor-pointer items-center gap-1.5 rounded border-none bg-transparent px-1 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[--color-text-secondary] select-none transition-[background] duration-[120ms] hover:bg-slate-400/[0.08]"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          학생
          <span className="rounded bg-slate-600/15 px-[5px] py-px text-[0.6875rem] text-[--color-text-secondary]">{students.length}명</span>
          <span className="ml-0.5 text-[0.5rem] text-[--color-text-secondary] transition-transform duration-150">{expanded ? "▼" : "▶"}</span>
        </button>
      ) : (
        <div className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[--color-text-secondary] select-none">
          학생
          <span className="rounded bg-slate-600/15 px-[5px] py-px text-[0.6875rem] text-[--color-text-secondary]">{students.length}명</span>
        </div>
      )}
      {expanded && students.length > 0 && (
        <ul className="m-0 mt-1 flex max-h-[120px] list-none flex-col gap-0.5 overflow-y-auto border-l-2 border-l-indigo-500/15 p-0 pl-2.5 [scrollbar-color:rgba(148,163,184,0.2)_transparent] [scrollbar-width:thin]">
          {students.map((student, idx) => {
            const gender = formatGender(student.gender);
            const birth = formatBirthDate(student.birthDate);
            const meta = [gender, birth].filter(Boolean).join(" · ");
            return (
              <li key={`${student.id}-${idx}`} className="flex items-center gap-2 rounded px-1.5 py-[3px] text-xs text-[--color-text-secondary] transition-[background] duration-100 hover:bg-white/[0.03]">
                <span className="font-medium text-[--color-text-primary]">{student.name}</span>
                {meta && <span className="text-[0.6875rem] text-[--color-text-secondary] opacity-80">{meta}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/* ── SubjectSection: 과목 섹션 (기본 과목 안내 포함) ── */

interface SubjectSectionProps {
  subjects: Subject[];
}

const SubjectSection: React.FC<SubjectSectionProps> = ({ subjects }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 first:mt-0">
      {subjects.length > 0 ? (
        <button
          type="button"
          className="-mx-1 -my-0.5 mb-1.5 flex cursor-pointer items-center gap-1.5 rounded border-none bg-transparent px-1 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[--color-text-secondary] select-none transition-[background] duration-[120ms] hover:bg-slate-400/[0.08]"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          과목
          <span className="rounded bg-slate-600/15 px-[5px] py-px text-[0.6875rem] text-[--color-text-secondary]">{subjects.length}개</span>
          <span className="ml-0.5 text-[0.5rem] text-[--color-text-secondary] transition-transform duration-150">{expanded ? "▼" : "▶"}</span>
        </button>
      ) : (
        <div className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[--color-text-secondary] select-none">
          과목
          <span className="rounded bg-slate-600/15 px-[5px] py-px text-[0.6875rem] text-[--color-text-secondary]">{subjects.length}개</span>
        </div>
      )}
      {expanded && subjects.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5 border-l-2 border-l-indigo-500/15 pl-2.5">
          <ul className="m-0 mt-0.5 flex list-none flex-col gap-0.5 overflow-y-auto p-0 [scrollbar-color:rgba(148,163,184,0.2)_transparent] [scrollbar-width:thin]">
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded px-1.5 py-[3px] text-xs text-[--color-text-secondary] transition-[background] duration-100 hover:bg-white/[0.03]">
                <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-[--color-text-secondary]" />
                {s.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />}
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ── SessionSection: 수업 섹션 (그룹 수업 개선) ── */

interface SessionSectionProps {
  sessions: Session[];
  enrollments: Enrollment[];
  students: { id: string; name: string }[];
  subjects: Subject[];
}

const SessionSection: React.FC<SessionSectionProps> = ({
  sessions,
  enrollments,
  students,
  subjects,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 first:mt-0">
      {sessions.length > 0 ? (
        <button
          type="button"
          className="-mx-1 -my-0.5 mb-1.5 flex cursor-pointer items-center gap-1.5 rounded border-none bg-transparent px-1 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[--color-text-secondary] select-none transition-[background] duration-[120ms] hover:bg-slate-400/[0.08]"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          수업
          <span className="rounded bg-slate-600/15 px-[5px] py-px text-[0.6875rem] text-[--color-text-secondary]">{sessions.length}개</span>
          <span className="ml-0.5 text-[0.5rem] text-[--color-text-secondary] transition-transform duration-150">{expanded ? "▼" : "▶"}</span>
        </button>
      ) : (
        <div className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[--color-text-secondary] select-none">
          수업
          <span className="rounded bg-slate-600/15 px-[5px] py-px text-[0.6875rem] text-[--color-text-secondary]">{sessions.length}개</span>
        </div>
      )}
      {expanded && sessions.length > 0 && (
        <ul className="m-0 mt-1 flex max-h-[200px] list-none flex-col gap-1 overflow-y-auto border-l-2 border-l-indigo-500/15 p-0 pl-2.5 [scrollbar-color:rgba(148,163,184,0.2)_transparent] [scrollbar-width:thin]">
          {sessions.map((session) => {
            const info = formatSessionDisplay(session, enrollments, students, subjects);
            return (
              <li key={session.id} className="flex flex-wrap items-center gap-1.5 rounded bg-white/[0.02] px-1.5 py-[3px] text-xs leading-snug text-[--color-text-secondary]">
                <span className="shrink-0 font-semibold text-[--color-text-primary]">{info.weekday}</span>
                <span className="shrink-0 text-[--color-text-secondary]">{info.time}</span>
                <span className="shrink-0 font-medium text-[--color-text-primary]">{info.subject}</span>
                {info.isGroup && (
                  <span className="shrink-0 rounded-[3px] border border-indigo-500/20 bg-indigo-500/[0.12] px-1 text-[0.5625rem] font-semibold leading-normal text-indigo-400">그룹</span>
                )}
                <span className="text-[--color-text-secondary] opacity-80">
                  {info.studentNames.join(", ") || "?"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DataConflictModal;
