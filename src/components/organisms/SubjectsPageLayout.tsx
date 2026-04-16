"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Subject, Student, Enrollment, Session } from "@/lib/planner";
import { SubjectDetailPanel } from "./SubjectDetailPanel";

interface SubjectsPageLayoutProps {
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  sessions: Session[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  onAddSubject: (name: string, color: string) => Promise<boolean | void>;
  onDeleteSubject: (id: string) => void;
  onUpdateSubject: (id: string, name: string, color: string) => Promise<boolean | void>;
  errorMessage?: string;
}

export default function SubjectsPageLayout(props: SubjectsPageLayoutProps) {
  const { subjects, selectedSubjectId, onSelectSubject } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const DEFAULT_COLOR = "#3b82f6";
  const filtered = subjects.filter((s) => s.name.includes(searchQuery));
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await props.onAddSubject(trimmed, DEFAULT_COLOR);
    setNewName("");
  };

  const handleSelect = (id: string) => {
    onSelectSubject(id);
    setShowDetail(true);
  };

  return (
    <div
      data-testid="subjects-page"
      className="flex h-[calc(100dvh-48px)] md:h-dvh overflow-hidden"
    >
      {/* List Panel */}
      <div
        className={`flex flex-col w-full lg:w-[360px] lg:flex-shrink-0 border-r border-[var(--color-border)] ${
          showDetail ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Add subject */}
        <div className="flex gap-2 p-3 border-b border-[var(--color-border)]">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="과목 이름"
            className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleAdd}
            className="p-2 bg-accent text-[var(--color-admin-ink)] rounded-md hover:opacity-90 transition-opacity"
            aria-label="과목 추가"
          >
            <Plus size={16} strokeWidth={1.5} />
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

        {/* Subject list */}
        <ul className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="p-4 text-[11px] text-[var(--color-text-muted)] text-center">
              {searchQuery ? "검색 결과 없음" : "과목을 추가해주세요"}
            </li>
          ) : (
            filtered.map((subject) => (
              <li key={subject.id}>
                <button
                  onClick={() => handleSelect(subject.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-overlay-light)] transition-colors ${
                    subject.id === selectedSubjectId
                      ? "bg-[var(--color-overlay-light)] border-l-2 border-l-accent"
                      : ""
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject.color ?? DEFAULT_COLOR }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{subject.name}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        {props.errorMessage && (
          <div className="px-3 py-2 bg-red-50 text-red-600 text-[11px]">
            {props.errorMessage}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedSubject ? (
        <div
          className={`flex-1 overflow-y-auto ${
            showDetail ? "block" : "hidden lg:block"
          }`}
        >
          <SubjectDetailPanel
            subject={selectedSubject}
            students={props.students}
            enrollments={props.enrollments}
            sessions={props.sessions}
            onUpdate={props.onUpdateSubject}
            onDelete={props.onDeleteSubject}
            onBack={() => setShowDetail(false)}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[var(--color-text-muted)] text-sm">
          과목을 선택하세요
        </div>
      )}
    </div>
  );
}
