"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, ArrowLeft, BookOpen, Calendar } from "lucide-react";
import type { Student, Subject, Enrollment, Session } from "@/lib/planner";

interface StudentDetailPanelProps {
  student: Student;
  subjects: Subject[];
  enrollments: Enrollment[];
  sessions: Session[];
  onUpdate: (id: string, updates: Partial<Student>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onBack?: () => void;
}

export function StudentDetailPanel({
  student, subjects, enrollments, sessions, onUpdate, onDelete, onBack,
}: StudentDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    name: student.name,
    grade: student.grade ?? "",
    school: student.school ?? "",
    phone: student.phone ?? "",
    gender: student.gender ?? "",
    birthDate: student.birthDate ?? "",
  });

  // Re-sync when student changes
  useEffect(() => {
    setEditFields({
      name: student.name,
      grade: student.grade ?? "",
      school: student.school ?? "",
      phone: student.phone ?? "",
      gender: student.gender ?? "",
      birthDate: student.birthDate ?? "",
    });
    setIsEditing(false);
  }, [student.id]);

  const studentEnrollments = enrollments.filter((e) => e.studentId === student.id);
  const studentSubjectIds = new Set(studentEnrollments.map((e) => e.subjectId));
  const studentSessions = sessions.filter((s) =>
    s.enrollmentIds?.some((eid) => studentEnrollments.some((e) => e.id === eid))
  );

  const handleSave = async () => {
    const updates: Partial<Student> = {};
    if (editFields.name) updates.name = editFields.name;
    if (editFields.grade !== undefined) updates.grade = editFields.grade || undefined;
    if (editFields.school !== undefined) updates.school = editFields.school || undefined;
    if (editFields.phone !== undefined) updates.phone = editFields.phone || undefined;
    if (editFields.gender !== undefined) updates.gender = editFields.gender || undefined;
    if (editFields.birthDate !== undefined) updates.birthDate = editFields.birthDate || undefined;
    const success = await onUpdate(student.id, updates);
    if (success) setIsEditing(false);
  };

  const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
  const initial = student.name.charAt(0).toUpperCase();

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
        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-[var(--color-admin-ink)] font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">{student.name}</h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {[student.grade, student.school].filter(Boolean).join(" · ") || "프로필 미입력"}
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
            onClick={() => onDelete(student.id)}
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
            <span>등록 과목</span>
          </div>
          <p className="text-xl font-bold text-accent">{studentSubjectIds.size}</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-md p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] mb-1">
            <Calendar size={14} strokeWidth={1.5} />
            <span>주간 수업</span>
          </div>
          <p className="text-xl font-bold text-accent">{studentSessions.length}회</p>
        </div>
      </div>

      {/* Schedule List */}
      <section>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">수업 일정</h3>
        {studentSessions.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-muted)]">등록된 수업이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {studentSessions.map((session) => {
              const enrollment = studentEnrollments.find((e) =>
                session.enrollmentIds?.includes(e.id)
              );
              const subject = enrollment
                ? subjects.find((s) => s.id === enrollment.subjectId)
                : undefined;
              return (
                <li key={session.id} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject?.color ?? "#3b82f6" }}
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
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">프로필</h3>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            {(
              [
                { key: "name", label: "이름", type: "text" },
                { key: "grade", label: "학년", type: "text", placeholder: "예: 중2" },
                { key: "school", label: "학교", type: "text" },
                { key: "phone", label: "전화번호", type: "tel", placeholder: "010-0000-0000" },
                { key: "gender", label: "성별", type: "text", placeholder: "남 / 여" },
                { key: "birthDate", label: "생년월일", type: "date" },
              ] as { key: keyof typeof editFields; label: string; type: string; placeholder?: string }[]
            ).map(({ key, label, type, placeholder }) => (
              <div key={key} className="flex items-center gap-2">
                <label className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">{label}</label>
                <input
                  type={type}
                  value={editFields[key]}
                  onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
            <div className="flex gap-2 mt-2">
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
          </div>
        ) : (
          <dl className="flex flex-col gap-1.5 text-sm">
            {(
              [
                { key: "grade", label: "학년" },
                { key: "school", label: "학교" },
                { key: "phone", label: "전화번호" },
                { key: "gender", label: "성별" },
                { key: "birthDate", label: "생년월일" },
              ] as { key: keyof Student; label: string }[]
            ).map(({ key, label }) =>
              student[key] ? (
                <div key={key} className="flex items-baseline gap-2">
                  <dt className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">{label}</dt>
                  <dd className="text-[var(--color-text-primary)]">{String(student[key])}</dd>
                </div>
              ) : null
            )}
            {!student.grade && !student.school && !student.phone && (
              <p className="text-[11px] text-[var(--color-text-muted)]">프로필을 입력해 편집 버튼을 누르세요.</p>
            )}
          </dl>
        )}
      </section>
    </div>
  );
}
