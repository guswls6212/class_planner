"use client";

import { useState } from "react";
import type { Subject, Student, Enrollment, Session } from "@/lib/planner";
import { SubjectDetailPanel } from "./SubjectDetailPanel";
import ListFilterBar from "@/components/molecules/ListFilterBar";

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
  /** When false, add/edit/delete controls are hidden. Default: true */
  canManage?: boolean;
}

export default function SubjectsPageLayout(props: SubjectsPageLayoutProps) {
  const { subjects, selectedSubjectId, onSelectSubject } = props;
  const canManage = props.canManage ?? true;
  const [query, setQuery] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const DEFAULT_COLOR = "#3b82f6";
  const filtered = subjects.filter((s) => s.name.includes(query));
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleAdd = async (trimmed: string) => {
    await props.onAddSubject(trimmed, DEFAULT_COLOR);
    setQuery("");
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
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">과목 목록</h2>
        </div>

        {/* Search + Add (canManage 시에만 추가 버튼/엔터) */}
        <ListFilterBar
          value={query}
          onChange={setQuery}
          canAdd={canManage}
          onAdd={handleAdd}
          placeholder="과목 이름으로 검색"
          ariaLabelAdd="과목 추가"
        />

        {/* Subject list */}
        <ul className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="p-4 text-[11px] text-[var(--color-text-muted)] text-center">
              {query ? "검색 결과 없음" : "과목을 추가해주세요"}
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
            canManage={canManage}
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
