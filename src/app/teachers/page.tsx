"use client";

import { useCallback, useMemo, useState } from "react";
import TeachersPageLayout from "../../components/organisms/TeachersPageLayout";
import TypedConfirmationModal from "../../components/molecules/TypedConfirmationModal";
import { useTeacherManagementLocal } from "../../hooks/useTeacherManagementLocal";
import { useAuth } from "../../contexts/AuthContext";
import { showError, showSuccess } from "../../lib/toast";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useMyRole } from "../../hooks/useMyRole";
import type { TeacherRole } from "../../lib/planner";

const TeachersPage = () => {
  const { canManage, linkedTeacherId } = useMyRole();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
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
  // 강사 row 삭제 typing confirmation (PR 5 — settings 와 동일 무게). 기존 onDelete 직호출은
  // 가벼운 흐름이라 실수 위험. invite_expired/none/active 상태 모두 통일.
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteTarget = useMemo(
    () => teachers.find((t) => t.id === deleteTargetId) ?? null,
    [teachers, deleteTargetId],
  );

  // 영향 미리보기 — 담당 수업 갯수 (sessions.teacherId 매칭).
  const affectedSessionCount = useMemo(() => {
    if (!deleteTarget) return 0;
    return sessions.filter((s) => s.teacherId === deleteTarget.id).length;
  }, [deleteTarget, sessions]);

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

  // useTeacherManagementLocal의 addTeacher는 (name, color, userId?, profile?)을 받지만
  // TeachersPageLayout는 (name, color, profile?) 형태만 노출. userId는 신규 추가 시점에
  // 항상 null (강사를 user 계정에 link하는 별도 흐름은 detail panel에서).
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

  // onDelete prop 은 id 만 전달 — modal 띄우기. 실제 삭제는 modal 의 onConfirm 이.
  const handleRequestDelete = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  // 강사 보관 (PR 6 Phase 1) — 서버 archive POST + localStorage 강사 row 정리.
  // 수업은 그대로 (강사 정보 유지). 복구는 '보관된 강사 보기' 토글에서.
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
      // 익명 사용자 또는 서버 보관 성공 후 — localStorage 정리. 수업의 teacherId 도 undefined.
      await deleteTeacher(deleteTarget.id);
      showSuccess(`${deleteTarget.name} 강사가 보관되었습니다`);
      setDeleteTargetId(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteTeacher, userId]);

  const sessionImpactNote = affectedSessionCount > 0
    ? `담당 수업 ${affectedSessionCount}개의 강사 정보는 그대로 보존됩니다.`
    : "담당 중인 수업이 없습니다.";

  return (
    <>
      <TeachersPageLayout
        teachers={teachers}
        sessions={sessions}
        enrollments={enrollments}
        subjects={subjects}
        students={students}
        selectedTeacherId={selectedTeacherId}
        onSelectTeacher={setSelectedTeacherId}
        onAddTeacher={handleAddTeacher}
        onDeleteTeacher={handleRequestDelete}
        onUpdateTeacher={handleUpdate}
        onAddTeacherSubject={addTeacherSubject}
        onRemoveTeacherSubject={removeTeacherSubject}
        errorMessage={errorMessage}
        onClearError={clearError}
        canManage={canManage}
        linkedTeacherId={linkedTeacherId}
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
