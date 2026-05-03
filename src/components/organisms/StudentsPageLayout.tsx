"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search, Copy, MoreVertical, AlertTriangle, RefreshCw } from "lucide-react";
import type { Student, Subject, Enrollment, Session } from "@/lib/planner";
import { StudentDetailPanel } from "./StudentDetailPanel";
import { StudentAccessCodeBadge } from "@/components/molecules/StudentAccessCodeBadge";
import { Skeleton } from "@/components/atoms/Skeleton";
import ConfirmModal from "@/components/molecules/ConfirmModal";
import type { AccessCodeEntry } from "@/hooks/useAccessCodes";
import { showToast } from "@/lib/toast";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  // Bulk-action kebab menu (코드 생성 / 전체 갱신 are hidden behind ⋮ to
  // prevent accidental clicks — both have re-share consequences)
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showRenewConfirm, setShowRenewConfirm] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Close kebab on outside click
  useEffect(() => {
    if (!showBulkMenu) return;
    function handleOutside(e: MouseEvent) {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setShowBulkMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showBulkMenu]);

  const filtered = students.filter((s) => s.name.includes(searchQuery));
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // O(1) lookup: studentId → access code
  const codeByStudentId = new Map(
    accessCodes
      .filter((c) => c.filter_student_id)
      .map((c) => [c.filter_student_id as string, c]),
  );

  // Code management UI (header card + inline badges) needs SOME data
  // (cached OR fresh) to render meaningfully. While loading, we show a
  // shimmer Skeleton in the same shape so the layout doesn't shift.
  const codeUiCapable =
    canManage && Boolean(props.onCreateCodes) && Boolean(academyUrl);
  const showCodeManagement = codeUiCapable && accessCodesReady;
  const showCodeSkeleton = codeUiCapable && !accessCodesReady;

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
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">학생 목록</h2>
        </div>

        {/* Add student — only visible to owners/admins */}
        {canManage && (
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
        )}

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

        {/* Code Management Skeleton — shown while initial fetch in flight
            (no cache yet). Same vertical footprint as the real card so the
            student list doesn't jump when codes arrive. */}
        {showCodeSkeleton && (
          <div className="px-3 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        )}

        {/* Code Management Card (admin + has academy + data ready)
            Bulk actions hidden behind ⋮ kebab — prevents accidental
            destructive clicks (both 코드 생성 + 전체 갱신 trigger re-share). */}
        {showCodeManagement && (
          <div className="px-3 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] tracking-wide">
                학부모 접속 코드
              </span>
              <div className="relative" ref={bulkMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowBulkMenu((v) => !v)}
                  aria-label="일괄 작업 메뉴"
                  aria-expanded={showBulkMenu}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
                >
                  <MoreVertical size={14} strokeWidth={1.5} />
                </button>
                {showBulkMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setShowBulkMenu(false); setShowCreateConfirm(true); }}
                      className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-overlay-light)] transition-colors"
                    >
                      <Plus size={14} strokeWidth={1.5} className="mt-0.5 text-[var(--color-text-muted)]" />
                      <div className="flex-1">
                        <div className="text-[12px] font-medium text-[var(--color-text-primary)]">
                          누락 학생 일괄 생성
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                          코드 없는 학생에게만 추가 (기존 코드는 그대로)
                        </div>
                      </div>
                    </button>
                    <div className="border-t border-[var(--color-border)]" />
                    <button
                      type="button"
                      onClick={() => { setShowBulkMenu(false); setShowRenewConfirm(true); }}
                      className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-red-500/10 transition-colors"
                    >
                      <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 text-red-400" />
                      <div className="flex-1">
                        <div className="text-[12px] font-medium text-red-400">
                          전체 갱신 (위험)
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                          모든 코드 만료 → 학부모 전원에게 재공유 필요
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">접속 URL</span>
              <span className="font-mono text-[10px] text-[var(--color-text-primary)] truncate flex-1">
                {academyUrl}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof window === "undefined" || !academyUrl) return;
                  window.navigator.clipboard
                    ?.writeText(academyUrl)
                    .then(() => showToast("success", "URL이 복사됐습니다"))
                    .catch(() => showToast("error", "복사에 실패했습니다"));
                }}
                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
                aria-label="URL 복사"
              >
                <Copy size={11} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Bulk action confirm modals */}
        <ConfirmModal
          isOpen={showCreateConfirm}
          variant="info"
          title="누락 학생 일괄 코드 생성"
          message={`코드가 없는 학생에게만 새 접속 코드를 생성합니다. 이미 코드가 있는 학생은 영향받지 않습니다.`}
          confirmText="생성"
          cancelText="취소"
          onConfirm={() => { setShowCreateConfirm(false); props.onCreateCodes?.(); }}
          onCancel={() => setShowCreateConfirm(false)}
        />
        <ConfirmModal
          isOpen={showRenewConfirm}
          variant="danger"
          title="모든 접속 코드 전체 갱신"
          message={
            `현재 학원의 ${accessCodes.length}개 접속 코드가 즉시 만료되고 새 코드가 발급됩니다.\n\n` +
            `학부모 ${accessCodes.length}명 전원에게 새 링크를 다시 공유해야 합니다. ` +
            `이전 링크/코드는 더 이상 작동하지 않습니다.\n\n` +
            `정말 진행할까요?`
          }
          confirmText="이해했습니다, 갱신"
          cancelText="취소"
          onConfirm={() => { setShowRenewConfirm(false); props.onRenewCodes?.(); }}
          onCancel={() => setShowRenewConfirm(false)}
        />

        {/* Student list */}
        <ul className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="p-4 text-[11px] text-[var(--color-text-muted)] text-center">
              {searchQuery ? "검색 결과 없음" : "학생을 추가해주세요"}
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
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {student.name}
                        </p>
                        {canManage && accessCodesReady && studentCode && (
                          <StudentAccessCodeBadge code={studentCode} variant="inline" />
                        )}
                        {/* Tiny shimmer in badge slot during initial load (no
                            cache) — preserves row height + signals "loading". */}
                        {canManage && !accessCodesReady && (
                          <Skeleton className="h-3 w-16 opacity-60" />
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {[student.grade, student.school].filter(Boolean).join(" · ") || "프로필 미입력"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
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
    </div>
  );
}
