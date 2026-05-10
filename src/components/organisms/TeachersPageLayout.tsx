"use client";

import { useEffect, useState } from "react";
import type { Teacher, Session, Enrollment, Subject, Student, TeacherRole } from "@/lib/planner";
import { DEFAULT_TEACHER_COLORS } from "@/lib/teacherColors";
import { TeacherDetailPanel } from "./TeacherDetailPanel";
import ListFilterBar from "@/components/molecules/ListFilterBar";
import TeacherAddDetailModal from "@/components/molecules/TeacherAddDetailModal";
import { showSuccess, showToast } from "@/lib/toast";

const showInfo = (message: string) => showToast("info", message);

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
  }) => Promise<boolean>;
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
  const [addDetailPrefillName, setAddDetailPrefillName] = useState("");

  const filtered = teachers.filter((t) => t.name.includes(query));
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  // UAT 2026-05-10: 동명이인 식별 위해 같은 이름이 2명 이상이면 리스트 항목에
  // 이메일/전화를 subtitle로 표시. 일반은 "주간 N회" 표시 유지.
  const duplicateTeacherNames = (() => {
    const counts = new Map<string, number>();
    for (const t of teachers) counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
    return new Set(
      Array.from(counts.entries()).filter(([, n]) => n > 1).map(([name]) => name),
    );
  })();
  const formatTeacherSubtitle = (t: Teacher): string => {
    const isDup = duplicateTeacherNames.has(t.name);
    const identity: string[] = [];
    if (t.email) identity.push(t.email);
    if (t.phone) identity.push(t.phone);
    if (isDup && identity.length > 0) return identity.join(" · ");
    if (isDup) return `주간 ${teacherWeeklyCount(t)}회 · 동명이인`;
    return `주간 ${teacherWeeklyCount(t)}회`;
  };

  // 작은 화면(< lg)에서 detail 보다가 강사 삭제 시 자동으로 list 복귀.
  // students 패턴과 동일.
  useEffect(() => {
    if (!selectedTeacher && showDetail) {
      setShowDetail(false);
    }
  }, [selectedTeacher, showDetail]);

  const getNextColor = () =>
    DEFAULT_TEACHER_COLORS[teachers.length % DEFAULT_TEACHER_COLORS.length];

  const handleAddDetail = async (
    name: string,
    profile: { email?: string; phone?: string },
  ) => {
    const success = await props.onAddTeacher(name, getNextColor(), profile);
    // 상세등록 모달 경로의 성공 토스트. handleAdd(0건)와 동일한 메시지 유지.
    if (success) showSuccess(`'${name}' 강사를 추가했습니다.`);
  };

  const handleSelect = (id: string) => {
    onSelectTeacher(id);
    setShowDetail(true);
  };

  const handleAdd = async (trimmed: string) => {
    // UAT 2026-05-10 (사용자 결정): Enter 동작
    // - 0건 → 단순 추가 (이름만, 즉시) + 성공 토스트
    // - 1건+ → 상세등록 모달 (이름 prefill) + 안내 토스트 — 동명이인은 이메일/전화로 식별
    const matched = teachers.filter((t) =>
      t.name.toLowerCase().includes(trimmed.toLowerCase()),
    );
    if (matched.length === 0) {
      const success = await props.onAddTeacher(trimmed, getNextColor());
      if (success) showSuccess(`'${trimmed}' 강사를 추가했습니다.`);
    } else {
      setAddDetailPrefillName(trimmed);
      setIsAddDetailOpen(true);
      showInfo(
        `'${trimmed}' 이름의 강사가 ${matched.length}명 있습니다. 이메일/전화로 동명이인을 구분해주세요.`,
      );
    }
    setQuery("");
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {teacher.name}
                      </p>
                      {(!teacher.email || !teacher.phone) && (
                        <span
                          className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[9px] font-bold text-indigo-400"
                          title="이메일/전화번호를 추가하면 운영 정보가 충실해집니다"
                          aria-label="연락처 정보 보강 가능"
                          data-testid={`teacher-meta-hint-${teacher.id}`}
                        >
                          ⓘ
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                      {formatTeacherSubtitle(teacher)}
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* errorMessage 배너 제거 — 토스트가 SSOT (ADR-014 D3) */}
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
        onClose={() => {
          setIsAddDetailOpen(false);
          setAddDetailPrefillName("");
        }}
        onSubmit={handleAddDetail}
        existingNames={teachers.map((t) => t.name)}
        defaultName={addDetailPrefillName}
      />
    </div>
  );
}
