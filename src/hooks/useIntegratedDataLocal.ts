/**
 * 🎣 Custom Hook - useIntegratedDataLocal (localStorage 직접 조작)
 *
 * localStorage의 classPlannerData를 직접 조작하여 즉시 UI에 반영하고,
 * debounce로 서버와 동기화하는 초고속 통합 데이터 관리 훅입니다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  syncEnrollmentCreateAsync,
  syncSessionDelete,
  syncSessionUpdate,
} from "../lib/apiSync";
import {
  addEnrollmentToLocal,
  deleteSessionFromLocal,
  getClassPlannerData,
  replaceEnrollmentId,
  setClassPlannerData,
  updateClassPlannerData,
} from "../lib/localStorageCrud";
import { logger } from "../lib/logger";
import {
  PENDING_DELETE_TTL_MS,
  addPendingDelete,
  getActivePendingDeletes,
  getExpiredPendingDeletes,
  getPendingDeleteIds,
  isPendingDelete,
  removePendingDelete,
} from "../lib/pendingDeletes";
import { showToast, showUndoToast } from "../lib/toast";
import type { Enrollment, Session, Student, Subject, Teacher } from "../lib/planner";

// ===== 타입 정의 =====

export interface IntegratedData {
  students: Student[];
  subjects: Subject[];
  sessions: Session[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  version: string;
}

export interface UseIntegratedDataLocalReturn {
  // 상태
  data: IntegratedData;
  loading: boolean;
  error: string | null;

  // 액션
  refreshData: () => void;
  updateData: (newData: Partial<IntegratedData>) => Promise<boolean>;
  clearError: () => void;

  // 세션 관련 액션 (단일/일괄 삭제만 — 추가/수정은 useScheduleSessionManagement)
  deleteSession: (id: string) => Promise<boolean>;
  bulkDeleteSessions: (ids: string[]) => Promise<void>;

  // 등록 관련 액션
  addEnrollment: (studentId: string, subjectId: string) => Promise<boolean>;

  // 통계
  studentCount: number;
  subjectCount: number;
  sessionCount: number;
  enrollmentCount: number;
  teacherCount: number;
}

// ===== 훅 구현 =====

export const useIntegratedDataLocal = (): UseIntegratedDataLocalReturn => {
  // 🚀 localStorage 직접 조작 방식
  const [data, setData] = useState<IntegratedData>({
    students: [],
    subjects: [],
    sessions: [],
    enrollments: [],
    teachers: [],
    version: "1.0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // localStorage에서 전체 데이터 로드
  const loadDataFromLocal = useCallback(() => {
    try {
      const localData = getClassPlannerData();
      setData(localData);
      setError(null);

      logger.debug(
        "useIntegratedDataLocal - localStorage에서 전체 데이터 로드",
        {
          studentCount: localData.students.length,
          subjectCount: localData.subjects.length,
          sessionCount: localData.sessions.length,
          enrollmentCount: localData.enrollments.length,
          teacherCount: localData.teachers.length,
        }
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "데이터 로드 실패";
      setError(errorMessage);
      logger.error(
        "useIntegratedDataLocal - 데이터 로드 실패:",
        undefined,
        err as Error
      );
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadDataFromLocal();
  }, [loadDataFromLocal]);

  // Pending delete recovery — session 측 (학생/과목/강사 동일 패턴, deferred-commit
  // 진행 중 새로고침 시 init fetch 재흡수 차단 + 남은 시간 timer 재등록).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("supabase_user_id");
    const now = Date.now();

    // server DELETE await — race window 0 (학생/강사/과목 PR #319과 동일 패턴).
    const commitOne = async (id: string) => {
      if (!userId) {
        removePendingDelete("session", id);
        return;
      }
      try {
        const url = `/api/sessions/${id}?userId=${encodeURIComponent(userId)}`;
        const response = await fetch(url, { method: "DELETE" });
        if (!response.ok) {
          logger.warn("세션 삭제 commit 실패 — pendingDeletes 유지", {
            id,
            status: response.status,
          });
          return;
        }
      } catch (err) {
        logger.warn("세션 삭제 commit 네트워크 오류 — pendingDeletes 유지", {
          id,
          error: err instanceof Error ? err.message : String(err),
        });
        return;
      }
      removePendingDelete("session", id);
    };

    for (const p of getExpiredPendingDeletes(now)) {
      if (p.entityType !== "session") continue;
      commitOne(p.id);
      logger.info(
        "useIntegratedDataLocal - expired session pending delete recovered",
        { id: p.id }
      );
    }

    const recoveredTimers: ReturnType<typeof setTimeout>[] = [];
    for (const p of getActivePendingDeletes(now)) {
      if (p.entityType !== "session") continue;
      const remaining = Math.max(0, p.deadline - now);
      const timer = setTimeout(() => {
        if (!isPendingDelete("session", p.id)) return;
        commitOne(p.id);
        logger.info(
          "useIntegratedDataLocal - active session pending delete recovered",
          { id: p.id }
        );
      }, remaining);
      recoveredTimers.push(timer);
    }

    return () => {
      for (const t of recoveredTimers) clearTimeout(t);
    };
  }, []);

  // localStorage 변경 이벤트 리스너 (다른 탭 동기화)
  useEffect(() => {
    const handleStorageChange = () => {
      loadDataFromLocal();
    };

    // 다른 탭에서의 변경사항 감지
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("classPlannerDataChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "classPlannerDataChanged",
        handleStorageChange
      );
    };
  }, [loadDataFromLocal]);

  // ===== 멤버 부트스트랩 동기화 =====
  // 새 기기/브라우저에서 처음 로그인한 사용자(특히 member 역할)는
  // localStorage가 비어 있으므로 시간표가 텅 비어 보인다. 본인 학원에 이미
  // 등록된 학생/과목을 1회 서버에서 가져와 localStorage에 채워 둔다.
  // owner/admin 사용자에게는 동작이 동일하지만, 평소 로컬 우선 흐름에서
  // 데이터가 이미 있으므로 비용은 0.
  const bootstrapAttempted = useRef(false);

  useEffect(() => {
    if (bootstrapAttempted.current) return;
    if (typeof window === "undefined") return;

    const userId = localStorage.getItem("supabase_user_id");
    if (!userId) return;

    const localData = getClassPlannerData();
    const studentsEmpty = !localData.students || localData.students.length === 0;
    const subjectsEmpty = !localData.subjects || localData.subjects.length === 0;
    if (!studentsEmpty && !subjectsEmpty) return;

    bootstrapAttempted.current = true;

    Promise.allSettled([
      fetch(`/api/students?userId=${encodeURIComponent(userId)}`).then((r) => r.json()),
      fetch(`/api/subjects?userId=${encodeURIComponent(userId)}`).then((r) => r.json()),
      fetch(`/api/teachers?userId=${encodeURIComponent(userId)}`).then((r) => r.json()),
    ])
      .then(([studentsRes, subjectsRes, teachersRes]) => {
        const updates: Partial<IntegratedData> = {};

        if (
          studentsEmpty &&
          studentsRes.status === "fulfilled" &&
          studentsRes.value?.success &&
          Array.isArray(studentsRes.value.data) &&
          studentsRes.value.data.length > 0
        ) {
          // pendingDeletes 필터 — 5초 deferred-commit 진행 중인 학생은 부트스트랩에서 제외
          const pendingStudentDeleteIds = getPendingDeleteIds("student");
          const fetched = studentsRes.value.data as Student[];
          updates.students =
            pendingStudentDeleteIds.size > 0
              ? fetched.filter((s) => !pendingStudentDeleteIds.has(s.id))
              : fetched;
        }
        if (
          subjectsEmpty &&
          subjectsRes.status === "fulfilled" &&
          subjectsRes.value?.success &&
          Array.isArray(subjectsRes.value.data) &&
          subjectsRes.value.data.length > 0
        ) {
          // pendingDeletes 필터 — students와 동일
          const pendingSubjectDeleteIds = getPendingDeleteIds("subject");
          const fetched = subjectsRes.value.data as Subject[];
          updates.subjects =
            pendingSubjectDeleteIds.size > 0
              ? fetched.filter((s) => !pendingSubjectDeleteIds.has(s.id))
              : fetched;
        }
        // teachers는 보너스 — admin-only 페이지가 막혀도 강사 컬러/이름이
        // 시간표 색상 모드에 필요하다.
        if (
          teachersRes.status === "fulfilled" &&
          teachersRes.value?.success &&
          Array.isArray(teachersRes.value.data) &&
          teachersRes.value.data.length > 0 &&
          (!localData.teachers || localData.teachers.length === 0)
        ) {
          // pendingDeletes 필터 — 학생/과목과 동일
          const pendingTeacherDeleteIds = getPendingDeleteIds("teacher");
          const fetched = teachersRes.value.data as Teacher[];
          updates.teachers =
            pendingTeacherDeleteIds.size > 0
              ? fetched.filter((t) => !pendingTeacherDeleteIds.has(t.id))
              : fetched;
        }

        if (Object.keys(updates).length === 0) {
          logger.debug("useIntegratedDataLocal - 부트스트랩: 가져온 데이터 없음");
          return;
        }

        const result = updateClassPlannerData(updates);
        if (result.success) {
          logger.info("useIntegratedDataLocal - 부트스트랩 동기화 완료", {
            studentCount: updates.students?.length ?? 0,
            subjectCount: updates.subjects?.length ?? 0,
            teacherCount: updates.teachers?.length ?? 0,
          });
          loadDataFromLocal();
        }
      })
      .catch((err) => {
        // fire-and-forget — 부트스트랩 실패는 UI를 막지 않는다.
        logger.warn("useIntegratedDataLocal - 부트스트랩 실패 (무시)", {
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }, [loadDataFromLocal]);

  // ===== 전체 데이터 업데이트 =====

  const updateData = useCallback(
    async (newData: Partial<IntegratedData>): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        logger.debug("useIntegratedDataLocal - 전체 데이터 업데이트 시작", {
          updates: Object.keys(newData),
        });

        // localStorage에 즉시 업데이트
        const result = updateClassPlannerData(newData);

        if (result.success && result.data) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          logger.info("useIntegratedDataLocal - 전체 데이터 업데이트 성공");

          return true;
        } else {
          setError(result.error || "데이터 업데이트 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "데이터 업데이트 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 데이터 업데이트 실패:",
          undefined,
          err as Error
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadDataFromLocal]
  );

  // ===== 세션 관련 액션 =====
  // addSession / updateSession은 useScheduleSessionManagement로 이전됨 (PR #301 후속).

  const deleteSession = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        logger.debug("useIntegratedDataLocal - 세션 삭제 시작", { id });

        // 1) Snapshot before delete (학생/과목 패턴 동일, no cascade)
        const dataBefore = getClassPlannerData();
        const sessionBefore = dataBefore.sessions.find((s) => s.id === id);
        if (!sessionBefore) {
          setError("세션을 찾을 수 없습니다.");
          return false;
        }

        // 2) Remove from localStorage immediately
        const result = deleteSessionFromLocal(id);

        if (result.success) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          // 3) Defer server commit. pendingDeletes에 영속화 — 새로고침/탭 재진입 시
          // init fetch가 같은 세션을 다시 끌어오지 않도록 + recovery hook이 timer를
          // 다시 잡아 commit을 마침. (학생/과목/강사 #297/#299/이번 PR과 동일 패턴)
          const userId = localStorage.getItem("supabase_user_id");
          const deadline = Date.now() + PENDING_DELETE_TTL_MS;
          addPendingDelete({ entityType: "session", id, deadline });
          let cancelled = false;
          // server DELETE await — race window 0.
          const commitTimer = setTimeout(async () => {
            if (cancelled) return;
            if (!userId) {
              removePendingDelete("session", id);
              return;
            }
            try {
              const url = `/api/sessions/${id}?userId=${encodeURIComponent(userId)}`;
              const response = await fetch(url, { method: "DELETE" });
              if (!response.ok) {
                logger.warn("세션 삭제 commit 실패 — pendingDeletes 유지", {
                  id,
                  status: response.status,
                });
                return;
              }
            } catch (err) {
              logger.warn("세션 삭제 commit 네트워크 오류 — pendingDeletes 유지", {
                id,
                error: err instanceof Error ? err.message : String(err),
              });
              return;
            }
            removePendingDelete("session", id);
            logger.info("useIntegratedDataLocal - 세션 삭제 commit", { id });
          }, PENDING_DELETE_TTL_MS);

          // 4) Undo toast (드래그-삭제는 없음 — 명시 클릭만 도착하므로 안전)
          showUndoToast({
            message: "수업 삭제됨",
            onUndo: () => {
              cancelled = true;
              clearTimeout(commitTimer);
              removePendingDelete("session", id);

              const dataNow = getClassPlannerData();
              if (!dataNow.sessions.find((s) => s.id === sessionBefore.id)) {
                dataNow.sessions.push(sessionBefore);
              }
              dataNow.lastModified = new Date().toISOString();
              setClassPlannerData(dataNow);
              loadDataFromLocal();

              showToast("success", "수업 복원됨");
              logger.info("useIntegratedDataLocal - 세션 삭제 undo", { id });
            },
          });

          logger.info("useIntegratedDataLocal - 세션 삭제 성공", { id });

          return true;
        } else {
          setError(result.error || "세션 삭제 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "세션 삭제 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 세션 삭제 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [loadDataFromLocal]
  );

  /**
   * 다중 sessions 일괄 삭제 — 단일 undo 토스트로 묶음 처리.
   *
   * 흐름:
   *   1. localStorage에서 모두 즉시 제거 + UI reload
   *   2. 단일 bulk undo 토스트 (default 7s)
   *   3. 토스트 timeout 후 N개 syncSessionDelete (fire-and-forget)
   *   4. undo 클릭 시 모두 복원 + sync 취소
   */
  const bulkDeleteSessions = useCallback(
    async (ids: string[]): Promise<void> => {
      if (ids.length === 0) return;
      // 동적 import로 schedule 페이지 utility를 hook에서 사용 (의존성 순환 방지)
      const { bulkDeleteSessionsFromLocal, restoreBulkDeletedSessions } =
        await import("../app/schedule/_utils/bulkSessionOps");
      const { showBulkUndoToast } = await import("../lib/toast");

      const { deleted, notFound, reflowed } = bulkDeleteSessionsFromLocal(ids);
      if (deleted.length === 0) return;
      loadDataFromLocal();

      // Lane reflow로 yPosition 변경된 sessions를 서버에도 sync — 새로고침 시
      // localStorage / server 불일치 회피 (사용자 보고 2026-05-11).
      const userIdForReflow = localStorage.getItem("supabase_user_id");
      if (userIdForReflow && reflowed.length > 0) {
        for (const s of reflowed) {
          syncSessionUpdate(userIdForReflow, s.id, { yPosition: s.yPosition });
        }
      }

      const userId = localStorage.getItem("supabase_user_id");
      // bulk delete TTL은 7초(durationMs와 동일). pendingDeletes에 모든 deleted id를
      // 영속화 — 새로고침 시 init fetch가 재끌어오는 것 차단 + recovery에서 처리.
      const BULK_TTL_MS = 7000;
      const bulkDeadline = Date.now() + BULK_TTL_MS;
      for (const s of deleted) {
        addPendingDelete({ entityType: "session", id: s.id, deadline: bulkDeadline });
      }
      let cancelled = false;
      // server DELETE await — race window 0. bulk도 한 건씩 응답 받고 commit.
      const commitTimer = setTimeout(async () => {
        if (cancelled) return;
        if (!userId) {
          for (const s of deleted) removePendingDelete("session", s.id);
          return;
        }
        await Promise.all(
          deleted.map(async (s) => {
            try {
              const url = `/api/sessions/${s.id}?userId=${encodeURIComponent(userId)}`;
              const response = await fetch(url, { method: "DELETE" });
              if (!response.ok) {
                logger.warn("일괄 삭제 항목 commit 실패 — pendingDeletes 유지", {
                  id: s.id,
                  status: response.status,
                });
                return;
              }
            } catch (err) {
              logger.warn("일괄 삭제 항목 commit 네트워크 오류 — pendingDeletes 유지", {
                id: s.id,
                error: err instanceof Error ? err.message : String(err),
              });
              return;
            }
            removePendingDelete("session", s.id);
          })
        );
        logger.info("useIntegratedDataLocal - 일괄 삭제 commit", {
          count: deleted.length,
        });
      }, BULK_TTL_MS);

      showBulkUndoToast({
        count: deleted.length,
        op: "수업 삭제됨",
        onUndo: () => {
          cancelled = true;
          clearTimeout(commitTimer);
          for (const s of deleted) {
            removePendingDelete("session", s.id);
          }
          restoreBulkDeletedSessions(deleted);
          loadDataFromLocal();
          showToast("success", `${deleted.length}개 수업 복원됨`);
          logger.info("useIntegratedDataLocal - 일괄 삭제 undo", {
            count: deleted.length,
          });
        },
        durationMs: BULK_TTL_MS,
      });

      if (notFound.length > 0) {
        logger.warn("일괄 삭제 — 일부 id 미발견", { notFound });
      }
    },
    [loadDataFromLocal]
  );

  // ===== 등록 관련 액션 =====

  const addEnrollment = useCallback(
    async (studentId: string, subjectId: string): Promise<boolean> => {
      try {
        setError(null);

        logger.debug("useIntegratedDataLocal - 등록 추가 시작", {
          studentId,
          subjectId,
        });

        // localStorage에 즉시 추가
        const result = addEnrollmentToLocal(studentId, subjectId);

        if (result.success && result.data) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          // 서버 동기화 — server가 idempotent create를 보장. (student_id, subject_id)
          // 충돌 시 *기존 row의 id*를 200으로 반환하므로, 응답 id가 보낸 id와
          // 다르면 localStorage(enrollments + sessions[].enrollmentIds)를 reconcile.
          // 이게 없으면 후속 session POST가 잘못된 enrollmentIds로 가서 FK 위반.
          const userId = localStorage.getItem("supabase_user_id");
          const localId = result.data.id;
          const serverResp = await syncEnrollmentCreateAsync(userId, {
            id: localId,
            studentId,
            subjectId,
          });
          if (serverResp && serverResp.id !== localId) {
            replaceEnrollmentId(localId, serverResp.id);
            loadDataFromLocal();
            logger.info("useIntegratedDataLocal - enrollment id reconciled", {
              localId,
              serverId: serverResp.id,
              studentId,
              subjectId,
            });
          }

          logger.info("useIntegratedDataLocal - 등록 추가 성공", {
            enrollmentId: serverResp?.id ?? localId,
            studentId,
            subjectId,
          });

          return true;
        } else {
          setError(result.error || "등록 추가 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "등록 추가 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 등록 추가 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [loadDataFromLocal]
  );

  // 강사 관련 액션 (add/update/delete)은 모두 useTeacherManagementLocal로 이전.
  // 등록 삭제(deleteEnrollment)는 외부 사용처가 없어 제거.

  // ===== 데이터 새로고침 =====

  const refreshData = useCallback(() => {
    loadDataFromLocal();
  }, [loadDataFromLocal]);

  // ===== 에러 초기화 =====

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== 통계 =====

  const studentCount = data.students.length;
  const subjectCount = data.subjects.length;
  const sessionCount = data.sessions.length;
  const enrollmentCount = data.enrollments.length;
  const teacherCount = data.teachers.length;

  // ===== 반환값 =====

  return {
    // 상태
    data,
    loading,
    error,

    // 액션
    refreshData,
    updateData,
    clearError,

    // 세션 관련 액션 (단일/일괄 삭제만)
    deleteSession,
    bulkDeleteSessions,

    // 등록 관련 액션
    addEnrollment,

    // 통계
    studentCount,
    subjectCount,
    sessionCount,
    enrollmentCount,
    teacherCount,
  };
};
