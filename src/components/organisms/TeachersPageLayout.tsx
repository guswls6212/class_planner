"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Teacher, Session, Enrollment, Subject, Student } from "@/lib/planner";
import { DEFAULT_TEACHER_COLORS } from "@/lib/teacherColors";
import { TeacherDetailPanel } from "./TeacherDetailPanel";

interface TeachersPageLayoutProps {
  teachers: Teacher[];
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  students: Student[];
  selectedTeacherId: string;
  onSelectTeacher: (id: string) => void;
  onAddTeacher: (name: string, color: string) => Promise<boolean>;
  onDeleteTeacher: (id: string) => void;
  onUpdateTeacher: (id: string, name: string, color: string) => void;
  errorMessage?: string;
  onClearError: () => void;
}

export default function TeachersPageLayout(props: TeachersPageLayoutProps) {
  const { teachers, selectedTeacherId, onSelectTeacher } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const filtered = teachers.filter((t) => t.name.includes(searchQuery));
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const getNextColor = () =>
    DEFAULT_TEACHER_COLORS[teachers.length % DEFAULT_TEACHER_COLORS.length];

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const isDuplicate = teachers.some(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) return;
    const success = await props.onAddTeacher(trimmed, getNextColor());
    if (success) setNewName("");
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
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">강사 목록</h2>
        </div>

        {/* Add teacher */}
        <div className="flex gap-2 p-3 border-b border-[var(--color-border)]">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAdd();
            }}
            placeholder="강사 이름 (검색 가능)"
            className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent text-[var(--color-admin-ink)] rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
            aria-label="강사 추가"
          >
            <Plus size={14} strokeWidth={1.5} />
            추가
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-[var(--color-border)]">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.5}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름으로 검색"
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Teacher list */}
        <ul className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="p-4 text-[11px] text-[var(--color-text-muted)] text-center">
              {searchQuery ? "검색 결과 없음" : "강사를 추가해주세요"}
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
            students={props.students}
            onUpdate={props.onUpdateTeacher}
            onDelete={props.onDeleteTeacher}
            onBack={() => setShowDetail(false)}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[var(--color-text-muted)] text-sm">
          강사를 선택하세요
        </div>
      )}
    </div>
  );
}
