"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, ArrowLeft, Users, Calendar } from "lucide-react";
import type { Subject, Student, Enrollment, Session } from "@/lib/planner";

interface SubjectDetailPanelProps {
  subject: Subject;
  students: Student[];
  enrollments: Enrollment[];
  sessions: Session[];
  onUpdate: (id: string, name: string, color: string) => Promise<boolean | void>;
  onDelete: (id: string) => void;
  onBack?: () => void;
}

export function SubjectDetailPanel({
  subject, students, enrollments, sessions, onUpdate, onDelete, onBack,
}: SubjectDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(subject.name);
  const [editColor, setEditColor] = useState(subject.color ?? "#3b82f6");

  useEffect(() => {
    setEditName(subject.name);
    setEditColor(subject.color ?? "#3b82f6");
    setIsEditing(false);
  }, [subject.id]);

  const subjectEnrollments = enrollments.filter((e) => e.subjectId === subject.id);
  const enrolledStudentIds = new Set(subjectEnrollments.map((e) => e.studentId));
  const enrolledStudents = students.filter((s) => enrolledStudentIds.has(s.id));
  const subjectSessions = sessions.filter((s) =>
    s.enrollmentIds?.some((eid) => subjectEnrollments.some((e) => e.id === eid))
  );

  const handleSave = async () => {
    const success = await onUpdate(subject.id, editName, editColor);
    if (success) setIsEditing(false);
  };

  const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

  // Predefined palette colors
  const COLOR_PALETTE = [
    "#a78bfa", "#86efac", "#fca5a5", "#fcd34d",
    "#67e8f9", "#f9a8d4", "#6ee7b7", "#fb923c",
    "#818cf8", "#34d399",
  ];

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
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: subject.color ?? "#3b82f6" }}
        >
          {subject.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">{subject.name}</h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">{enrolledStudents.length}명 등록</p>
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
            onClick={() => onDelete(subject.id)}
            className="p-2 rounded-md text-red-500 hover:bg-[var(--color-overlay-light)] transition-colors"
            aria-label="삭제"
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-bg-secondary)] rounded-md p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] mb-1">
            <Users size={14} strokeWidth={1.5} />
            <span>등록 학생</span>
          </div>
          <p className="text-xl font-bold text-accent">{enrolledStudents.length}</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-md p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] mb-1">
            <Calendar size={14} strokeWidth={1.5} />
            <span>주간 수업</span>
          </div>
          <p className="text-xl font-bold text-accent">{subjectSessions.length}회</p>
        </div>
      </div>

      {/* Enrolled Students */}
      <section>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">등록 학생</h3>
        {enrolledStudents.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-muted)]">등록된 학생이 없습니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {enrolledStudents.map((s) => (
              <li
                key={s.id}
                className="px-2 py-0.5 bg-[var(--color-bg-secondary)] rounded-full text-[11px] text-[var(--color-text-primary)]"
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Schedule */}
      <section>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">수업 일정</h3>
        {subjectSessions.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-muted)]">등록된 수업이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {subjectSessions.map((session) => (
              <li key={session.id} className="text-sm text-[var(--color-text-primary)]">
                {WEEKDAY_LABELS[session.weekday]} {session.startsAt}–{session.endsAt}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Edit Form */}
      {isEditing && (
        <section className="flex flex-col gap-3">
          <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)]">편집</h3>
          <div className="flex items-center gap-2">
            <label className="w-16 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">과목명</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-2">색상</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-1 ${
                    editColor === color
                      ? "ring-2 ring-[var(--color-text-primary)]"
                      : "ring-0"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`색상 ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-accent text-[var(--color-admin-ink)] rounded-md font-medium text-[13px] hover:opacity-90 transition-opacity"
            >
              저장
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-md text-[13px] hover:opacity-80 transition-opacity"
            >
              취소
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
