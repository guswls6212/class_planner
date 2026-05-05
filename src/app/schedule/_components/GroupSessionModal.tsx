"use client";
import React, { useEffect, useRef, useState } from "react";
import { Check, X, ChevronRight, ChevronLeft } from "lucide-react";
import type { GroupSessionData } from "../../../types/scheduleTypes";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { BottomSheet } from "../../../components/molecules/BottomSheet";
import TeacherPillPicker from "../../../components/molecules/TeacherPillPicker";

type SubjectOption = { id: string; name: string; color?: string };
type StudentOption = { id: string; name: string };
type TeacherOption = { id: string; name: string; color: string };

interface GroupSessionModalProps {
  isOpen: boolean;
  groupModalData: GroupSessionData;
  setGroupModalData: React.Dispatch<React.SetStateAction<GroupSessionData>>;
  setShowGroupModal: (open: boolean) => void;
  removeStudent: (studentId: string) => void;
  studentInputValue: string;
  setStudentInputValue: (val: string) => void;
  handleStudentInputKeyDown: (e: React.KeyboardEvent) => void;
  addStudentFromInput: () => void;
  filteredStudentsForModal: StudentOption[];
  addStudent: (studentId: string) => void;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  students: StudentOption[];
  weekdays: string[];
  handleStartTimeChange: (newStartTime: string) => void;
  handleEndTimeChange: (newEndTime: string) => void;
  groupTimeError: string;
  addGroupSession: (data: GroupSessionData) => void;
  onCreateStudent: () => void;
  studentCreating: boolean;
  studentCreateError: string;
  /** 신규 학생/강사/과목 인라인 추가 CTA 노출 여부. owner/admin 만 true. 미지정 시 true. */
  canManage?: boolean;
  // 강사·과목 인라인 추가 (학생 패턴 미러링) — 기존 호출처/테스트 호환 위해 optional
  subjectInputValue?: string;
  setSubjectInputValue?: (val: string) => void;
  /** 성공 시 true 반환 — true 받으면 과목 인라인 row 자동 닫힘 + 새 과목 자동 select. */
  onCreateSubject?: () => Promise<boolean>;
  subjectCreating?: boolean;
  subjectCreateError?: string;
  teacherInputValue?: string;
  setTeacherInputValue?: (val: string) => void;
  /** 성공 시 true 반환 — TeacherPillPicker 인라인 row 자동 닫힘 + 새 강사 자동 선택. */
  onCreateTeacher?: () => Promise<boolean>;
  teacherCreating?: boolean;
  teacherCreateError?: string;
}

const STEPS = ["학생", "과목 & 시간", "확인"];

const GroupSessionModal: React.FC<GroupSessionModalProps> = ({
  isOpen,
  groupModalData,
  setGroupModalData,
  setShowGroupModal,
  removeStudent,
  studentInputValue,
  setStudentInputValue,
  handleStudentInputKeyDown,
  addStudentFromInput,
  filteredStudentsForModal,
  addStudent,
  subjects,
  teachers,
  students,
  weekdays,
  handleStartTimeChange,
  handleEndTimeChange,
  groupTimeError,
  addGroupSession,
  onCreateStudent,
  studentCreating,
  studentCreateError,
  canManage = true,
  subjectInputValue = "",
  setSubjectInputValue = () => {},
  onCreateSubject = async () => false,
  subjectCreating = false,
  subjectCreateError = "",
  teacherInputValue = "",
  setTeacherInputValue = () => {},
  onCreateTeacher = async () => false,
  teacherCreating = false,
  teacherCreateError = "",
}) => {
  const [step, setStep] = useState(0);
  const [subjectExpanding, setSubjectExpanding] = useState(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  // Subject inline row — auto focus + ESC close
  useEffect(() => {
    if (subjectExpanding) subjectInputRef.current?.focus();
  }, [subjectExpanding]);

  useEffect(() => {
    if (!subjectExpanding) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSubjectExpanding(false);
        setSubjectInputValue("");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [subjectExpanding, setSubjectInputValue]);

  const handleCreateSubjectInline = async () => {
    const trimmed = subjectInputValue.trim();
    if (!trimmed || subjectCreating) return;
    const success = await onCreateSubject();
    if (success) setSubjectExpanding(false);
  };

  const { containerRef } = useModalA11y({
    isOpen,
    onClose: () => setShowGroupModal(false),
  });
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const selectableStudents = filteredStudentsForModal.filter(
    (st) => !groupModalData.studentIds.includes(st.id)
  );
  const studentExistsExact = students.some(
    (s) => s.name.toLowerCase() === studentInputValue.toLowerCase()
  );

  const canProceedStep0 = groupModalData.studentIds.length > 0;
  const canProceedStep1 =
    !!groupModalData.subjectId &&
    !!groupModalData.startTime &&
    !!groupModalData.endTime &&
    !groupTimeError;

  // ── Step bar ──────────────────────────────────────────────────────────
  const stepBar = (
    <div className="px-6 pt-5 pb-3">
      <div className="flex items-center">
        {STEPS.map((label, idx) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  idx < step
                    ? "bg-[var(--color-accent-hover)] text-[var(--color-bg-primary)]"
                    : idx === step
                      ? "border-2 border-[var(--color-accent-hover)] text-[var(--color-accent-hover)] bg-transparent"
                      : "border-2 border-[var(--color-border)] text-[var(--color-text-muted)] bg-transparent"
                }`}
              >
                {idx < step ? <Check size={13} strokeWidth={3} /> : idx + 1}
              </div>
              <span
                className={`text-[10px] font-medium leading-none ${
                  idx === step
                    ? "text-[var(--color-accent-hover)]"
                    : idx < step
                      ? "text-[var(--color-text-secondary)]"
                      : "text-[var(--color-text-muted)]"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-2 mt-[-10px] rounded-full transition-colors ${
                  idx < step
                    ? "bg-[var(--color-accent-hover)]"
                    : "bg-[var(--color-border)]"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // ── Step 0: 학생 ──────────────────────────────────────────────────────
  const step0Content = (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
        수업에 참여할 학생을 추가하세요
      </p>

      {/* Selected chips */}
      <div className="min-h-[40px] flex flex-wrap gap-2 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2">
        {groupModalData.studentIds.length === 0 && (
          <span className="text-[12px] text-[var(--color-text-muted)]">선택된 학생 없음</span>
        )}
        {groupModalData.studentIds.map((studentId) => {
          const student = students.find((s) => s.id === studentId);
          return student ? (
            <span
              key={studentId}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-hover)]/15 border border-[var(--color-accent-hover)]/30 px-2.5 py-1 text-[12px] font-medium text-[var(--color-accent-hover)]"
            >
              {student.name}
              <button
                type="button"
                className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-[var(--color-accent-hover)]/20 transition-colors"
                onClick={() => removeStudent(studentId)}
                aria-label={`${student.name} 제거`}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </span>
          ) : null;
        })}
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          id="modal-student-input"
          type="text"
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-hover)]/50 transition-colors"
          placeholder="학생 이름 검색..."
          value={studentInputValue}
          onChange={(e) => setStudentInputValue(e.target.value)}
          onKeyDown={handleStudentInputKeyDown}
        />
        <button
          type="button"
          className="flex-shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:opacity-90 transition-opacity"
          onClick={
            canManage && selectableStudents.length === 0 && !studentExistsExact && studentInputValue.trim()
              ? onCreateStudent
              : addStudentFromInput
          }
          disabled={!studentInputValue.trim() || studentCreating}
        >
          {canManage && selectableStudents.length === 0 && !studentExistsExact && studentInputValue.trim()
            ? "새로 추가"
            : "추가"}
        </button>
      </div>

      {/* Student list / autocomplete dropdown — list-first UX:
          입력 전에도 학생 목록을 보여 줌. selectableStudents 가 있으면 항상 렌더,
          없을 때만 입력값에 따라 안내 메시지 또는 새 학생 CTA. */}
      {selectableStudents.length > 0 ? (
        // 단일 스크롤 컨테이너 (모달 step content)에 위임 — 이전엔 여기에도
        // max-h-60 overflow-y-auto 가 있어 중첩 스크롤로 사용자가 학생
        // 리스트를 스크롤 못 하던 버그. 모달 외곽이 max-h-[55vh] 로 cap.
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-hidden shadow-lg">
          {selectableStudents.map((student) => (
            <button
              key={student.id}
              type="button"
              className="flex w-full items-center gap-2.5 border-b border-[var(--color-border)] bg-transparent px-3 py-2.5 text-left text-[13px] text-[var(--color-text-primary)] last:border-b-0 hover:bg-[var(--color-bg-secondary)] transition-colors"
              onClick={() => addStudent(student.id)}
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-hover)]/15 text-[10px] font-bold text-[var(--color-accent-hover)]">
                {student.name[0]}
              </span>
              {student.name}
            </button>
          ))}
        </div>
      ) : (
        studentInputValue && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-hidden shadow-lg">
            <div className="p-3 text-center text-[12px] text-[var(--color-text-secondary)]">
              {studentExistsExact ? (
                <span>이미 추가된 학생입니다</span>
              ) : canManage ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="w-full min-h-[44px] rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-left text-[13px] font-medium text-white hover:enabled:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    onClick={onCreateStudent}
                    disabled={studentCreating}
                  >
                    {studentCreating
                      ? "추가 중..."
                      : `＋ '${studentInputValue.trim()}' 새 학생으로 추가`}
                  </button>
                  {studentCreateError && (
                    <p className="text-[11px] text-[var(--color-danger)]">{studentCreateError}</p>
                  )}
                </div>
              ) : (
                <span>일치하는 학생이 없습니다</span>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );

  // ── Step 1: 과목 & 시간 ───────────────────────────────────────────────
  const step1Content = (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
        과목과 수업 일정을 설정하세요
      </p>

      {/* Subject */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="modal-subject" className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          과목 <span className="text-[var(--color-danger)]">*</span>
        </label>
        <div className="flex gap-2">
          <select
            id="modal-subject"
            className="flex-1 appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-hover)]/50 disabled:opacity-40 transition-colors"
            value={groupModalData.subjectId}
            onChange={(e) => setGroupModalData((prev) => ({ ...prev, subjectId: e.target.value }))}
            disabled={groupModalData.studentIds.length === 0}
          >
            <option value="">과목을 선택하세요</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          {canManage && !subjectExpanding && (
            <button
              type="button"
              onClick={() => setSubjectExpanding(true)}
              aria-label="새 과목 추가"
              className="flex-shrink-0 rounded-xl border border-dashed border-[var(--color-accent)] px-3 py-2.5 text-[14px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              ＋
            </button>
          )}
        </div>
        {canManage && subjectExpanding && (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] px-2 py-1.5">
              <input
                ref={subjectInputRef}
                type="text"
                value={subjectInputValue}
                onChange={(e) => setSubjectInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateSubjectInline();
                  }
                }}
                placeholder="새 과목 이름"
                disabled={subjectCreating}
                className="flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none px-2 py-1"
              />
              <button
                type="button"
                onClick={handleCreateSubjectInline}
                disabled={!subjectInputValue.trim() || subjectCreating}
                className="flex-shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:opacity-90 transition-opacity"
              >
                {subjectCreating ? "생성 중..." : "생성"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubjectExpanding(false);
                  setSubjectInputValue("");
                }}
                aria-label="닫기"
                className="flex-shrink-0 rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
            {subjectCreateError && (
              <p className="text-[11px] text-[var(--color-danger)] px-2" role="alert">
                {subjectCreateError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Weekday */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="modal-weekday" className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          요일 <span className="text-[var(--color-danger)]">*</span>
        </label>
        <select
          id="modal-weekday"
          className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-hover)]/50 transition-colors"
          value={groupModalData.weekday}
          onChange={(e) => setGroupModalData((prev) => ({ ...prev, weekday: Number(e.target.value) }))}
        >
          {weekdays.map((w, idx) => (
            <option key={idx} value={idx}>{w}</option>
          ))}
        </select>
      </div>

      {/* Teacher (always shown, pills) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          강사
        </label>
        <TeacherPillPicker
          teachers={teachers}
          selectedTeacherId={groupModalData.teacherId ?? null}
          onSelect={(id) => setGroupModalData((prev) => ({ ...prev, teacherId: id ?? undefined }))}
          canManage={canManage}
          inputValue={teacherInputValue}
          setInputValue={setTeacherInputValue}
          onCreate={onCreateTeacher}
          creating={teacherCreating}
          createError={teacherCreateError}
        />
      </div>

      {/* Time range */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          수업 시간 <span className="text-[var(--color-danger)]">*</span>
        </span>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
          <input
            id="modal-start-time"
            type="time"
            className="flex-1 bg-transparent text-[14px] font-semibold text-[var(--color-text-primary)] outline-none"
            value={groupModalData.startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
          />
          <span className="text-[var(--color-text-muted)] text-[12px] font-medium">—</span>
          <input
            id="modal-end-time"
            type="time"
            className="flex-1 bg-transparent text-[14px] font-semibold text-[var(--color-text-primary)] outline-none"
            value={groupModalData.endTime}
            onChange={(e) => handleEndTimeChange(e.target.value)}
          />
        </div>
        {groupTimeError && (
          <p className="text-[11px] text-[var(--color-danger)]" role="alert">{groupTimeError}</p>
        )}
      </div>

      {/* Room (always shown) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="modal-room" className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          강의실
        </label>
        <input
          id="modal-room"
          type="text"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-hover)]/50 transition-colors"
          placeholder="강의실 (선택사항)"
          value={groupModalData.room || ""}
          onChange={(e) => setGroupModalData((prev) => ({ ...prev, room: e.target.value }))}
        />
      </div>
    </div>
  );

  // ── Step 2: 확인 ──────────────────────────────────────────────────────
  const selectedSubject = subjects.find((s) => s.id === groupModalData.subjectId);
  const selectedTeacher = teachers.find((t) => t.id === groupModalData.teacherId);
  const selectedStudentNames = groupModalData.studentIds
    .map((id) => students.find((s) => s.id === id)?.name)
    .filter(Boolean);

  const step2Content = (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
        아래 내용으로 수업을 추가합니다
      </p>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden">
        {/* Subject accent header */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ backgroundColor: selectedSubject?.color ? `${selectedSubject.color}22` : "transparent", borderBottom: `1px solid ${selectedSubject?.color ?? "var(--color-border)"}33` }}
        >
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedSubject?.color ?? "var(--color-accent-hover)" }} />
          <span className="font-bold text-[15px] text-[var(--color-text-primary)]">
            {selectedSubject?.name ?? "—"}
          </span>
          {selectedTeacher && (
            <span className="ml-auto text-[12px] text-[var(--color-text-secondary)]">
              {selectedTeacher.name} 선생님
            </span>
          )}
        </div>

        {/* Details */}
        <div className="divide-y divide-[var(--color-border)]/50">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide font-semibold">학생</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
              {selectedStudentNames.map((name) => (
                <span key={name} className="rounded-full bg-[var(--color-accent-hover)]/10 border border-[var(--color-accent-hover)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-hover)]">
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide font-semibold">요일</span>
            <span className="text-[13px] text-[var(--color-text-primary)] font-medium">
              {weekdays[groupModalData.weekday]}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide font-semibold">시간</span>
            <span className="text-[13px] text-[var(--color-text-primary)] font-semibold tabular-nums">
              {groupModalData.startTime} — {groupModalData.endTime}
            </span>
          </div>
          {groupModalData.room && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide font-semibold">강의실</span>
              <span className="text-[13px] text-[var(--color-text-primary)]">{groupModalData.room}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const stepContents = [step0Content, step1Content, step2Content];

  // ── Footer ────────────────────────────────────────────────────────────
  const footer = (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--color-border)]">
      <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums select-none">
        {step + 1} / {STEPS.length}
      </span>
      <div className="flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <ChevronLeft size={14} />이전
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !canProceedStep0) || (step === 1 && !canProceedStep1)}
            className="flex items-center gap-1 rounded-xl bg-[var(--color-accent-hover)] px-5 py-2 text-[13px] font-semibold text-[var(--color-bg-primary)] disabled:opacity-35 disabled:cursor-not-allowed hover:enabled:opacity-90 transition-opacity"
          >
            다음<ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => addGroupSession(groupModalData)}
            className="rounded-xl bg-[var(--color-accent-hover)] px-6 py-2 text-[13px] font-semibold text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity"
          >
            수업 추가
          </button>
        )}
      </div>
    </div>
  );

  // ── Mobile (BottomSheet) ──────────────────────────────────────────────
  if (!isDesktop && isOpen) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setShowGroupModal(false)}
        title="수업 추가"
        aria-labelledby="group-session-modal-title"
      >
        <div className="flex flex-col gap-4">
          {stepBar}
          <div className="px-4 pb-2">{stepContents[step]}</div>
          <div className="px-4 pb-4">{footer}</div>
        </div>
      </BottomSheet>
    );
  }

  if (!isOpen) return null;

  // ── Desktop (Glass Card) ──────────────────────────────────────────────
  return (
    <div className="modal-backdrop">
      <div
        className="fixed left-1/2 top-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-session-modal-title"
        ref={containerRef}
      >
        <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5">
            <h4
              id="group-session-modal-title"
              className="text-[17px] font-bold text-[var(--color-text-primary)]"
            >
              수업 추가
            </h4>
            <button
              type="button"
              onClick={() => setShowGroupModal(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors"
              aria-label="닫기"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Step bar */}
          {stepBar}

          {/* Step content */}
          <div className="px-6 pb-2 max-h-[55vh] overflow-y-auto">
            {stepContents[step]}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-2">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSessionModal;
