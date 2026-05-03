/**
 * 🎣 Custom Hook - useSubjectManagementLocal (localStorage 직접 조작)
 *
 * localStorage의 classPlannerData를 직접 조작하여 즉시 UI에 반영하고,
 * debounce로 서버와 동기화하는 초고속 과목 데이터 관리 훅입니다.
 */

import { useCallback, useEffect, useState } from "react";
import {
  syncSubjectCreate,
  syncSubjectDelete,
  syncSubjectUpdate,
} from "../lib/apiSync";
import {
  addSubjectToLocal,
  deleteSubjectFromLocal,
  getAllSubjectsFromLocal,
  getClassPlannerData,
  getSubjectFromLocal,
  setClassPlannerData,
  updateSubjectInLocal,
} from "../lib/localStorageCrud";
import { logger } from "../lib/logger";
import { showToast, showUndoToast } from "../lib/toast";
import { useMyRole } from "./useMyRole";

const PERMISSION_DENIED_MESSAGE = "과목 추가/수정/삭제는 원장과 관리자만 가능합니다.";

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
  getSubject: (id: string) => Subject | null;

  // 유틸리티
  refreshSubjects: () => void;
  clearError: () => void;

  // 통계
  subjectCount: number;
}

// ===== 기본 과목 목록 =====

const DEFAULT_SUBJECTS: Subject[] = [
  { id: "default-1", name: "초등수학", color: "#fbbf24" }, // 밝은 노란색
  { id: "default-2", name: "중등수학", color: "#f59e0b" }, // 주황색
  { id: "default-3", name: "중등영어", color: "#3b82f6" }, // 파란색
  { id: "default-4", name: "중등국어", color: "#10b981" }, // 초록색
  { id: "default-5", name: "중등과학", color: "#ec4899" }, // 분홍색
  { id: "default-6", name: "중등사회", color: "#06b6d4" }, // 청록색
  { id: "default-7", name: "고등수학", color: "#ef4444" }, // 빨간색
  { id: "default-8", name: "고등영어", color: "#8b5cf6" }, // 보라색
  { id: "default-9", name: "고등국어", color: "#059669" }, // 진한 초록색
];

// ===== 훅 구현 =====

export const useSubjectManagementLocal =
  (): UseSubjectManagementLocalReturn => {
    // 🚀 localStorage 직접 조작 방식
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [error, setError] = useState<string | null>(null);

    // 권한 게이트 — member 역할은 mutating 호출 차단
    const { canManage, isLoading: roleLoading } = useMyRole();

    // localStorage에서 과목 데이터 로드
    const loadSubjectsFromLocal = useCallback(() => {
      try {
        const localSubjects = getAllSubjectsFromLocal();

        // 과목이 없으면 기본 과목 사용 (localStorage에 저장하지 않음)
        if (localSubjects.length === 0) {
          setSubjects(DEFAULT_SUBJECTS);
          logger.debug("useSubjectManagementLocal - 기본 과목 사용", {
            count: DEFAULT_SUBJECTS.length,
          });
        } else {
          setSubjects(
            localSubjects.map((s) => ({ ...s, color: s.color || "#3b82f6" }))
          );
          logger.debug(
            "useSubjectManagementLocal - localStorage에서 과목 데이터 로드",
            {
              count: localSubjects.length,
            }
          );
        }

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

        // 에러 시 기본 과목 사용
        setSubjects(DEFAULT_SUBJECTS);
      }
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
      loadSubjectsFromLocal();
    }, [loadSubjectsFromLocal]);

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

            // 서버 동기화 (fire-and-forget)
            const userId = localStorage.getItem("supabase_user_id");
            syncSubjectCreate(userId, { name, color });

            showToast("success", `${name.trim()} 과목이 추가됐습니다`);

            logger.info("useSubjectManagementLocal - 과목 추가 성공", {
              name,
              color,
              subjectId: result.data.id,
            });

            return true;
          } else {
            setError(result.error || "과목 추가 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "과목 추가 실패";
          setError(errorMessage);
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
        try {
          setError(null);

          logger.debug("useSubjectManagementLocal - 과목 수정 시작", {
            id,
            updates,
          });

          // localStorage에 즉시 수정
          const result = updateSubjectInLocal(id, updates);

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
            setError(result.error || "과목 수정 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "과목 수정 실패";
          setError(errorMessage);
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

            // 3) Defer server commit by 5s
            const userId = localStorage.getItem("supabase_user_id");
            let cancelled = false;
            const commitTimer = setTimeout(() => {
              if (cancelled) return;
              syncSubjectDelete(userId, id);
              logger.info("useSubjectManagementLocal - 과목 삭제 commit", { id });
            }, 5000);

            // 4) Undo toast
            showUndoToast({
              message: `${subjectBefore.name} 과목 삭제됨`,
              onUndo: () => {
                cancelled = true;
                clearTimeout(commitTimer);

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
            setError(result.error || "과목 삭제 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "과목 삭제 실패";
          setError(errorMessage);
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

    // ===== 과목 조회 =====

    const getSubject = useCallback((id: string): Subject | null => {
      const subject = getSubjectFromLocal(id);
      return subject ? { ...subject, color: subject.color || "#3b82f6" } : null;
    }, []);

    // ===== 과목 목록 새로고침 =====

    const refreshSubjects = useCallback(() => {
      loadSubjectsFromLocal();
    }, [loadSubjectsFromLocal]);

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
      getSubject,

      // 유틸리티
      refreshSubjects,
      clearError,

      // 통계
      subjectCount,
    };
  };
