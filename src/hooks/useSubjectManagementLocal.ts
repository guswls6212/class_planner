/**
 * useSubjectManagementLocal: localStorage SSOT 의 과목 entity CRUD (add/update/
 * delete) + cascading enrollments + sessions + deferred-commit undo + role gate 만 담당.
 *
 * 의존성:
 *   - localStorageCrud (과목 CRUD + cascade)
 *   - apiSync (syncSubjectCreateAsync — id reconcile, syncSubjectUpdate)
 *   - pendingDeletes (deferred-commit + recovery)
 *   - validation/profileSchemas (validateSubjectName + validateSubjectInput — SSOT)
 *   - useMyRole (canManage 권한 게이트)
 *   - toast (undo UX)
 *
 * 결정 history:
 *   - UAT 2026-05-09: deferred-commit + await — race window 0 (학생/강사 동일 패턴, ADR-012).
 *   - UAT 2026-05-10: 중복 토스트 — hook 에서 add success toast 제거 (호출부 SubjectsPageLayout 책임).
 *   - 4-layer validation: update 시 invalid color hex 등이 localStorage 저장된 뒤 sync error 따라붙는 모순 차단 (UI/sync layer 사전 검증).
 *   - Cascade: subject delete 시 관련 enrollments + sessions 정리 (localStorageCrud.deleteSubjectFromLocal). undo 시 snapshot 복원.
 *   - ADR-002 (2026-05-28): Cohesion Sweep — commit 패턴 2 곳 중복을 internal helper
 *     `commitSubjectDeleteOnServer` 로 추출.
 */

import { useCallback, useEffect, useState } from "react";
import {
  syncSubjectCreateAsync,
  syncSubjectDelete,
  syncSubjectUpdate,
} from "../lib/apiSync";
import {
  addSubjectToLocal,
  deleteSubjectFromLocal,
  getAllSubjectsFromLocal,
  getClassPlannerData,
  replaceSubjectId,
  setClassPlannerData,
  updateSubjectInLocal,
} from "../lib/localStorageCrud";
import { logger } from "../lib/logger";
import {
  PENDING_DELETE_TTL_MS,
  addPendingDelete,
  getActivePendingDeletes,
  getExpiredPendingDeletes,
  isPendingDelete,
  removePendingDelete,
} from "../lib/pendingDeletes";
import { showToast, showUndoToast } from "../lib/toast";
import { commitEntityDeleteOnServer } from "./utils/commitEntityDeleteOnServer";
import { useMyRole } from "./useMyRole";
import { validateSubjectInput, validateSubjectName } from "../lib/validation/profileSchemas";
import { getKoMessage } from "../lib/errors/messages.ko";

const PERMISSION_DENIED_MESSAGE = "과목 추가/수정/삭제는 원장과 관리자만 가능합니다.";

// 과목 삭제 commit 은 hooks/utils/commitEntityDeleteOnServer generic helper 사용
// (ADR-002 Phase 2 Step 1 — 4 hook 의 internal helper 통합).

// ===== 타입 정의 =====

export interface Subject {
  id: string;
  name: string;
  color?: string;
}

export interface UseSubjectManagementLocalReturn {
  // 상태
  subjects: Subject[];
  errorMessage: string;

  // 액션
  addSubject: (name: string, color: string) => Promise<boolean>;
  updateSubject: (
    id: string,
    updates: { name?: string; color?: string }
  ) => Promise<boolean>;
  deleteSubject: (id: string) => Promise<boolean>;

  // 유틸리티
  clearError: () => void;

  // 통계
  subjectCount: number;
}

// ===== 훅 구현 =====

export const useSubjectManagementLocal =
  (): UseSubjectManagementLocalReturn => {
    // 🚀 localStorage 직접 조작 방식
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [error, setError] = useState<string | null>(null);

    // 권한 게이트 — member 역할은 mutating 호출 차단
    const { canManage, isLoading: roleLoading } = useMyRole();

    // localStorage에서 과목 데이터 로드. 빈 배열일 수 있음 — GroupSessionModal
    // 인라인 "+" 버튼(PR #257)으로 사용자가 직접 추가하면 됨.
    const loadSubjectsFromLocal = useCallback(() => {
      try {
        const localSubjects = getAllSubjectsFromLocal();
        setSubjects(
          localSubjects.map((s) => ({ ...s, color: s.color || "#3b82f6" }))
        );
        logger.debug("useSubjectManagementLocal - localStorage 로드", {
          count: localSubjects.length,
        });
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "과목 데이터 로드 실패";
        setError(errorMessage);
        logger.error(
          "useSubjectManagementLocal - 데이터 로드 실패:",
          undefined,
          err as Error
        );
        setSubjects([]);
      }
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
      loadSubjectsFromLocal();
    }, [loadSubjectsFromLocal]);

    // Pending delete recovery — 새로고침/탭 재진입 시 진행 중이던 5초 deferred-commit
    // 복원 (#297 학생 패턴 동일). expired entry는 즉시 server commit, active entry는
    // 남은 시간 동안 timer 재등록.
    useEffect(() => {
      if (typeof window === "undefined") return;
      const userId = localStorage.getItem("supabase_user_id");
      const now = Date.now();

      // server DELETE await — race window 0. commitSubjectDeleteOnServer helper (ADR-002 sweep #9).
      for (const p of getExpiredPendingDeletes(now)) {
        if (p.entityType !== "subject") continue;
        void commitEntityDeleteOnServer(userId, "subject", p.id, { entityLabel: "과목" });
        logger.info(
          "useSubjectManagementLocal - expired pending delete recovered",
          { id: p.id }
        );
      }

      const recoveredTimers: ReturnType<typeof setTimeout>[] = [];
      for (const p of getActivePendingDeletes(now)) {
        if (p.entityType !== "subject") continue;
        const remaining = Math.max(0, p.deadline - now);
        const timer = setTimeout(() => {
          if (!isPendingDelete("subject", p.id)) return;
          void commitEntityDeleteOnServer(userId, "subject", p.id, { entityLabel: "과목" });
          logger.info(
            "useSubjectManagementLocal - active pending delete recovered",
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
        loadSubjectsFromLocal();
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
    }, [loadSubjectsFromLocal]);

    // ===== 과목 추가 =====

    const addSubject = useCallback(
      async (name: string, color: string): Promise<boolean> => {
        if (!roleLoading && !canManage) {
          setError(PERMISSION_DENIED_MESSAGE);
          showToast("error", PERMISSION_DENIED_MESSAGE);
          return false;
        }
        // Client validation — required/min/max 모두 SSOT(profileSchemas) 호출로
        // 통일. invalid 시 sync retry 회피.
        const nameValidation = validateSubjectName(name ?? "");
        if (!nameValidation.ok) {
          const msg = getKoMessage(nameValidation.code);
          setError(msg);
          showToast("error", msg);
          return false;
        }
        try {
          setError(null);

          logger.debug("useSubjectManagementLocal - 과목 추가 시작", {
            name,
            color,
          });

          // localStorage에 즉시 추가
          const result = addSubjectToLocal(name, color);

          if (result.success && result.data) {
            // UI 즉시 업데이트
            loadSubjectsFromLocal();

            // 서버 동기화 — server가 받은 id를 INSERT/UPSERT에 사용. 응답 id가
            // localId와 다르면 localStorage 측 subject + enrollments[].subjectId
            // 를 reconcile.
            const userId = localStorage.getItem("supabase_user_id");
            const localId = result.data.id;
            const serverResp = await syncSubjectCreateAsync(userId, {
              id: localId,
              name,
              color,
            });
            if (serverResp && serverResp.id !== localId) {
              replaceSubjectId(localId, serverResp.id);
              loadSubjectsFromLocal();
              logger.info("useSubjectManagementLocal - subject id reconciled", {
                localId,
                serverId: serverResp.id,
                name,
              });
            }

            // Toast는 호출부(SubjectsPageLayout.handleAdd)가 0건/1건+ 분기에 맞춰 발화한다.
            // hook에서 또 띄우면 중복 토스트 발생 (UAT 2026-05-10 보고).

            logger.info("useSubjectManagementLocal - 과목 추가 성공", {
              name,
              color,
              subjectId: serverResp?.id ?? localId,
            });

            return true;
          } else {
            const msg = result.error || "과목 추가 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "과목 추가 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useSubjectManagementLocal - 과목 추가 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadSubjectsFromLocal, canManage, roleLoading]
    );

    // ===== 과목 수정 =====

    const updateSubject = useCallback(
      async (
        id: string,
        updates: { name?: string; color?: string }
      ): Promise<boolean> => {
        if (!roleLoading && !canManage) {
          setError(PERMISSION_DENIED_MESSAGE);
          showToast("error", PERMISSION_DENIED_MESSAGE);
          return false;
        }

        // 4-layer validation의 UI/sync layer — server sync 와 동일한 정책으로
        // 사전 검증해 invalid color hex 등이 localStorage 에 저장 + "수정됐습니다"
        // 토스트 후에 sync 단계에서 별도 error 토스트가 따라붙는 모순 차단.
        const v = validateSubjectInput(updates, { partial: true });
        if (!v.ok) {
          const msg = getKoMessage(v.code);
          setError(msg);
          showToast("error", msg);
          return false;
        }

        try {
          setError(null);

          logger.debug("useSubjectManagementLocal - 과목 수정 시작", {
            id,
            updates,
          });

          // localStorage에 즉시 수정 (검증 통과한 v.data 사용)
          const result = updateSubjectInLocal(id, v.data);

          if (result.success && result.data) {
            // UI 즉시 업데이트
            loadSubjectsFromLocal();

            // 서버 동기화 (fire-and-forget)
            const userId = localStorage.getItem("supabase_user_id");
            syncSubjectUpdate(userId, id, updates);

            showToast("success", "과목이 수정됐습니다");

            logger.info("useSubjectManagementLocal - 과목 수정 성공", {
              id,
              updates,
            });

            return true;
          } else {
            const msg = result.error || "과목 수정 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "과목 수정 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useSubjectManagementLocal - 과목 수정 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadSubjectsFromLocal, canManage, roleLoading]
    );

    // ===== 과목 삭제 (deferred + undo, PR γ 패턴) =====
    // Cascade: subject + 해당 enrollments + 그 enrollment 가진 sessions
    // Pattern: snapshot → 즉시 localStorage 삭제 → 5s 후 server commit → undo 시 복원

    const deleteSubject = useCallback(
      async (id: string): Promise<boolean> => {
        if (!roleLoading && !canManage) {
          setError(PERMISSION_DENIED_MESSAGE);
          showToast("error", PERMISSION_DENIED_MESSAGE);
          return false;
        }
        try {
          setError(null);

          logger.debug("useSubjectManagementLocal - 과목 삭제 시작", { id });

          // 1) Snapshot before delete (학생 패턴 동일)
          const dataBefore = getClassPlannerData();
          const subjectBefore = dataBefore.subjects.find((s) => s.id === id);
          if (!subjectBefore) {
            setError("과목을 찾을 수 없습니다.");
            return false;
          }
          const enrollmentsBefore = dataBefore.enrollments.filter(
            (e) => e.subjectId === id,
          );
          const targetEnrollmentIds = new Set(enrollmentsBefore.map((e) => e.id));
          const sessionsBefore = dataBefore.sessions
            .filter((s) =>
              s.enrollmentIds?.some((eid) => targetEnrollmentIds.has(eid)),
            )
            .map((s) => ({ ...s, enrollmentIds: [...(s.enrollmentIds ?? [])] }));

          // 2) Remove from localStorage immediately
          const result = deleteSubjectFromLocal(id);

          if (result.success) {
            loadSubjectsFromLocal();

            // 3) Defer server commit. pendingDeletes에 영속화하여 새로고침/탭 재진입
            // 시 init fetch가 같은 과목을 다시 끌어오지 않도록 + recovery hook이
            // timer를 다시 잡아 commit을 마침. (학생 #297과 동일 패턴)
            const userId = localStorage.getItem("supabase_user_id");
            const deadline = Date.now() + PENDING_DELETE_TTL_MS;
            addPendingDelete({ entityType: "subject", id, deadline });
            let cancelled = false;
            // server DELETE await — race window 0. commitSubjectDeleteOnServer helper (ADR-002 sweep #9).
            const commitTimer = setTimeout(async () => {
              if (cancelled) return;
              const ok = await commitEntityDeleteOnServer(userId, "subject", id, { entityLabel: "과목" });
              if (ok) logger.info("useSubjectManagementLocal - 과목 삭제 commit", { id });
            }, PENDING_DELETE_TTL_MS);

            // 4) Undo toast
            showUndoToast({
              message: `${subjectBefore.name} 과목 삭제됨`,
              onUndo: () => {
                cancelled = true;
                clearTimeout(commitTimer);
                removePendingDelete("subject", id);

                const dataNow = getClassPlannerData();
                if (!dataNow.subjects.find((s) => s.id === subjectBefore.id)) {
                  dataNow.subjects.push(subjectBefore);
                }
                for (const e of enrollmentsBefore) {
                  if (!dataNow.enrollments.find((ee) => ee.id === e.id)) {
                    dataNow.enrollments.push(e);
                  }
                }
                for (const sBefore of sessionsBefore) {
                  if (!dataNow.sessions.find((s) => s.id === sBefore.id)) {
                    dataNow.sessions.push(sBefore);
                  }
                }
                dataNow.lastModified = new Date().toISOString();
                setClassPlannerData(dataNow);
                loadSubjectsFromLocal();

                showToast("success", `${subjectBefore.name} 과목 복원됨`);
                logger.info("useSubjectManagementLocal - 과목 삭제 undo", { id });
              },
            });

            return true;
          } else {
            const msg = result.error || "과목 삭제 실패";
            setError(msg);
            showToast("error", msg);
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "과목 삭제 실패";
          setError(errorMessage);
          showToast("error", errorMessage);
          logger.error(
            "useSubjectManagementLocal - 과목 삭제 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadSubjectsFromLocal, canManage, roleLoading]
    );

    // ===== 에러 초기화 =====

    const clearError = useCallback(() => {
      setError(null);
    }, []);

    // ===== 통계 =====

    const subjectCount = subjects.length;

    // ===== 반환값 =====

    return {
      // 상태
      subjects,
      errorMessage: error || "",

      // 액션
      addSubject,
      updateSubject,
      deleteSubject,

      // 유틸리티
      clearError,

      // 통계
      subjectCount,
    };
  };
