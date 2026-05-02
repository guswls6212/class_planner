"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Trash2, ArrowLeft, BookOpen, Calendar, Phone, Mail, User, FileText } from "lucide-react";
import type { Teacher, Session, Enrollment, Subject, Student, TeacherRole } from "@/lib/planner";
import { DEFAULT_TEACHER_COLORS } from "@/lib/teacherColors";

interface TeacherDetailPanelProps {
  teacher: Teacher;
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  students: Student[];
  onUpdate: (id: string, updates: {
    name?: string;
    color?: string;
    email?: string | null;
    phone?: string | null;
    role?: TeacherRole | null;
    notes?: string | null;
  }) => void;
  onAddSubject: (teacherId: string, subjectId: string) => void;
  onRemoveSubject: (teacherId: string, subjectId: string) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  /** When false, name/color/role fields become read-only and add/delete buttons are hidden. Default: true */
  canManage?: boolean;
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const ROLE_LABELS: Record<TeacherRole, string> = {
  owner: "원장",
  admin: "강사",
  member: "직원",
};

export function TeacherDetailPanel({
  teacher,
  sessions,
  enrollments,
  subjects,
  onUpdate,
  onAddSubject,
  onRemoveSubject,
  onDelete,
  onBack,
  canManage = true,
}: TeacherDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(teacher.name);
  const [editColor, setEditColor] = useState(teacher.color);
  const [editEmail, setEditEmail] = useState(teacher.email ?? "");
  const [editPhone, setEditPhone] = useState(teacher.phone ?? "");
  const [editRole, setEditRole] = useState<TeacherRole | null>(teacher.role ?? null);
  const [editNotes, setEditNotes] = useState(teacher.notes ?? "");

  useEffect(() => {
    setEditName(teacher.name);
    setEditColor(teacher.color);
    setEditEmail(teacher.email ?? "");
    setEditPhone(teacher.phone ?? "");
    setEditRole(teacher.role ?? null);
    setEditNotes(teacher.notes ?? "");
    setIsEditing(false);
  }, [teacher.id]);

  const teacherSessions = sessions.filter((s) => s.teacherId === teacher.id);

  const teacherStudentIds = new Set(
    teacherSessions
      .flatMap((s) => s.enrollmentIds ?? [])
      .map((eid) => enrollments.find((e) => e.id === eid)?.studentId)
      .filter(Boolean)
  );

  const handleSave = () => {
    const name = editName.trim();
    if (!name) return;
    onUpdate(teacher.id, {
      name,
      email: editEmail || null,
      phone: editPhone || null,
      role: editRole,
      notes: editNotes || null,
    });
    setIsEditing(false);
  };

  const colorSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleColorClick = useCallback(
    (c: string) => {
      setEditColor(c);
      if (colorSyncTimerRef.current) clearTimeout(colorSyncTimerRef.current);
      colorSyncTimerRef.current = setTimeout(() => {
        onUpdate(teacher.id, { color: c });
      }, 400);
    },
    [teacher.id, onUpdate]
  );

  useEffect(() => {
    return () => {
      if (colorSyncTimerRef.current) clearTimeout(colorSyncTimerRef.current);
    };
  }, []);

  const initial = teacher.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-0 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 lg:hidden text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            aria-label="목록으로"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
        )}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 text-white"
          style={{ backgroundColor: editColor }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
            {teacher.name}
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            주간 {teacherSessions.length}회 · 담당 {teacherStudentIds.size}명
          </p>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button
              onClick={() => setIsEditing((v) => !v)}
              className="p-2 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] transition-colors"
              aria-label="편집"
            >
              <Pencil size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => onDelete(teacher.id)}
              className="p-2 rounded-md text-red-500 hover:bg-[var(--color-overlay-light)] transition-colors"
              aria-label="삭제"
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--color-bg-secondary)] rounded-md p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] mb-1">
            <BookOpen size={14} strokeWidth={1.5} />
            <span>담당 학생</span>
          </div>
          <p className="text-xl font-bold text-accent">{teacherStudentIds.size}명</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-md p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] mb-1">
            <Calendar size={14} strokeWidth={1.5} />
            <span>주간 수업</span>
          </div>
          <p className="text-xl font-bold text-accent">{teacherSessions.length}회</p>
        </div>
      </div>

      {/* 담당 과목 section */}
      <div className="border-t border-[var(--color-border)] pt-4 mt-1 mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          담당 과목
        </h3>
        {subjects.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-muted)]">과목을 먼저 등록해주세요.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => {
              const isAssigned = (teacher.subjectIds ?? []).includes(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => {
                    if (!canManage) return;
                    isAssigned
                      ? onRemoveSubject(teacher.id, subject.id)
                      : onAddSubject(teacher.id, subject.id);
                  }}
                  disabled={!canManage}
                  aria-pressed={isAssigned}
                  className={[
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] transition-all",
                    !canManage ? "cursor-default" : "",
                    isAssigned
                      ? "border border-[var(--color-accent)] text-[var(--color-text-primary)] font-medium"
                      : "border border-[var(--color-border)] text-[var(--color-text-secondary)]" + (canManage ? " hover:border-[var(--color-accent)]" : ""),
                  ].join(" ")}
                  style={isAssigned ? { background: "rgba(167,139,250,0.12)" } : { background: "var(--color-bg-secondary)" }}
                >
                  <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: subject.color ?? "#6366f1" }} />
                  {subject.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Read-only banner for member role */}
      {!canManage && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5">
          <span className="mt-0.5 flex-shrink-0 text-[var(--color-text-muted)]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
            </svg>
          </span>
          <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">
            학원장만 이름·색·역할을 변경할 수 있어요
          </p>
        </div>
      )}

      {/* 연락처 · 역할 section */}
      <div className="border-t border-[var(--color-border)] pt-4 mt-1 mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          연락처 · 역할
        </h3>
        {isEditing && canManage ? (
          <div className="flex flex-col gap-3">
            {/* Name input */}
            <div className="flex items-center gap-2">
              <label className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">이름</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSave();
                }}
                className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {/* Email + Phone grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                  <Mail size={11} strokeWidth={1.5} />
                  이메일
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className="border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                  <Phone size={11} strokeWidth={1.5} />
                  전화번호
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            {/* Role pills */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                <User size={11} strokeWidth={1.5} />
                역할
              </label>
              <div className="flex gap-2">
                {(["owner", "admin", "member"] as TeacherRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditRole(editRole === r ? null : r)}
                    aria-pressed={editRole === r}
                    className={[
                      "px-3 py-1 rounded-full text-[12px] transition-all border",
                      editRole === r
                        ? "border-[var(--color-accent)] bg-[rgba(167,139,250,0.15)] text-[var(--color-text-primary)] font-medium"
                        : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]",
                    ].join(" ")}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                <FileText size={11} strokeWidth={1.5} />
                메모
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="강사 관련 메모..."
                className="border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
            </div>
            {/* Save / Cancel */}
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-accent text-[var(--color-admin-ink)] rounded-md font-medium text-[13px] hover:opacity-90 transition-opacity"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditName(teacher.name);
                  setEditEmail(teacher.email ?? "");
                  setEditPhone(teacher.phone ?? "");
                  setEditRole(teacher.role ?? null);
                  setEditNotes(teacher.notes ?? "");
                  setIsEditing(false);
                }}
                className="flex-1 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-md text-[13px] hover:opacity-80 transition-opacity"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                <Mail size={11} strokeWidth={1.5} />
                이메일
              </dt>
              <dd className="text-[var(--color-text-primary)]">{teacher.email || "—"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                <Phone size={11} strokeWidth={1.5} />
                전화번호
              </dt>
              <dd className="text-[var(--color-text-primary)]">{teacher.phone || "—"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                <User size={11} strokeWidth={1.5} />
                역할
              </dt>
              <dd>
                {teacher.role ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[12px] border border-[var(--color-accent)] bg-[rgba(167,139,250,0.12)] text-[var(--color-text-primary)]">
                    {ROLE_LABELS[teacher.role]}
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                )}
              </dd>
            </div>
            {teacher.notes && (
              <div className="flex items-start gap-2">
                <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 pt-0.5">
                  <FileText size={11} strokeWidth={1.5} />
                  메모
                </dt>
                <dd className="text-[var(--color-text-primary)] text-[13px] whitespace-pre-wrap">{teacher.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* 수업 일정 section */}
      <div className="border-t border-[var(--color-border)] pt-4 mt-1 mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          수업 일정
        </h3>
        {teacherSessions.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-muted)]">담당 수업이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {teacherSessions
              .slice()
              .sort((a, b) => a.weekday - b.weekday || (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))
              .map((session) => {
                const subjectId = session.enrollmentIds
                  ?.map((eid) => enrollments.find((e) => e.id === eid)?.subjectId)
                  .find(Boolean);
                const subject = subjects.find((s) => s.id === subjectId);
                return (
                  <li
                    key={session.id}
                    className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: subject?.color ?? editColor }}
                    />
                    <span>{subject?.name ?? "미분류"}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {WEEKDAY_LABELS[session.weekday]} {session.startsAt}–{session.endsAt}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* 색상 section — always visible; interactive only for owners/admins */}
      <div className="border-t border-[var(--color-border)] pt-4 mt-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          색상
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_TEACHER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => canManage && handleColorClick(c)}
              disabled={!canManage}
              className={[
                "w-7 h-7 rounded-full border-2",
                canManage ? "transition-transform hover:scale-110" : "cursor-default opacity-80",
              ].join(" ")}
              style={{
                backgroundColor: c,
                borderColor: editColor === c ? "var(--color-text-primary)" : "transparent",
              }}
              aria-label={c}
            />
          ))}
        </div>
        {canManage && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="color"
              value={editColor}
              onChange={(e) => handleColorClick(e.target.value)}
              className="h-7 w-8 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
              title="직접 선택"
            />
            <span className="text-[11px] text-[var(--color-text-muted)]">직접 선택</span>
          </div>
        )}
      </div>
    </div>
  );
}
