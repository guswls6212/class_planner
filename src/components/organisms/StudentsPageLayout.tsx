"use client";

import { useEffect, useState } from "react";
import type { Student, Subject, Enrollment, Session } from "@/lib/planner";
import { StudentDetailPanel } from "./StudentDetailPanel";
import { StudentAccessCodeBadge } from "@/components/molecules/StudentAccessCodeBadge";
import { Skeleton } from "@/components/atoms/Skeleton";
import ListFilterBar from "@/components/molecules/ListFilterBar";
import ParentCodeStickyBar from "@/components/molecules/ParentCodeStickyBar";
import StudentAddDetailModal from "@/components/molecules/StudentAddDetailModal";
import type { AccessCodeEntry } from "@/hooks/useAccessCodes";
import { showSuccess, showToast } from "@/lib/toast";

const showInfo = (message: string) => showToast("info", message);

interface StudentsPageLayoutProps {
  students: Student[];
  subjects: Subject[];
  enrollments: Enrollment[];
  sessions: Session[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onAddStudent: (
    name: string,
    options?: { gender?: string; birthDate?: string },
  ) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<boolean>;
  errorMessage?: string;
  onClearError: () => void;
  /** When false, add/edit/delete controls are hidden. Default: true */
  canManage?: boolean;
  /** True while role is being fetched — used to add data-role-loading for E2E tests */
  isRoleLoading?: boolean;
  /** Parent access codes for students in this academy (admin-visible only) */
  accessCodes?: AccessCodeEntry[];
  /** True when we have any data (cache OR completed fetch) — gates UI between
   *  Skeleton (no data yet) and actual content (cache or fresh fetch). */
  accessCodesReady?: boolean;
  /** Bulk: generate codes for any student missing one */
  onCreateCodes?: () => void;
  /** Bulk: regenerate ALL codes (destructive — user-confirmed in handler) */
  onRenewCodes?: () => void;
  /** Per-student: generate code for one student */
  onCreateCodeForStudent?: (studentId: string, studentName?: string) => void;
  /** Per-student: revoke + reissue (user-confirmed) */
  onRenewCodeForStudent?: (studentId: string, studentName?: string) => void;
  /** Per-student: revoke (expire) — user-confirmed */
  onRevokeCodeForStudent?: (studentId: string, studentName?: string) => void;
  /** Academy access URL (e.g. /academy/<slug>) — used for "자녀 시간표 링크 복사" */
  academyUrl?: string;
}

export default function StudentsPageLayout(props: StudentsPageLayoutProps) {
  const { students, selectedStudentId, onSelectStudent, accessCodes = [], academyUrl } = props;
  const canManage = props.canManage ?? true;
  const isRoleLoading = props.isRoleLoading ?? false;
  const accessCodesReady = props.accessCodesReady ?? true;
  const [query, setQuery] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [isAddDetailOpen, setIsAddDetailOpen] = useState(false);
  const [addDetailPrefillName, setAddDetailPrefillName] = useState("");

  const filtered = students.filter((s) => s.name.includes(query));
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // UAT 2026-05-10: 동명이인 식별 위해 같은 이름이 2명 이상이면 리스트 항목에
  // 성별/생년월일을 subtitle로 표시. 일반은 학년·학교 표시 유지.
  const duplicateNames = (() => {
    const counts = new Map<string, number>();
    for (const s of students) counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    return new Set(
      Array.from(counts.entries()).filter(([, n]) => n > 1).map(([name]) => name),
    );
  })();
  const formatStudentSubtitle = (s: Student): string => {
    const isDup = duplicateNames.has(s.name);
    const identity: string[] = [];
    if (s.gender === "male") identity.push("남");
    else if (s.gender === "female") identity.push("여");
    if (s.birthDate) identity.push(s.birthDate);
    if (isDup && identity.length > 0) return identity.join(" · ");
    const meta = [s.grade, s.school].filter(Boolean).join(" · ");
    if (meta) return meta;
    return isDup ? "프로필 미입력 · 동명이인" : "프로필 미입력";
  };

  // 작은 화면(< lg)에서 detail 보다가 학생 삭제 시 자동으로 list 복귀.
  // 삭제 → students에서 사라짐 → selectedStudent=undefined → detail empty.
  // showDetail=true면 list가 hidden이라 빈 화면이 보임 (UAT 2026-05-09 보고).
  useEffect(() => {
    if (!selectedStudent && showDetail) {
      setShowDetail(false);
    }
  }, [selectedStudent, showDetail]);

  // O(1) lookup: studentId → access code
  const codeByStudentId = new Map(
    accessCodes
      .filter((c) => c.filter_student_id)
      .map((c) => [c.filter_student_id as string, c]),
  );

  // Sticky bar (URL + 일괄 메뉴) needs admin privilege + academy URL + bulk handler.
  // While initial fetch is in flight, we show a thin skeleton in the same slot
  // to prevent layout shift when codes arrive.
  const codeUiCapable =
    canManage && Boolean(props.onCreateCodes) && Boolean(academyUrl);
  const showCodeBar = codeUiCapable && accessCodesReady;
  const showCodeSkeleton = codeUiCapable && !accessCodesReady;

  const handleAdd = (trimmed: string) => {
    // UAT 2026-05-10 (사용자 결정): 검색 + Enter 동작
    // - 0건 → 단순 추가 (이름만, 즉시) + 성공 토스트
    // - 1건+ → 상세등록 모달 (이름 prefill) + 안내 토스트 — 동명이인 식별을
    //   위해 성별/생년월일 입력 유도. 자동 select는 부작용으로 제거.
    const matched = students.filter((s) =>
      s.name.toLowerCase().includes(trimmed.toLowerCase()),
    );
    if (matched.length === 0) {
      props.onAddStudent(trimmed);
      showSuccess(`'${trimmed}' 학생을 추가했습니다.`);
    } else {
      setAddDetailPrefillName(trimmed);
      setIsAddDetailOpen(true);
      showInfo(
        `'${trimmed}' 이름의 학생이 ${matched.length}명 있습니다. 성별/생년월일로 동명이인을 구분해주세요.`,
      );
    }
    setQuery("");
  };

  const handleAddDetail = (
    name: string,
    options: { gender?: string; birthDate?: string },
  ) => {
    props.onAddStudent(name, options);
    // 상세등록 모달 경로의 성공 토스트. handleAdd(0건)와 동일한 메시지 유지.
    showSuccess(`'${name}' 학생을 추가했습니다.`);
  };

  const handleSelect = (id: string) => {
    onSelectStudent(id);
    setShowDetail(true);
  };

  return (
    <div
      data-testid="students-page"
      data-role-loading={isRoleLoading ? "true" : "false"}
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
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">학생 목록</h2>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsAddDetailOpen(true)}
              className="text-[11px] text-[var(--color-text-secondary)] hover:text-accent transition-colors"
              aria-label="학생 상세 등록"
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
          placeholder="학생 이름으로 검색"
          ariaLabelAdd="학생 추가"
        />

        {/* Student list */}
        <ul className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="p-4 text-[11px] text-[var(--color-text-muted)] text-center">
              {query ? "검색 결과 없음" : "학생을 추가해주세요"}
            </li>
          ) : (
            filtered.map((student) => {
              const studentCode = codeByStudentId.get(student.id);
              return (
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
                      <div className="flex items-center gap-2">
                        {student.grade && (
                          <span
                            className="inline-flex flex-shrink-0 items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400"
                            data-testid={`student-grade-chip-${student.id}`}
                          >
                            {student.grade}
                          </span>
                        )}
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {student.name}
                        </p>
                        {canManage && accessCodesReady && studentCode && (
                          <StudentAccessCodeBadge code={studentCode} variant="inline" />
                        )}
                        {canManage && !accessCodesReady && (
                          <Skeleton className="h-3 w-16 opacity-60" />
                        )}
                        {(!student.gender || !student.birthDate) && (
                          <span
                            className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[9px] font-bold text-indigo-400"
                            title="성별/생년월일을 추가하면 동명이인 식별과 데이터 동기화가 더 정확해집니다"
                            aria-label="프로필 정보 보강 가능"
                            data-testid={`student-meta-hint-${student.id}`}
                          >
                            ⓘ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {formatStudentSubtitle(student)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {showCodeSkeleton && (
          <div
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]"
            aria-hidden="true"
          >
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
          </div>
        )}

        {showCodeBar && academyUrl && (
          <ParentCodeStickyBar
            academyUrl={academyUrl}
            accessCodesCount={accessCodes.length}
            onBulkCreate={() => props.onCreateCodes?.()}
            onBulkRenew={() => props.onRenewCodes?.()}
          />
        )}

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
            canManage={canManage}
            accessCode={accessCodesReady ? codeByStudentId.get(selectedStudent.id) : undefined}
            accessCodesReady={accessCodesReady}
            academyUrl={academyUrl}
            onCreateCode={props.onCreateCodeForStudent}
            onRenewCode={props.onRenewCodeForStudent}
            onRevokeCode={props.onRevokeCodeForStudent}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[var(--color-text-muted)] text-sm">
          학생을 선택하세요
        </div>
      )}

      <StudentAddDetailModal
        isOpen={isAddDetailOpen}
        onClose={() => {
          setIsAddDetailOpen(false);
          setAddDetailPrefillName("");
        }}
        onSubmit={handleAddDetail}
        existingNames={students.map((s) => s.name)}
        defaultName={addDetailPrefillName}
      />
    </div>
  );
}
