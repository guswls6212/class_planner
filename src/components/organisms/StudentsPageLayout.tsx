"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Student, Subject, Enrollment, Session } from "@/lib/planner";
import { StudentDetailPanel } from "./StudentDetailPanel";

interface StudentsPageLayoutProps {
  students: Student[];
  subjects: Subject[];
  enrollments: Enrollment[];
  sessions: Session[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onAddStudent: (name: string) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<boolean>;
  errorMessage?: string;
  onClearError: () => void;
}

export default function StudentsPageLayout(props: StudentsPageLayoutProps) {
  const { students, selectedStudentId, onSelectStudent } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const filtered = students.filter((s) => s.name.includes(searchQuery));
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    props.onAddStudent(trimmed);
    setNewName("");
  };

  const handleSelect = (id: string) => {
    onSelectStudent(id);
    setShowDetail(true);
  };

  return (
    <div
      data-testid="students-page"
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
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">학생 목록</h2>
        </div>

        {/* Add student */}
        <div className="flex gap-2 p-3 border-b border-[var(--color-border)]">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAdd();
            }}
            placeholder="학생 이름 (검색 가능)"
            className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent text-[var(--color-admin-ink)] rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
            aria-label="학생 추가"
          >
            <Plus size={14} strokeWidth={1.5} />
            추가
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-[var(--color-border)]">
          <div className="relative">
            <Search size={14} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름으로 검색"
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Student list */}
        <ul className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="p-4 text-[11px] text-[var(--color-text-muted)] text-center">
              {searchQuery ? "검색 결과 없음" : "학생을 추가해주세요"}
            </li>
          ) : (
            filtered.map((student) => (
              <li key={student.id}>
                <button
                  onClick={() => handleSelect(student.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-overlay-light)] transition-colors ${
                    student.id === selectedStudentId
                      ? "bg-[var(--color-overlay-light)] border-l-2 border-l-accent"
                      : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-[var(--color-admin-ink)] font-bold text-sm flex-shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{student.name}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                      {[student.grade, student.school].filter(Boolean).join(" · ") || "프로필 미입력"}
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
            <button onClick={props.onClearError} className="ml-2 underline">닫기</button>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedStudent ? (
        <div
          className={`flex-1 overflow-y-auto ${
            showDetail ? "block" : "hidden lg:block"
          }`}
        >
          <StudentDetailPanel
            student={selectedStudent}
            subjects={props.subjects}
            enrollments={props.enrollments}
            sessions={props.sessions}
            onUpdate={props.onUpdateStudent}
            onDelete={props.onDeleteStudent}
            onBack={() => setShowDetail(false)}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[var(--color-text-muted)] text-sm">
          학생을 선택하세요
        </div>
      )}
    </div>
  );
}
