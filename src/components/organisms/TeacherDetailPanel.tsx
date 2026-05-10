"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, ArrowLeft, BookOpen, Calendar } from "lucide-react";
import type { Teacher, Session, Enrollment, Subject, TeacherRole } from "@/lib/planner";
import { TeacherEditForm } from "@/components/molecules/TeacherEditForm";
import { TeacherContactDisplay } from "@/components/molecules/TeacherContactDisplay";
import {
  NAME_MAX_LENGTH,
  isValidKoreanPhone,
} from "@/lib/validation/profileSchemas";
import { TeacherScheduleList } from "@/components/molecules/TeacherScheduleList";
import { TeacherSubjectPills } from "@/components/molecules/TeacherSubjectPills";

interface TeacherDetailPanelProps {
  teacher: Teacher;
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  onUpdate: (id: string, updates: {
    name?: string;
    color?: string;
    email?: string | null;
    phone?: string | null;
    role?: TeacherRole | null;
    notes?: string | null;
  }) => Promise<boolean> | void;
  onAddSubject: (teacherId: string, subjectId: string) => void;
  onRemoveSubject: (teacherId: string, subjectId: string) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  /** When false, name/color/role fields become read-only and add/delete buttons are hidden. Default: true */
  canManage?: boolean;
  /** When true and !canManage, shows limited edit form for email/phone/notes (own profile). Default: false */
  isOwnTeacher?: boolean;
}

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
  isOwnTeacher = false,
}: TeacherDetailPanelProps) {
  // canEditOwn: member viewing their own teacher profile can edit email/phone/notes
  const canEditOwn = !canManage && isOwnTeacher;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(teacher.name);
  const [editColor, setEditColor] = useState(teacher.color);
  const [editEmail, setEditEmail] = useState(teacher.email ?? "");
  const [editPhone, setEditPhone] = useState(teacher.phone ?? "");
  const [editNotes, setEditNotes] = useState(teacher.notes ?? "");
  const [editErr, setEditErr] = useState("");

  useEffect(() => {
    setEditName(teacher.name);
    setEditColor(teacher.color);
    setEditEmail(teacher.email ?? "");
    setEditPhone(teacher.phone ?? "");
    setEditNotes(teacher.notes ?? "");
    setEditErr("");
    setIsEditing(false);
  }, [teacher.id]);

  const teacherSessions = sessions.filter((s) => s.teacherId === teacher.id);

  const teacherStudentIds = new Set(
    teacherSessions
      .flatMap((s) => s.enrollmentIds ?? [])
      .map((eid) => enrollments.find((e) => e.id === eid)?.studentId)
      .filter(Boolean)
  );

  const handleSave = async () => {
    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
      setEditErr("올바른 이메일 형식이 아닙니다.");
      return;
    }
    if (editPhone && !isValidKoreanPhone(editPhone)) {
      setEditErr("유효한 전화번호 형식이 아닙니다. (예: 010-1234-5678, 02-123-4567)");
      return;
    }

    let result: boolean | void;
    if (canManage) {
      const name = editName.trim();
      if (!name) {
        setEditErr("강사 이름을 입력해주세요.");
        return;
      }
      if (name.length > NAME_MAX_LENGTH) {
        setEditErr(`강사 이름은 최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`);
        return;
      }
      // 색상도 저장 버튼 클릭 시 함께 commit (autosave 제거, ADR-015).
      // role은 detail에서 변경 불가 — settings 멤버 흐름이 SSOT.
      result = await onUpdate(teacher.id, {
        name,
        color: editColor,
        email: editEmail || null,
        phone: editPhone || null,
        notes: editNotes || null,
      });
    } else {
      // canEditOwn path: only email/phone/notes
      result = await onUpdate(teacher.id, {
        email: editEmail || null,
        phone: editPhone || null,
        notes: editNotes || null,
      });
    }
    // 실패(예: 이름 동명이인 차단)면 편집 모드 유지 — 사용자가 다시 입력 가능.
    // 토스트는 hook이 SSOT (ADR-014 D3).
    if (result === false) return;
    setEditErr("");
    setIsEditing(false);
  };

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
        {(canManage || canEditOwn) && (
          <div className="flex gap-1">
            <button
              onClick={() => setIsEditing((v) => !v)}
              className="p-2 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] transition-colors"
              aria-label="편집"
            >
              <Pencil size={16} strokeWidth={1.5} />
            </button>
            {canManage && (
              <button
                onClick={() => onDelete(teacher.id)}
                className="p-2 rounded-md text-red-500 hover:bg-[var(--color-overlay-light)] transition-colors"
                aria-label="삭제"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            )}
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
        <TeacherSubjectPills
          subjects={subjects}
          assignedSubjectIds={teacher.subjectIds ?? []}
          canManage={canManage}
          onAdd={(subjectId) => onAddSubject(teacher.id, subjectId)}
          onRemove={(subjectId) => onRemoveSubject(teacher.id, subjectId)}
        />
      </div>

      {/* Info banner: only shown when member views their OWN teacher profile */}
      {canEditOwn && (
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
        {isEditing && (canManage || canEditOwn) ? (
          <TeacherEditForm
            canManage={canManage}
            canEditOwn={canEditOwn}
            editName={editName}
            editEmail={editEmail}
            editPhone={editPhone}
            editNotes={editNotes}
            editColor={editColor}
            onColorChange={setEditColor}
            error={editErr}
            onNameChange={setEditName}
            onEmailChange={setEditEmail}
            onPhoneChange={setEditPhone}
            onNotesChange={setEditNotes}
            onSave={handleSave}
            onCancel={() => {
              setEditName(teacher.name);
              setEditColor(teacher.color);
              setEditEmail(teacher.email ?? "");
              setEditPhone(teacher.phone ?? "");
              setEditNotes(teacher.notes ?? "");
              setEditErr("");
              setIsEditing(false);
            }}
          />
        ) : (
          <TeacherContactDisplay
            email={teacher.email}
            phone={teacher.phone}
            role={teacher.role}
            notes={teacher.notes}
          />
        )}
      </div>

      {/* 수업 일정 section */}
      <div className="border-t border-[var(--color-border)] pt-4 mt-1 mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          수업 일정
        </h3>
        <TeacherScheduleList
          sessions={teacherSessions}
          enrollments={enrollments}
          subjects={subjects}
          fallbackColor={editColor}
        />
      </div>

      {/* 색상 섹션은 편집 폼 안으로 통합됨 (메모 다음, 저장 버튼 위) — autosave 제거 */}
    </div>
  );
}
