/**
 * 🎣 Custom Hook - useStudentManagementLocal (localStorage 직접 조작)
 *
 * localStorage의 classPlannerData를 직접 조작하여 즉시 UI에 반영하고,
 * debounce로 서버와 동기화하는 초고속 학생 데이터 관리 훅입니다.
 */

import { useCallback, useEffect, useState } from "react";
import {
  syncStudentCreateAsync,
  syncStudentDelete,
  syncStudentUpdate,
} from "../lib/apiSync";
import {
  addStudentToLocal,
  deleteStudentFromLocal,
  getAllStudentsFromLocal,
  getClassPlannerData,
  replaceStudentId,
  setClassPlannerData,
  updateStudentInLocal,
} from "../lib/localStorageCrud";
import { logger } from "../lib/logger";
import { validateStudentName } from "../lib/validation/profileSchemas";
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
import { useMyRole } from "./useMyRole";

const PERMISSION_DENIED_MESSAGE = "학생 추가/수정/삭제는 원장과 관리자만 가능합니다.";

// ===== 타입 정의 =====

export interface Student {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
  school?: string;
  phone?: string;
}

export interface UseStudentManagementLocalReturn {
  // 상태
  students: Student[];
  loading: boolean;
  error: string | null;

  // 액션
  addStudent: (
    name: string,
    options?: { gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
  ) => Promise<boolean>;
  updateStudent: (
    id: string,
    updates: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
  ) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;

  // 유틸리티
  refreshStudents: () => void;
  clearError: () => void;

  // 통계
  studentCount: number;
}

// ===== 훅 구현 =====

export const useStudentManagementLocal =
  (): UseStudentManagementLocalReturn => {
    // 🚀 localStorage 직접 조작 방식
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 권한 게이트 — member 역할은 mutating 호출 차단
    const { canManage, isLoading: roleLoading } = useMyRole();

    // localStorage에서 학생 데이터 로드
    const loadStudentsFromLocal = useCallback(() => {
      try {
        const localStudents = getAllStudentsFromLocal();
        setStudents(localStudents);
        setError(null);

        logger.debug(
          "useStudentManagementLocal - localStorage에서 학생 데이터 로드",
          {
            count: localStudents.length,
          }
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "학생 데이터 로드 실패";
        setError(errorMessage);
        logger.error(
          "useStudentManagementLocal - 데이터 로드 실패:",
          undefined,
          err as Error
        );
      }
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
      loadStudentsFromLocal();
    }, [loadStudentsFromLocal]);

    // Pending delete recovery — 새로고침/탭 재진입 시 진행 중이던 5초 deferred-commit
    // 복원. expired entry는 즉시 server commit, active entry는 남은 시간 동안 timer 재등록.
    useEffect(() => {
      if (typeof window === "undefined") return;
      const userId = localStorage.getItem("supabase_user_id");
      const now = Date.now();

      // Server DELETE를 await — 응답 받은 후에만 pendingDeletes 제거 (UAT 2026-05-09
      // 김요섭/강지원/김승건 부활 root cause). fire-and-forget commit은 server에 DELETE
      // 도착 전 useGlobalData 재실행 시 server fetch가 학생 그대로 받아옴 + pendingDeletes
      // 비었음 → filter 못 함 → 부활. await로 race window 0.
      // 실패 시 pendingDeletes 그대로 둠 → 다음 mount의 recovery hook이 재시도.
      const commitOne = async (id: string) => {
        if (!userId) {
          // userId 없으면 sync 자체 의미 없음 — pendingDeletes만 정리
          removePendingDelete("student", id);
          return;
        }
        try {
          const url = `/api/students/${id}?userId=${encodeURIComponent(userId)}`;
          const response = await fetch(url, { method: "DELETE" });
          if (!response.ok) {
            logger.warn("학생 삭제 commit 실패 — pendingDeletes 유지, 다음 mount에 재시도", {
              id,
              status: response.status,
            });
            return; // pendingDeletes 그대로
          }
        } catch (err) {
          logger.warn("학생 삭제 commit 네트워크 오류 — pendingDeletes 유지", {
            id,
            error: err instanceof Error ? err.message : String(err),
          });
          return;
        }
        // share-tokens revoke는 best-effort (학생 삭제는 이미 성공)
        try {
          await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: id }),
          });
        } catch {
          // ignore — access-code revoke 실패는 학생 삭제 성공과 무관
        }
        removePendingDelete("student", id);
      };

      for (const p of getExpiredPendingDeletes(now)) {
        if (p.entityType !== "student") continue;
        commitOne(p.id);
        logger.info(
          "useStudentManagementLocal - expired pending delete recovered",
          { id: p.id }
        );
      }

      const recoveredTimers: ReturnType<typeof setTimeout>[] = [];
      for (const p of getActivePendingDeletes(now)) {
        if (p.entityType !== "student") continue;
        const remaining = Math.max(0, p.deadline - now);
        const timer = setTimeout(() => {
          if (!isPendingDelete("student", p.id)) return;
          commitOne(p.id);
          logger.info(
            "useStudentManagementLocal - active pending delete recovered",
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
        loadStudentsFromLocal();
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
    }, [loadStudentsFromLocal]);

    // ===== 학생 추가 =====

    const addStudent = useCallback(
      async (
        name: string,
        options?: { gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
      ): Promise<boolean> => {
        if (!roleLoading && !canManage) {
          setError(PERMISSION_DENIED_MESSAGE);
          showToast("error", PERMISSION_DENIED_MESSAGE);
          return false;
        }
        // Client validation — required/min/max 모두 SSOT(profileSchemas) 호출로
        // 통일. invalid 시 localStorage 저장 차단해 sync 10 retry 실패 + outbox
        // 누적 회귀 방지 (omni-radar 2026-05-11 추적).
        const nameValidation = validateStudentName(name ?? "");
        if (!nameValidation.ok) {
          const msg = getKoMessage(nameValidation.code);
          setError(msg);
          showToast("error", msg);
          return false;
        }
        try {
          setLoading(true);
          setError(null);

          logger.debug("useStudentManagementLocal - 학생 추가 시작", { name });

          // localStorage에 즉시 추가
          const result = addStudentToLocal(name, options);

          if (result.success && result.data) {
            // UI 즉시 업데이트
            loadStudentsFromLocal();

            // 서버 동기화 — server는 받은 id를 INSERT/UPSERT에 사용. 응답 id가
            // localId와 다르면 (드물게 발생) localStorage 측 학생 + 모든
            // enrollments[].studentId 를 reconcile.
            const userId = localStorage.getItem("supabase_user_id");
            const localId = result.data.id;
            const serverResp = await syncStudentCreateAsync(userId, {
              id: localId,
              name: name.trim(),
              ...options,
            });
            if (serverResp && serverResp.id !== localId) {
              replaceStudentId(localId, serverResp.id);
              loadStudentsFromLocal();
              logger.info("useStudentManagementLocal - student id reconciled", {
                localId,
                serverId: serverResp.id,
                name,
              });
            }

            // Toast는 호출부(StudentsPageLayout.handleAdd)가 0건/1건+ 분기에 맞춰 발화한다.
            // hook에서 또 띄우면 중복 토스트 발생 (UAT 2026-05-10 보고).

            logger.info("useStudentManagementLocal - 학생 추가 성공", {
              name,
              studentId: serverResp?.id ?? localId,
            });

            return true;
          } else {
            const msg = result.error || "학생 추가 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "학생 추가 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useStudentManagementLocal - 학생 추가 실패:",
            undefined,
            err as Error
          );
          return false;
        } finally {
          setLoading(false);
        }
      },
      [loadStudentsFromLocal, canManage, roleLoading]
    );

    // ===== 학생 수정 =====

    const updateStudent = useCallback(
      async (
        id: string,
        updates: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
      ): Promise<boolean> => {
        if (!roleLoading && !canManage) {
          setError(PERMISSION_DENIED_MESSAGE);
          showToast("error", PERMISSION_DENIED_MESSAGE);
          return false;
        }
        try {
          setLoading(true);
          setError(null);

          logger.debug("useStudentManagementLocal - 학생 수정 시작", {
            id,
            updates,
          });

          // localStorage에 즉시 수정
          const result = updateStudentInLocal(id, updates);

          if (result.success && result.data) {
            // UI 즉시 업데이트
            loadStudentsFromLocal();

            // 서버 동기화 (fire-and-forget)
            const userId = localStorage.getItem("supabase_user_id");
            syncStudentUpdate(userId, id, updates);

            showToast("success", "학생 정보가 수정됐습니다");

            logger.info("useStudentManagementLocal - 학생 수정 성공", {
              id,
              updates,
            });

            return true;
          } else {
            const msg = result.error || "학생 수정 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "학생 수정 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useStudentManagementLocal - 학생 수정 실패:",
            undefined,
            err as Error
          );
          return false;
        } finally {
          setLoading(false);
        }
      },
      [loadStudentsFromLocal, canManage, roleLoading]
    );

    // ===== 학생 삭제 =====
    // Deferred-commit + undo toast pattern (PR γ):
    // 1) Snapshot the student + cascading enrollments + affected sessions
    // 2) Remove from localStorage immediately (UI update)
    // 3) DEFER server sync + access-code revoke by 5s
    // 4) Show undo toast (sonner action)
    // 5) On undo: cancel timer, restore snapshot to localStorage
    // 6) On timeout: server commit proceeds (delete + revoke)
    //
    // Caveat: closing the tab within the 5s window leaves localStorage
    // empty but server intact → on next load, server fetch repopulates
    // (effectively "undo by leaving"). Acceptable given Local-first arch.

    const deleteStudent = useCallback(
      async (id: string): Promise<boolean> => {
        if (!roleLoading && !canManage) {
          setError(PERMISSION_DENIED_MESSAGE);
          showToast("error", PERMISSION_DENIED_MESSAGE);
          return false;
        }
        try {
          setLoading(true);
          setError(null);

          logger.debug("useStudentManagementLocal - 학생 삭제 시작", { id });

          // 1) Snapshot before delete (for undo)
          const dataBefore = getClassPlannerData();
          const studentBefore = dataBefore.students.find((s) => s.id === id);
          if (!studentBefore) {
            setError("학생을 찾을 수 없습니다.");
            return false;
          }
          const enrollmentsBefore = dataBefore.enrollments.filter(
            (e) => e.studentId === id,
          );
          const targetEnrollmentIds = new Set(
            enrollmentsBefore.map((e) => e.id),
          );
          const sessionsAffectedBefore = dataBefore.sessions
            .filter((s) =>
              s.enrollmentIds?.some((eid) => targetEnrollmentIds.has(eid)),
            )
            .map((s) => ({ ...s, enrollmentIds: [...(s.enrollmentIds ?? [])] }));

          // 2) Remove from localStorage immediately
          const result = deleteStudentFromLocal(id);

          if (result.success) {
            loadStudentsFromLocal();

            // 3) Defer server commit (cancellable via undo).
            // pendingDeletes에 영속화하여 새로고침/탭 재진입 시 init fetch가
            // 같은 학생을 다시 끌어오지 않도록 하고, recovery hook이 timer를
            // 다시 잡아 commit을 마치게 한다.
            const userId = localStorage.getItem("supabase_user_id");
            const deadline = Date.now() + PENDING_DELETE_TTL_MS;
            addPendingDelete({ entityType: "student", id, deadline });
            let cancelled = false;
            // server DELETE await — 응답 받은 후만 pendingDeletes 제거 (race window 0).
            // 실패 시 pendingDeletes 그대로 → 다음 mount의 recovery hook이 재시도.
            const commitTimer = setTimeout(async () => {
              if (cancelled) return;
              if (!userId) {
                removePendingDelete("student", id);
                return;
              }
              try {
                const url = `/api/students/${id}?userId=${encodeURIComponent(userId)}`;
                const response = await fetch(url, { method: "DELETE" });
                if (!response.ok) {
                  logger.warn("학생 삭제 commit 실패 — pendingDeletes 유지, 재시도 대기", {
                    id,
                    status: response.status,
                  });
                  return; // pendingDeletes 그대로
                }
              } catch (err) {
                logger.warn("학생 삭제 commit 네트워크 오류 — pendingDeletes 유지", {
                  id,
                  error: err instanceof Error ? err.message : String(err),
                });
                return;
              }
              try {
                await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ studentId: id }),
                });
              } catch {
                // share-token revoke best-effort
              }
              removePendingDelete("student", id);
              logger.info("useStudentManagementLocal - 학생 삭제 commit", {
                id,
              });
            }, PENDING_DELETE_TTL_MS);

            // 4) Undo toast — restore snapshot if clicked within 5s
            showUndoToast({
              message: `${studentBefore.name} 삭제됨`,
              onUndo: () => {
                cancelled = true;
                clearTimeout(commitTimer);
                removePendingDelete("student", id);

                // Restore student + enrollments + affected sessions
                const dataNow = getClassPlannerData();
                if (!dataNow.students.find((s) => s.id === studentBefore.id)) {
                  dataNow.students.push(studentBefore);
                }
                for (const e of enrollmentsBefore) {
                  if (!dataNow.enrollments.find((ee) => ee.id === e.id)) {
                    dataNow.enrollments.push(e);
                  }
                }
                for (const sBefore of sessionsAffectedBefore) {
                  const idx = dataNow.sessions.findIndex(
                    (s) => s.id === sBefore.id,
                  );
                  if (idx === -1) {
                    dataNow.sessions.push(sBefore);
                  } else {
                    const merged = Array.from(
                      new Set([
                        ...(dataNow.sessions[idx].enrollmentIds ?? []),
                        ...(sBefore.enrollmentIds ?? []),
                      ]),
                    );
                    dataNow.sessions[idx] = {
                      ...dataNow.sessions[idx],
                      enrollmentIds: merged,
                    };
                  }
                }
                dataNow.lastModified = new Date().toISOString();
                setClassPlannerData(dataNow);
                loadStudentsFromLocal();

                showToast("success", `${studentBefore.name} 복원됨`);
                logger.info("useStudentManagementLocal - 학생 삭제 undo", {
                  id,
                });
              },
            });

            return true;
          } else {
            const msg = result.error || "학생 삭제 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "학생 삭제 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useStudentManagementLocal - 학생 삭제 실패:",
            undefined,
            err as Error
          );
          return false;
        } finally {
          setLoading(false);
        }
      },
      [loadStudentsFromLocal, canManage, roleLoading]
    );

    // ===== 학생 목록 새로고침 =====

    const refreshStudents = useCallback(() => {
      loadStudentsFromLocal();
    }, [loadStudentsFromLocal]);

    // ===== 에러 초기화 =====

    const clearError = useCallback(() => {
      setError(null);
    }, []);

    // ===== 통계 =====

    const studentCount = students.length;

    // ===== 반환값 =====

    return {
      // 상태
      students,
      loading,
      error,

      // 액션
      addStudent,
      updateStudent,
      deleteStudent,

      // 유틸리티
      refreshStudents,
      clearError,

      // 통계
      studentCount,
    };
  };
