"use client";

import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import type { Subject, Student, Enrollment, Session } from "@/lib/planner";
import { SubjectDetailPanel } from "./SubjectDetailPanel";
import { EmptyStateCTA } from "@/components/molecules/EmptyStateCTA";
import ListFilterBar from "@/components/molecules/ListFilterBar";
import SubjectAddDetailModal from "@/components/molecules/SubjectAddDetailModal";
import { showSuccess } from "@/lib/toast";
import { SUBJECT_DEFAULT_COLOR } from "@/lib/subjectColors";

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
  const [isAddDetailOpen, setIsAddDetailOpen] = useState(false);
  const [addDetailPrefillName, setAddDetailPrefillName] = useState("");

  // 검색은 대소문자 무관 — 중복 검사 (lowercase 일치) 정책과 일관.
  const q = query.toLowerCase();
  const filtered = subjects.filter((s) => s.name.toLowerCase().includes(q));
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleSelect = (id: string) => {
    onSelectSubject(id);
    setShowDetail(true);
  };

  const handleAdd = async (trimmed: string) => {
    // UAT 2026-05-10 (사용자 결정): Enter 동작
    // 과목은 동명이인 개념 없음 (이름 lowercase 일치 = 진짜 중복) — 별도 모달 X.
    // - 0건 → 단순 추가 (즉시) + 성공 토스트
    // - 1건+ → 첫 결과 select + 안내 토스트
    const matched = subjects.filter((s) =>
      s.name.toLowerCase().includes(trimmed.toLowerCase()),
    );
    if (matched.length === 0) {
      await props.onAddSubject(trimmed, SUBJECT_DEFAULT_COLOR);
      showSuccess(`'${trimmed}' 과목을 추가했습니다.`);
    } else {
      handleSelect(matched[0].id);
      showSuccess(
        matched.length === 1
          ? `'${matched[0].name}' 과목을 선택했습니다.`
          : `'${trimmed}'와(과) 일치하는 과목 ${matched.length}개 중 첫 번째를 선택했습니다.`,
      );
    }
    setQuery("");
  };

  const handleAddDetail = async (name: string, color: string) => {
    await props.onAddSubject(name, color);
    // 상세등록 모달 경로의 성공 토스트. handleAdd(0건)와 동일한 메시지 유지.
    showSuccess(`'${name}' 과목을 추가했습니다.`);
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
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">과목 목록</h2>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsAddDetailOpen(true)}
              className="text-[11px] text-[var(--color-text-secondary)] hover:text-accent transition-colors"
              aria-label="과목 상세 등록"
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
          placeholder="과목 이름으로 검색"
          ariaLabelAdd="과목 추가"
        />

        {/* Subject list */}
        <ul className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            query ? (
              <li className="p-4 text-[11px] text-[var(--color-text-muted)] text-center">
                검색 결과 없음
              </li>
            ) : (
              // phase1-release-readiness rank 10 재정의 (2026-05-25) — EmptyStateCTA 전 entity 확장.
              <li className="p-4">
                <EmptyStateCTA
                  data-testid="empty-subjects-cta"
                  icon={<BookOpen size={26} strokeWidth={1.5} />}
                  title="아직 등록된 과목이 없어요"
                  description={"과목을 추가하면\n수업에 배정할 수 있어요"}
                  primaryAction={
                    canManage
                      ? {
                          label: "첫 과목 추가",
                          onClick: () => setIsAddDetailOpen(true),
                          icon: <Plus size={14} strokeWidth={2.5} />,
                          ariaLabel: "과목 상세 등록 모달 열기",
                          "data-testid": "empty-subjects-add",
                        }
                      : undefined
                  }
                />
              </li>
            )
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
                    style={{ backgroundColor: subject.color ?? SUBJECT_DEFAULT_COLOR }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{subject.name}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* errorMessage 배너 제거 — 토스트가 SSOT (ADR-014 D3) */}
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

      <SubjectAddDetailModal
        isOpen={isAddDetailOpen}
        onClose={() => {
          setIsAddDetailOpen(false);
          setAddDetailPrefillName("");
        }}
        onSubmit={handleAddDetail}
        defaultName={addDetailPrefillName}
      />
    </div>
  );
}
