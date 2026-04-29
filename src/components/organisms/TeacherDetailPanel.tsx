"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, ArrowLeft, BookOpen, Calendar } from "lucide-react";
import type { Teacher, Session, Enrollment, Subject, Student } from "@/lib/planner";
import { DEFAULT_TEACHER_COLORS } from "@/lib/teacherColors";

interface TeacherDetailPanelProps {
  teacher: Teacher;
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  students: Student[];
  onUpdate: (id: string, name: string, color: string) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function TeacherDetailPanel({
  teacher,
  sessions,
  enrollments,
  subjects,
  onUpdate,
  onDelete,
  onBack,
}: TeacherDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(teacher.name);
  const [editColor, setEditColor] = useState(teacher.color);

  useEffect(() => {
    setEditName(teacher.name);
    setEditColor(teacher.color);
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
    onUpdate(teacher.id, name, editColor);
    setIsEditing(false);
  };

  const initial = teacher.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
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
          style={{ backgroundColor: teacher.color }}
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* Schedule List */}
      <section>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">
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
                      style={{ backgroundColor: subject?.color ?? teacher.color }}
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
      </section>

      {/* Profile Section */}
      <section>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">
          프로필
        </h3>
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">
                이름
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex items-start gap-2">
              <label className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] pt-1">
                색상
              </label>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_TEACHER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: editColor === c ? "var(--color-text-primary)" : "transparent",
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-7 w-8 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                    title="직접 선택"
                  />
                  <span className="text-[11px] text-[var(--color-text-muted)]">직접 선택</span>
                </div>
              </div>
            </div>
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
                  setEditColor(teacher.color);
                  setIsEditing(false);
                }}
                className="flex-1 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-md text-[13px] hover:opacity-80 transition-opacity"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center gap-2">
              <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">이름</dt>
              <dd className="text-[var(--color-text-primary)]">{teacher.name}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">색상</dt>
              <dd>
                <span
                  className="inline-block w-4 h-4 rounded-full border border-[var(--color-border)]"
                  style={{ backgroundColor: teacher.color }}
                />
              </dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
