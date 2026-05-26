"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import TeachersPageLayout from "../../components/organisms/TeachersPageLayout";
import TypedConfirmationModal from "../../components/molecules/TypedConfirmationModal";
import ReassignTeacherModal from "../../components/molecules/ReassignTeacherModal";
import { OwnerTeacherCard } from "../../components/molecules/OwnerTeacherCard";
import { useTeacherManagementLocal } from "../../hooks/useTeacherManagementLocal";
import { useAuth } from "../../contexts/AuthContext";
import { showError, showSuccess } from "../../lib/toast";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useMyRole } from "../../hooks/useMyRole";
import { logger } from "../../lib/logger";
import type { TeacherRole } from "../../lib/planner";
import { filterTeachersForPicker } from "@/lib/teacherPickerFilter";

// 보관된 강사 row — server 응답 shape (PR 6 Phase 1 archive endpoint 응답 + GET enrich).
interface ArchivedTeacher {
  id: string;
  name: string;
  color: string;
  email?: string | null;
  phone?: string | null;
  archivedAt: string;
}

const TeachersPage = () => {
  const router = useRouter();
  const { canManage, linkedTeacherId, role } = useMyRole();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  // teacher-display-identity Phase 1 (2026-05-26): member (강사) 는 /teachers 접근 X.
  // 본인 강사 entry 외 다른 강사 정보 read/edit 권한 없음 (image #4 권한 카드 spec).
  // role fetching 중 (null) 은 통과 — fetch 완료 후 'member' 이면 redirect.
  useEffect(() => {
    if (role === "member") router.replace("/teacher-schedule");
  }, [role, router]);
  const {
    teachers,
    addTeacher,
    deleteTeacher,
    updateTeacher,
    addTeacherSubject,
    removeTeacherSubject,
    errorMessage,
    clearError,
  } = useTeacherManagementLocal();

  const { data } = useIntegratedDataLocal();
  const { subjects = [], enrollments = [], sessions = [], students = [] } = data ?? {};

  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // 강사 교체 (PR 9) — TeacherDetailPanel 의 Replace 아이콘 트리거.
  const [reassignTargetId, setReassignTargetId] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);

  // 보관된 강사 (PR 6 Phase 1b) — 서버 fetch 별도. localStorage 와 무관.
  const [archivedTeachers, setArchivedTeachers] = useState<ArchivedTeacher[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const deleteTarget = useMemo(
    () => teachers.find((t) => t.id === deleteTargetId) ?? null,
    [teachers, deleteTargetId],
  );

  const affectedSessionCount = useMemo(() => {
    if (!deleteTarget) return 0;
    return sessions.filter((s) => s.teacherId === deleteTarget.id).length;
  }, [deleteTarget, sessions]);

  const fetchArchived = useCallback(async () => {
    if (!userId) return;
    setIsLoadingArchived(true);
    try {
      const res = await fetch(`/api/teachers?userId=${userId}&includeArchived=true`);
      if (!res.ok) return;
      const body = (await res.json()) as { data?: Array<ArchivedTeacher & { archivedAt?: string | null }> };
      const onlyArchived = (body.data ?? []).filter(
        (t): t is ArchivedTeacher => Boolean(t.archivedAt),
      );
      setArchivedTeachers(onlyArchived);
    } catch (e) {
      logger.warn("archived teachers fetch 실패", undefined, e as Error);
    } finally {
      setIsLoadingArchived(false);
    }
  }, [userId]);

  // showArchived ON 시 fetch. 보관 후에도 refresh — 보관 직후 list 갱신용.
  useEffect(() => {
    if (showArchived) void fetchArchived();
  }, [showArchived, fetchArchived]);

  const handleUpdate = useCallback(
    async (id: string, updates: {
      name?: string;
      color?: string;
      email?: string | null;
      phone?: string | null;
      role?: TeacherRole | null;
      notes?: string | null;
    }): Promise<boolean> => {
      return await updateTeacher(id, updates);
    },
    [updateTeacher]
  );

  const handleAddTeacher = useCallback(
    async (
      name: string,
      color: string,
      profile?: { email?: string; phone?: string },
    ): Promise<boolean> => {
      return addTeacher(
        name,
        color,
        null,
        profile
          ? { email: profile.email ?? null, phone: profile.phone ?? null }
          : undefined,
      );
    },
    [addTeacher],
  );

  const handleRequestDelete = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const handleRequestReassign = useCallback((id: string) => {
    setReassignTargetId(id);
  }, []);

  const reassignTarget = useMemo(
    () => teachers.find((t) => t.id === reassignTargetId) ?? null,
    [teachers, reassignTargetId],
  );

  const reassignCandidates = useMemo(
    () =>
      teachers
        .filter((t) => t.id !== reassignTargetId)
        .map((t) => ({ id: t.id, name: t.name, color: t.color })),
    [teachers, reassignTargetId],
  );

  const reassignAffectedCount = useMemo(() => {
    if (!reassignTarget) return 0;
    return sessions.filter((s) => s.teacherId === reassignTarget.id).length;
  }, [reassignTarget, sessions]);

  // 강사 교체 (PR 9) — settings/page.tsx 와 동일 흐름. POST reassign + localStorage 동기화.
  const handleReassignConfirm = useCallback(
    async (toTeacherId: string, archiveOriginal: boolean) => {
      if (!reassignTarget) return;
      setIsReassigning(true);
      try {
        if (userId) {
          const res = await fetch(
            `/api/teachers/${reassignTarget.id}/reassign?userId=${userId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: toTeacherId, archiveOriginal }),
            },
          );
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            showError(body.error ?? "강사 교체에 실패했습니다.");
            return;
          }
        }
        // localStorage 동기화 — sessions teacherId 교체 + (옵션) 원 강사 보관(=local delete).
        await Promise.all(
          sessions
            .filter((s) => s.teacherId === reassignTarget.id)
            .map((s) => updateTeacher(reassignTarget.id, {})),  // no-op
        );
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem("classPlannerData");
            if (raw) {
              const data = JSON.parse(raw) as { sessions?: Array<{ teacherId?: string | null }> };
              if (Array.isArray(data.sessions)) {
                data.sessions = data.sessions.map((s) =>
                  s.teacherId === reassignTarget.id ? { ...s, teacherId: toTeacherId } : s,
                );
                (data as { lastModified?: string }).lastModified = new Date().toISOString();
                window.localStorage.setItem("classPlannerData", JSON.stringify(data));
              }
            }
          } catch {
            // graceful — localStorage 동기화 실패해도 server 는 처리됨.
          }
        }
        if (archiveOriginal) {
          await deleteTeacher(reassignTarget.id);
        }
        showSuccess(`${reassignTarget.name} 강사 수업이 이전되었습니다${archiveOriginal ? " · 원 강사 보관" : ""}`);
        setReassignTargetId(null);
      } finally {
        setIsReassigning(false);
      }
    },
    [reassignTarget, userId, sessions, deleteTeacher, updateTeacher],
  );

  // 강사 보관 — 서버 archive POST + localStorage 강사 row 정리. 수업은 그대로.
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (userId) {
        const res = await fetch(
          `/api/teachers/${deleteTarget.id}/archive?userId=${userId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: true }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          showError(body.error ?? "강사 보관에 실패했습니다.");
          return;
        }
      }
      await deleteTeacher(deleteTarget.id);
      showSuccess(`${deleteTarget.name} 강사가 보관되었습니다`);
      setDeleteTargetId(null);
      // 보관 직후 archived list refresh — toggle 열려있을 때만.
      if (showArchived) void fetchArchived();
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteTeacher, userId, showArchived, fetchArchived]);

  // 복구 (PR 6 Phase 1b) — archive POST { archived: false } + 클라이언트 강사 목록 refresh.
  // useTeacherManagementLocal 은 localStorage 기반이라 server-only 복구 후 직접 sync 필요.
  // 가장 단순한 방법 — 페이지 reload (localStorage refetch). 추후 hook refresh 추가 가능.
  const handleRestore = useCallback(
    async (id: string) => {
      if (!userId) return;
      setRestoringId(id);
      try {
        const res = await fetch(
          `/api/teachers/${id}/archive?userId=${userId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: false }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          showError(body.error ?? "강사 복구에 실패했습니다.");
          return;
        }
        const restored = archivedTeachers.find((t) => t.id === id);
        showSuccess(`${restored?.name ?? "강사"}가 복구되었습니다. 페이지를 새로고침하면 목록에 표시됩니다.`);
        // archived list 에서 제거 — 다음 fetchArchived 갱신 전에라도 즉시 반영.
        setArchivedTeachers((prev) => prev.filter((t) => t.id !== id));
      } finally {
        setRestoringId(null);
      }
    },
    [userId, archivedTeachers],
  );

  const sessionImpactNote = affectedSessionCount > 0
    ? `담당 수업 ${affectedSessionCount}개의 강사 정보는 그대로 보존됩니다.`
    : "담당 중인 수업이 없습니다.";

  return (
    <>
      {canManage && userId && (
        <div className="px-4 pt-3" data-testid="archived-teachers-section">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-expanded={showArchived}
            data-testid="archived-teachers-toggle"
          >
            {showArchived ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Archive className="w-3.5 h-3.5" />
            보관된 강사 보기
            {!isLoadingArchived && archivedTeachers.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-semibold">
                {archivedTeachers.length}
              </span>
            )}
          </button>

          {showArchived && (
            <div className="mt-2 mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 p-3">
              {isLoadingArchived ? (
                <p className="text-[12px] text-[var(--color-text-muted)] text-center py-2">불러오는 중...</p>
              ) : archivedTeachers.length === 0 ? (
                <p className="text-[12px] text-[var(--color-text-muted)] text-center py-2">보관된 강사가 없습니다.</p>
              ) : (
                <ul className="space-y-1.5">
                  {archivedTeachers.map((t) => (
                    <li
                      key={t.id}
                      data-testid={`archived-teacher-row-${t.id}`}
                      className="flex items-center justify-between gap-3 p-2 rounded bg-[var(--color-bg-primary)] opacity-70"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-[13px] text-[var(--color-text-primary)] truncate">{t.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 font-medium flex-shrink-0">
                          보관됨
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRestore(t.id)}
                        disabled={restoringId === t.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 disabled:opacity-50 transition-colors flex-shrink-0"
                        data-testid={`archived-teacher-restore-${t.id}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        {restoringId === t.id ? "복구 중..." : "복구"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* rank 5-A teacher-owner-overlap A2 (Part 1, UI only) — owner 본인의 강사 정보를
          별도 amber card 로 표시 + 일반 강사 grid 에서 중복 제거. 과목 변경 modal 은
          Part 2 (별도 commit) — 본 Part 1 은 onChangeSubjects 미연결. */}
      <OwnerTeacherCard />

      <TeachersPageLayout
        teachers={filterTeachersForPicker(teachers).filter((t) => t.id !== linkedTeacherId)}
        sessions={sessions}
        enrollments={enrollments}
        subjects={subjects}
        students={students}
        selectedTeacherId={selectedTeacherId}
        onSelectTeacher={setSelectedTeacherId}
        onAddTeacher={handleAddTeacher}
        onDeleteTeacher={handleRequestDelete}
        onReassignTeacher={canManage ? handleRequestReassign : undefined}
        onUpdateTeacher={handleUpdate}
        onAddTeacherSubject={addTeacherSubject}
        onRemoveTeacherSubject={removeTeacherSubject}
        errorMessage={errorMessage}
        onClearError={clearError}
        canManage={canManage}
        linkedTeacherId={linkedTeacherId}
      />

      <ReassignTeacherModal
        isOpen={reassignTarget !== null}
        originalTeacher={reassignTarget ? { id: reassignTarget.id, name: reassignTarget.name } : null}
        candidates={reassignCandidates}
        affectedSessionCount={reassignAffectedCount}
        isProcessing={isReassigning}
        onConfirm={handleReassignConfirm}
        onClose={() => (isReassigning ? undefined : setReassignTargetId(null))}
      />

      <TypedConfirmationModal
        isOpen={deleteTarget !== null}
        title={`'${deleteTarget?.name ?? ""}' 강사를 보관하시겠습니까?`}
        description={`강사 페이지 목록에서 숨김됩니다. ${sessionImpactNote} '보관된 강사 보기' 토글로 복구할 수 있습니다.`}
        confirmText={deleteTarget?.name ?? ""}
        confirmLabel={`${deleteTarget?.name ?? ""} 보관`.trim()}
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => (isDeleting ? undefined : setDeleteTargetId(null))}
      />
    </>
  );
};

export default TeachersPage;
