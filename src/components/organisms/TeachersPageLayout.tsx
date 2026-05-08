"use client";

import { useState } from "react";
import type { Teacher, Session, Enrollment, Subject, Student, TeacherRole } from "@/lib/planner";
import { DEFAULT_TEACHER_COLORS } from "@/lib/teacherColors";
import { TeacherDetailPanel } from "./TeacherDetailPanel";
import ListFilterBar from "@/components/molecules/ListFilterBar";
import TeacherAddDetailModal from "@/components/molecules/TeacherAddDetailModal";

interface TeachersPageLayoutProps {
  teachers: Teacher[];
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  students: Student[];
  selectedTeacherId: string;
  onSelectTeacher: (id: string) => void;
  onAddTeacher: (
    name: string,
    color: string,
    profile?: { email?: string; phone?: string },
  ) => Promise<boolean>;
  onDeleteTeacher: (id: string) => void;
  onUpdateTeacher: (id: string, updates: {
    name?: string;
    color?: string;
    email?: string | null;
    phone?: string | null;
    role?: TeacherRole | null;
    notes?: string | null;
  }) => void;
  onAddTeacherSubject: (teacherId: string, subjectId: string) => void;
  onRemoveTeacherSubject: (teacherId: string, subjectId: string) => void;
  errorMessage?: string;
  onClearError: () => void;
  /** When false, add/delete controls are hidden and detail panel is read-only. Default: true */
  canManage?: boolean;
  /** The linkedTeacherId of the currently logged-in member (from useMyRole). Used to derive isOwnTeacher for the detail panel. */
  linkedTeacherId?: string | null;
}

export default function TeachersPageLayout(props: TeachersPageLayoutProps) {
  const { teachers, selectedTeacherId, onSelectTeacher } = props;
  const canManage = props.canManage ?? true;
  const [query, setQuery] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [isAddDetailOpen, setIsAddDetailOpen] = useState(false);

  const filtered = teachers.filter((t) => t.name.includes(query));
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const getNextColor = () =>
    DEFAULT_TEACHER_COLORS[teachers.length % DEFAULT_TEACHER_COLORS.length];

  const handleAdd = async (trimmed: string) => {
    const isDuplicate = teachers.some(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) return;
    const success = await props.onAddTeacher(trimmed, getNextColor());
    if (success) setQuery("");
  };

  const handleAddDetail = async (
    name: string,
    profile: { email?: string; phone?: string },
  ) => {
    await props.onAddTeacher(name, getNextColor(), profile);
  };

  const handleSelect = (id: string) => {
    onSelectTeacher(id);
    setShowDetail(true);
  };

  const teacherWeeklyCount = (teacher: Teacher) =>
    props.sessions.filter((s) => s.teacherId === teacher.id).length;

  return (
    <div
      data-testid="teachers-page"
      className="flex h-[calc(100dvh-48px)] md:h-dvh overflow-hidden"
    >
      {/* List Panel */}
      <div
        className={`flex flex-col w-full lg:w-[360px] lg:flex-shrink-0 border-r border-[var(--color-border)] ${
          showDetail ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">강사 목록</h2>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsAddDetailOpen(true)}
              className="text-[11px] text-[var(--color-text-secondary)] hover:text-accent transition-colors"
              aria-label="강사 상세 등록"
            >
              + 상세 등록
            </button>
          )}
        </div>

        {/* Search + Add (canManage 시에만 추가 버튼/엔터) */}
        <ListFilterBar
          value={query}
          onChange={setQuery}
          canAdd={canManage}
          onAdd={handleAdd}
          placeholder="강사 이름으로 검색"
          ariaLabelAdd="강사 추가"
        />

        {/* Teacher list */}
        <ul className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="p-4 text-[11px] text-[var(--color-text-muted)] text-center">
              {query ? "검색 결과 없음" : "강사를 추가해주세요"}
            </li>
          ) : (
            filtered.map((teacher) => (
              <li key={teacher.id}>
                <button
                  onClick={() => handleSelect(teacher.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-overlay-light)] transition-colors ${
                    teacher.id === selectedTeacherId
                      ? "bg-[var(--color-overlay-light)] border-l-2 border-l-accent"
                      : ""
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: teacher.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {teacher.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      주간 {teacherWeeklyCount(teacher)}회
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        {props.errorMessage && (
          <div className="px-3 py-2 bg-red-50 text-red-600 text-[11px] flex items-center justify-between">
            <span>{props.errorMessage}</span>
            <button onClick={props.onClearError} className="ml-2 underline">
              닫기
            </button>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedTeacher ? (
        <div
          className={`flex-1 overflow-y-auto ${showDetail ? "block" : "hidden lg:block"}`}
        >
          <TeacherDetailPanel
            teacher={selectedTeacher}
            sessions={props.sessions}
            enrollments={props.enrollments}
            subjects={props.subjects}
            onUpdate={(id, updates) => props.onUpdateTeacher(id, updates)}
            onAddSubject={props.onAddTeacherSubject}
            onRemoveSubject={props.onRemoveTeacherSubject}
            onDelete={props.onDeleteTeacher}
            onBack={() => setShowDetail(false)}
            canManage={canManage}
            isOwnTeacher={
              props.linkedTeacherId != null &&
              selectedTeacher.id === props.linkedTeacherId
            }
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[var(--color-text-muted)] text-sm">
          강사를 선택하세요
        </div>
      )}

      <TeacherAddDetailModal
        isOpen={isAddDetailOpen}
        onClose={() => setIsAddDetailOpen(false)}
        onSubmit={handleAddDetail}
        existingNames={teachers.map((t) => t.name)}
      />
    </div>
  );
}
