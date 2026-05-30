"use client";

import { useEffect, useState } from "react";
import StudentsPageLayout from "../../components/organisms/StudentsPageLayout";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
import { useMyRole } from "../../hooks/useMyRole";
import { useAccessCodes } from "../../hooks/useAccessCodes";
import { supabase } from "../../utils/supabaseClient";
import type { Student } from "../../lib/planner";
import { logger } from "../../lib/logger";
import { showError, showSuccess } from "../../lib/toast";

export default function StudentsPage() {
  return <StudentsPageContent />;
}

function StudentsPageContent() {
  const { canManage, isLoading: isRoleLoading, academies } = useMyRole();

  // Auth + active academy resolution (for academy URL + access code fetching)
  const [userId, setUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [activeAcademyId, setActiveAcademyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
      .catch(() => {})
      .finally(() => setAuthResolved(true));
  }, []);

  useEffect(() => {
    if (!userId) return;
    import("../../lib/localStorageCrud").then(({ getActiveAcademyId }) => {
      setActiveAcademyId(getActiveAcademyId(userId));
    });
  }, [userId]);

  const activeAcademy =
    academies.find((a) => a.id === activeAcademyId) ?? academies[0];
  const academyIdentifier = activeAcademy?.slug ?? activeAcademy?.id ?? null;
  const academyUrl =
    academyIdentifier && typeof window !== "undefined"
      ? `${window.location.origin}/academy/${academyIdentifier}`
      : undefined;

  // Parent access codes (only fetched for logged-in admins; hook returns []
  // for null userId, and StudentsPageLayout gates UI on canManage anyway).
  const {
    accessCodes,
    hasInitialData: accessCodesReady,
    handleCreate: handleCreateCodes,
    handleRenew: handleRenewCodes,
    handleCreateForStudent,
    handleRenewForStudent,
    handleRevokeForStudent,
  } = useAccessCodes(canManage ? userId : null);

  // 학원 전체 공유 링크 (access_code/filter_student_id 없는 share token = 학원 전체).
  // /settings 의 일반 공유와 동일 인프라 — A 통합(2026-05-30)으로 /students 상단 바에 노출.
  const [academyShareUrl, setAcademyShareUrl] = useState<string | null>(null);
  const [academyShareExpiresAt, setAcademyShareExpiresAt] = useState<string | null>(null);
  const [creatingAcademyShare, setCreatingAcademyShare] = useState(false);

  useEffect(() => {
    if (!canManage || !userId) return;
    let cancelled = false;
    fetch(`/api/share-tokens?userId=${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        const tokens = (body.data ?? body ?? []) as Array<{
          token: string;
          access_code?: string | null;
          filter_student_id?: string | null;
          expires_at: string;
          revoked_at?: string | null;
        }>;
        // 학원 전체 = access_code 없음 + filter_student_id 없음 + 미취소. 가장 최근 것.
        const academyWide = tokens
          .filter((t) => !t.access_code && !t.filter_student_id && !t.revoked_at)
          .sort((a, b) => (a.expires_at < b.expires_at ? 1 : -1))[0];
        if (academyWide && typeof window !== "undefined") {
          setAcademyShareUrl(`${window.location.origin}/share/${academyWide.token}`);
          setAcademyShareExpiresAt(academyWide.expires_at);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canManage, userId]);

  const handleCopyAcademyShare = () => {
    if (!academyShareUrl) return;
    void navigator.clipboard?.writeText(academyShareUrl).catch(() => {});
  };

  const handleCreateAcademyShare = async () => {
    if (!userId || creatingAcademyShare) return;
    setCreatingAcademyShare(true);
    try {
      const res = await fetch(`/api/share-tokens?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "학원 전체", filterStudentId: null, expiresInDays: 30 }),
      });
      const body = await res.json().catch(() => null);
      const created = body?.data ?? body;
      if (res.ok && created?.token && typeof window !== "undefined") {
        const url = `${window.location.origin}/share/${created.token}`;
        setAcademyShareUrl(url);
        setAcademyShareExpiresAt(created.expires_at ?? null);
        void navigator.clipboard?.writeText(url).catch(() => {});
        showSuccess("학원 전체 공유 링크가 만들어졌어요. 링크가 복사됐습니다.");
      } else {
        showError(body?.error ?? "공유 링크 생성에 실패했습니다.");
      }
    } catch (err) {
      logger.error("학원 공유 링크 생성 실패", undefined, err as Error);
      showError("공유 링크 생성에 실패했습니다.");
    } finally {
      setCreatingAcademyShare(false);
    }
  };

  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // Integrated data for subjects, enrollments, sessions
  const { data } = useIntegratedDataLocal();
  const { subjects = [], enrollments = [], sessions = [] } = data ?? {};

  // Student management
  const {
    students,
    loading: _isLoading,
    error: _error,
    addStudent,
    updateStudent,
    deleteStudent,
    refreshStudents,
    clearError,
  } = useStudentManagementLocal();

  // 학생 추가 핸들러
  const handleAddStudent = async (
    name: string,
    options?: { gender?: string; birthDate?: string; grade?: string },
  ) => {
    try {
      const success = await addStudent(name, options);
      if (success) {
        await refreshStudents();
      }
    } catch (error) {
      logger.error("학생 추가 실패:", undefined, error as Error);
      showError("학생 추가 중 오류가 발생했습니다.");
    }
  };

  // 학생 선택 핸들러
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  // 학생 삭제 핸들러
  const handleDeleteStudent = async (studentId: string) => {
    try {
      const success = await deleteStudent(studentId);
      if (success) {
        if (selectedStudentId === studentId) {
          setSelectedStudentId("");
        }
        await refreshStudents();
      }
    } catch (error) {
      logger.error("학생 삭제 실패:", undefined, error as Error);
      showError("학생 삭제 중 오류가 발생했습니다.");
    }
  };

  // 학생 업데이트 핸들러
  const handleUpdateStudent = async (id: string, updates: Partial<Student>): Promise<boolean> => {
    const success = await updateStudent(id, updates);
    if (success) {
      await refreshStudents();
    }
    return success;
  };

  return (
    <StudentsPageLayout
      students={students}
      subjects={subjects}
      enrollments={enrollments}
      sessions={sessions}
      selectedStudentId={selectedStudentId}
      onSelectStudent={handleSelectStudent}
      onAddStudent={handleAddStudent}
      onDeleteStudent={handleDeleteStudent}
      onUpdateStudent={handleUpdateStudent}
      onClearError={clearError}
      canManage={canManage}
      isRoleLoading={isRoleLoading}
      accessCodes={accessCodes}
      accessCodesReady={canManage ? accessCodesReady : true}
      onCreateCodes={handleCreateCodes}
      onRenewCodes={handleRenewCodes}
      onCreateCodeForStudent={handleCreateForStudent}
      onRenewCodeForStudent={handleRenewForStudent}
      onRevokeCodeForStudent={handleRevokeForStudent}
      academyUrl={academyUrl}
      isAnonymous={authResolved && !userId}
      academyShareUrl={academyShareUrl}
      academyShareExpiresAt={academyShareExpiresAt}
      onCreateAcademyShare={handleCreateAcademyShare}
      onCopyAcademyShare={handleCopyAcademyShare}
      creatingAcademyShare={creatingAcademyShare}
    />
  );
}
