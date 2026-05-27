/**
 * useTeacherManagementLocal: localStorage SSOT 의 강사 entity CRUD (add/update/
 * delete + teacher-subject M:N) + deferred-commit undo + server sync 만 담당.
 *
 * 의존성:
 *   - localStorageCrud (강사 CRUD + teacher-subject M:N)
 *   - apiSync (syncTeacherCreateAsync — id reconcile, syncTeacherUpdate, syncTeacherSubject*)
 *   - pendingDeletes (deferred-commit + recovery)
 *   - validation/profileSchemas (validateTeacherName — SSOT)
 *   - toast (undo UX)
 *   - non-goal: permission gate (강사 hook 은 호출부 수준 권한 처리)
 *
 * 결정 history:
 *   - UAT 2026-05-09: deferred-commit + await (race window 0, ADR-012) — 학생/과목 패턴 동일.
 *   - UAT 2026-05-10: profile (email/phone) 누락 시 동명이인 차단 회귀 → addTeacherToLocal 에 profile 그대로 전달.
 *   - UAT 2026-05-10: 중복 토스트 회피 — hook 에서 add success toast 제거 (호출부 책임).
 *   - Cascade: delete 시 sessions.teacherId 를 undefined 로 (세션 자체 보존), undo 시 복원.
 *   - ADR-002 (2026-05-28): Cohesion Sweep — commit 패턴 2 곳 중복을 internal helper
 *     `commitTeacherDeleteOnServer` 로 추출.
 */

import { useCallback, useEffect, useState } from "react";
import {
  syncTeacherCreateAsync,
  syncTeacherDelete,
  syncTeacherSubjectAdd,
  syncTeacherSubjectRemove,
  syncTeacherUpdate,
} from "../lib/apiSync";
import {
  addTeacherSubjectToLocal,
  addTeacherToLocal,
  deleteTeacherFromLocal,
  getAllTeachersFromLocal,
  getClassPlannerData,
  removeTeacherSubjectFromLocal,
  replaceTeacherId,
  setClassPlannerData,
  updateTeacherInLocal,
} from "../lib/localStorageCrud";
import { logger } from "../lib/logger";
import { validateTeacherName } from "../lib/validation/profileSchemas";
import { getKoMessage } from "../lib/errors/messages.ko";
import {
  PENDING_DELETE_TTL_MS,
  addPendingDelete,
  getActivePendingDeletes,
  getExpiredPendingDeletes,
  isPendingDelete,
  removePendingDelete,
} from "../lib/pendingDeletes";
import { showToast, showUndoToast } from "../lib/toast";
import type { Teacher, TeacherRole } from "../lib/planner";

/**
 * Server 에 강사 DELETE 요청 + 결과에 따라 pendingDeletes 정리 만 담당.
 *
 * - userId null (anonymous) → server 호출 skip, 바로 pendingDeletes 정리.
 * - response.ok → pendingDeletes 정리.
 * - 4xx/5xx → pendingDeletes 유지 (recovery hook 이 다음 mount 에서 재시도).
 * - network 오류 → pendingDeletes 유지.
 *
 * race window 0 — fetch await 후에만 removePendingDelete (ADR-012, UAT 2026-05-09).
 * 2 곳 (recovery effect / deleteTeacher setTimeout) 에서 동일 호출 — ADR-002 sweep #8.
 */
async function commitTeacherDeleteOnServer(
  userId: string | null,
  id: string,
): Promise<boolean> {
  if (!userId) {
    removePendingDelete("teacher", id);
    return true;
  }
  try {
    const url = `/api/teachers/${id}?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url, { method: "DELETE" });
    if (!response.ok) {
      logger.warn("강사 삭제 commit 실패 — pendingDeletes 유지", {
        id,
        status: response.status,
      });
      return false;
    }
  } catch (err) {
    logger.warn("강사 삭제 commit 네트워크 오류 — pendingDeletes 유지", {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
  removePendingDelete("teacher", id);
  return true;
}

// ===== 타입 정의 =====

export interface UseTeacherManagementLocalReturn {
  // 상태
  teachers: Teacher[];
  errorMessage: string;

  // 액션
  addTeacher: (
    name: string,
    color: string,
    userId?: string | null,
    profile?: {
      email?: string | null;
      phone?: string | null;
      role?: TeacherRole | null;
      notes?: string | null;
    }
  ) => Promise<boolean>;
  updateTeacher: (
    id: string,
    updates: {
      name?: string;
      color?: string;
      userId?: string | null;
      email?: string | null;
      phone?: string | null;
      role?: TeacherRole | null;
      notes?: string | null;
    }
  ) => Promise<boolean>;
  deleteTeacher: (id: string) => Promise<boolean>;
  addTeacherSubject: (teacherId: string, subjectId: string) => Promise<boolean>;
  removeTeacherSubject: (teacherId: string, subjectId: string) => Promise<boolean>;

  // 유틸리티
  clearError: () => void;

  // 통계
  teacherCount: number;
}

// ===== 훅 구현 =====

export const useTeacherManagementLocal =
  (): UseTeacherManagementLocalReturn => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadTeachersFromLocal = useCallback(() => {
      try {
        const localTeachers = getAllTeachersFromLocal();
        setTeachers(localTeachers);
        logger.debug("useTeacherManagementLocal - 강사 데이터 로드", {
          count: localTeachers.length,
        });
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "강사 데이터 로드 실패";
        setError(errorMessage);
        logger.error(
          "useTeacherManagementLocal - 데이터 로드 실패:",
          undefined,
          err as Error
        );
        setTeachers([]);
      }
    }, []);

    useEffect(() => {
      loadTeachersFromLocal();
    }, [loadTeachersFromLocal]);

    // Pending delete recovery — 새로고침/탭 재진입 시 진행 중이던 5초 deferred-commit
    // 복원 (#297 학생 패턴 동일).
    useEffect(() => {
      if (typeof window === "undefined") return;
      const userId = localStorage.getItem("supabase_user_id");
      const now = Date.now();

      // server DELETE await — race window 0. commitTeacherDeleteOnServer helper (ADR-002 sweep #8).
      for (const p of getExpiredPendingDeletes(now)) {
        if (p.entityType !== "teacher") continue;
        void commitTeacherDeleteOnServer(userId, p.id);
        logger.info(
          "useTeacherManagementLocal - expired pending delete recovered",
          { id: p.id }
        );
      }

      const recoveredTimers: ReturnType<typeof setTimeout>[] = [];
      for (const p of getActivePendingDeletes(now)) {
        if (p.entityType !== "teacher") continue;
        const remaining = Math.max(0, p.deadline - now);
        const timer = setTimeout(() => {
          if (!isPendingDelete("teacher", p.id)) return;
          void commitTeacherDeleteOnServer(userId, p.id);
          logger.info(
            "useTeacherManagementLocal - active pending delete recovered",
            { id: p.id }
          );
        }, remaining);
        recoveredTimers.push(timer);
      }

      return () => {
        for (const t of recoveredTimers) clearTimeout(t);
      };
    }, []);

    useEffect(() => {
      const handleStorageChange = () => {
        loadTeachersFromLocal();
      };

      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("classPlannerDataChanged", handleStorageChange);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener(
          "classPlannerDataChanged",
          handleStorageChange
        );
      };
    }, [loadTeachersFromLocal]);

    // ===== 강사 추가 =====

    const addTeacher = useCallback(
      async (
        name: string,
        color: string,
        userId?: string | null,
        profile?: {
          email?: string | null;
          phone?: string | null;
          role?: TeacherRole | null;
          notes?: string | null;
        }
      ): Promise<boolean> => {
        // Client validation — required/min/max 모두 SSOT(profileSchemas) 호출로
        // 통일. invalid 시 sync retry 회피.
        const nameValidation = validateTeacherName(name ?? "");
        if (!nameValidation.ok) {
          const msg = getKoMessage(nameValidation.code);
          setError(msg);
          showToast("error", msg);
          return false;
        }
        try {
          setError(null);

          logger.debug("useTeacherManagementLocal - 강사 추가 시작", {
            name,
            color,
          });

          // UAT 2026-05-10: profile(email/phone) 누락 시 localStorageCrud가 빈 값
          // 비교로 동명이인을 차단하던 회귀. profile을 그대로 전달해 식별 필드 일관성 유지.
          const result = addTeacherToLocal(name, color, userId, profile);

          if (result.success && result.data) {
            loadTeachersFromLocal();

            // 서버 동기화 — 응답 id가 localId와 다르면 localStorage 측
            // teacher + sessions[].teacherId 를 reconcile.
            const currentUserId = localStorage.getItem("supabase_user_id");
            const localId = result.data.id;
            const serverResp = await syncTeacherCreateAsync(currentUserId, {
              id: localId,
              name,
              color,
              userId,
              ...profile,
            });
            if (serverResp && serverResp.id !== localId) {
              replaceTeacherId(localId, serverResp.id);
              loadTeachersFromLocal();
              logger.info("useTeacherManagementLocal - teacher id reconciled", {
                localId,
                serverId: serverResp.id,
                name,
              });
            }

            // Toast는 호출부(TeachersPageLayout.handleAdd)가 0건/1건+ 분기에 맞춰 발화한다.
            // hook에서 또 띄우면 중복 토스트 발생 (UAT 2026-05-10 보고).

            logger.info("useTeacherManagementLocal - 강사 추가 성공", {
              name,
              teacherId: serverResp?.id ?? localId,
            });

            return true;
          } else {
            const msg = result.error || "강사 추가 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "강사 추가 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useTeacherManagementLocal - 강사 추가 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadTeachersFromLocal]
    );

    // ===== 강사 수정 =====

    const updateTeacher = useCallback(
      async (
        id: string,
        updates: {
          name?: string;
          color?: string;
          userId?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: TeacherRole | null;
          notes?: string | null;
        }
      ): Promise<boolean> => {
        try {
          setError(null);

          logger.debug("useTeacherManagementLocal - 강사 수정 시작", {
            id,
            updates,
          });

          const result = updateTeacherInLocal(id, updates);

          if (result.success && result.data) {
            loadTeachersFromLocal();

            const userId = localStorage.getItem("supabase_user_id");
            syncTeacherUpdate(userId, id, updates);

            showToast("success", "강사 정보가 수정됐습니다");

            logger.info("useTeacherManagementLocal - 강사 수정 성공", {
              id,
              updates,
            });

            return true;
          } else {
            const msg = result.error || "강사 수정 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "강사 수정 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useTeacherManagementLocal - 강사 수정 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadTeachersFromLocal]
    );

    // ===== 강사 삭제 (deferred + undo, PR γ 패턴) =====
    // Cascade: teacher + 그 강사가 배정된 sessions의 teacherId를 undefined로 (세션 자체는 보존)
    // Snapshot: teacher 객체 + sessionId → 원본 teacherId Map

    const deleteTeacher = useCallback(
      async (id: string): Promise<boolean> => {
        try {
          setError(null);

          logger.debug("useTeacherManagementLocal - 강사 삭제 시작", { id });

          // 1) Snapshot
          const dataBefore = getClassPlannerData();
          const teacherBefore = dataBefore.teachers.find((t) => t.id === id);
          if (!teacherBefore) {
            setError("강사를 찾을 수 없습니다.");
            return false;
          }
          // 강사가 배정된 session id 목록 (teacherId == id) — undo 시 다시 배정
          const affectedSessionIds = dataBefore.sessions
            .filter((s) => s.teacherId === id)
            .map((s) => s.id);

          // 2) Remove
          const result = deleteTeacherFromLocal(id);

          if (result.success) {
            loadTeachersFromLocal();

            // 3) Defer server commit. pendingDeletes에 영속화하여 새로고침/탭 재진입
            // 시 init fetch가 같은 강사를 다시 끌어오지 않도록 + recovery hook이
            // timer를 다시 잡아 commit을 마침. (학생/과목 #297/#299와 동일 패턴)
            const userId = localStorage.getItem("supabase_user_id");
            const deadline = Date.now() + PENDING_DELETE_TTL_MS;
            addPendingDelete({ entityType: "teacher", id, deadline });
            let cancelled = false;
            // server DELETE await — race window 0. commitTeacherDeleteOnServer helper (ADR-002 sweep #8).
            const commitTimer = setTimeout(async () => {
              if (cancelled) return;
              const ok = await commitTeacherDeleteOnServer(userId, id);
              if (ok) logger.info("useTeacherManagementLocal - 강사 삭제 commit", { id });
            }, PENDING_DELETE_TTL_MS);

            // 4) Undo toast
            showUndoToast({
              message: `${teacherBefore.name} 강사 삭제됨`,
              onUndo: () => {
                cancelled = true;
                clearTimeout(commitTimer);
                removePendingDelete("teacher", id);

                const dataNow = getClassPlannerData();
                if (!dataNow.teachers.find((t) => t.id === teacherBefore.id)) {
                  dataNow.teachers.push(teacherBefore);
                }
                // sessions의 teacherId 복원
                dataNow.sessions = dataNow.sessions.map((s) =>
                  affectedSessionIds.includes(s.id)
                    ? { ...s, teacherId: teacherBefore.id }
                    : s,
                );
                dataNow.lastModified = new Date().toISOString();
                setClassPlannerData(dataNow);
                loadTeachersFromLocal();

                showToast("success", `${teacherBefore.name} 강사 복원됨`);
                logger.info("useTeacherManagementLocal - 강사 삭제 undo", { id });
              },
            });

            return true;
          } else {
            const msg = result.error || "강사 삭제 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "강사 삭제 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useTeacherManagementLocal - 강사 삭제 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadTeachersFromLocal]
    );

    // ===== 강사-과목 추가 =====

    const addTeacherSubject = useCallback(
      async (teacherId: string, subjectId: string): Promise<boolean> => {
        try {
          setError(null);
          const result = addTeacherSubjectToLocal(teacherId, subjectId);
          if (result.success) {
            loadTeachersFromLocal();
            const currentUserId = localStorage.getItem("supabase_user_id");
            syncTeacherSubjectAdd(currentUserId, teacherId, subjectId);
            return true;
          }
          const msg = result.error || "강사-과목 추가 실패";
          setError(msg);
          showToast("error", msg);
          return false;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "강사-과목 추가 실패";
          setError(msg);
          showToast("error", msg);
          return false;
        }
      },
      [loadTeachersFromLocal]
    );

    // ===== 강사-과목 삭제 =====

    const removeTeacherSubject = useCallback(
      async (teacherId: string, subjectId: string): Promise<boolean> => {
        try {
          setError(null);
          const result = removeTeacherSubjectFromLocal(teacherId, subjectId);
          if (result.success) {
            loadTeachersFromLocal();
            const currentUserId = localStorage.getItem("supabase_user_id");
            syncTeacherSubjectRemove(currentUserId, teacherId, subjectId);
            return true;
          }
          const msg = result.error || "강사-과목 삭제 실패";
          setError(msg);
          showToast("error", msg);
          return false;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "강사-과목 삭제 실패";
          setError(msg);
          showToast("error", msg);
          return false;
        }
      },
      [loadTeachersFromLocal]
    );

    // ===== 유틸리티 =====

    const clearError = useCallback(() => {
      setError(null);
    }, []);

    const teacherCount = teachers.length;

    return {
      teachers,
      errorMessage: error || "",

      addTeacher,
      updateTeacher,
      deleteTeacher,
      addTeacherSubject,
      removeTeacherSubject,

      clearError,

      teacherCount,
    };
  };
