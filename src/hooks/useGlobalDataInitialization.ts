/**
 * 전역 사용자 데이터 초기화 훅
 *
 * - 세션 없음(익명): 초기화 스킵 (localStorage 쓰기 없음)
 * - 세션 있음: 기존 로직 유지 (onboarding → 서버 fetch → localStorage:userId 저장)
 *   + anonymous 데이터와의 충돌 체크 (DataConflictModal 트리거)
 */

import { useCallback, useEffect, useState } from "react";
import { syncSubjectCreate } from "../lib/apiSync";
import type { Teacher } from "../lib/planner";
import {
  ANONYMOUS_STORAGE_KEY,
  clearUserClassPlannerData,
  getClassPlannerData,
  setClassPlannerData,
} from "../lib/localStorageCrud";
import type { ClassPlannerData } from "../lib/localStorageCrud";
import {
  computeServerLastModified,
  decideOverwrite,
} from "../lib/sync/timestamps";
import {
  checkLoginDataConflict,
  applyServerChoice,
  applyLocalDataChoice,
} from "../lib/auth/handleLoginDataMigration";
import type { MigrationResult } from "../lib/auth/handleLoginDataMigration";
import { logger } from "../lib/logger";
import { supabase } from "../utils/supabaseClient";

const DEFAULT_SUBJECTS = [
  { name: "초등수학", color: "#fbbf24" },
  { name: "중등수학", color: "#f59e0b" },
  { name: "중등영어", color: "#3b82f6" },
  { name: "중등국어", color: "#10b981" },
  { name: "중등과학", color: "#ec4899" },
  { name: "중등사회", color: "#06b6d4" },
  { name: "고등수학", color: "#ef4444" },
  { name: "고등영어", color: "#8b5cf6" },
  { name: "고등국어", color: "#059669" },
];

type ConflictState = Extract<MigrationResult, { action: "conflict" }>;

export const useGlobalDataInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingServerData, setPendingServerData] = useState<ClassPlannerData | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const resolveConflict = useCallback(
    async (choice: "server" | "local") => {
      if (!pendingUserId || !pendingServerData) return;

      setMigrationError(null);

      try {
        if (choice === "server") {
          applyServerChoice();
          setClassPlannerData(pendingServerData);
        } else {
          setIsMigrating(true);
          await applyLocalDataChoice(pendingUserId, pendingServerData);
        }
        setConflictState(null);
        setPendingUserId(null);
        setPendingServerData(null);
        setIsInitialized(true);
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "데이터 동기화 중 오류가 발생했습니다.";
        setMigrationError(msg);
        // 오류 시 모달을 닫지 않음 — 사용자가 재시도 가능
      } finally {
        setIsMigrating(false);
      }
    },
    [pendingUserId, pendingServerData]
  );

  useEffect(() => {
    let mounted = true;

    const initializeUserData = async () => {
      try {
        logger.debug("사용자 인증 상태를 확인합니다");

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.error("세션 확인 중 오류 발생", undefined, error as Error);
          return;
        }

        // ===== 익명 사용자 경로 =====
        if (!session?.user) {
          logger.debug("익명 사용자 경로 — localStorage 자동 초기화 건너뜀");
          if (mounted) setIsInitialized(true);
          return;
        }

        // ===== 로그인 사용자 경로 =====
        const userId = session.user.id;
        logger.info("인증된 사용자 확인", { email: session.user.email });

        // 다른 사용자의 데이터가 로컬에 있으면 삭제
        const storedUserId = localStorage.getItem("supabase_user_id");
        if (storedUserId && storedUserId !== userId) {
          logger.warn("다른 사용자 데이터 감지 - 기존 데이터 삭제");
          clearUserClassPlannerData(storedUserId);
        }

        // userId 먼저 설정 (getStorageKey()가 올바른 키를 반환하도록)
        localStorage.setItem("supabase_user_id", userId);

        if (mounted) setIsInitializing(true);

        // 5개 API 병렬 fetch
        logger.info("서버에서 데이터를 병렬 조회합니다");
        const [studentsRes, subjectsRes, sessionsRes, enrollmentsRes, teachersRes] =
          await Promise.allSettled([
            fetch(`/api/students?userId=${userId}`),
            fetch(`/api/subjects?userId=${userId}`),
            fetch(`/api/sessions?userId=${userId}`),
            fetch(`/api/enrollments?userId=${userId}`),
            fetch(`/api/teachers?userId=${userId}`),
          ]);

        /** fetch 에러와 "데이터 없음"을 구분: null=에러, []=정상 빈 배열 */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parseJson = async (result: PromiseSettledResult<Response>): Promise<any[] | null> => {
          if (result.status === "rejected") return null;
          try {
            if (!result.value.ok) return null;
            const json = await result.value.json();
            return json.success ? (json.data ?? []) : null;
          } catch {
            return null;
          }
        };

        const students = (await parseJson(studentsRes)) ?? [];
        const subjects = await parseJson(subjectsRes);
        const subjectsFetched = subjects !== null;
        const sessions = (await parseJson(sessionsRes)) ?? [];
        const enrollments = (await parseJson(enrollmentsRes)) ?? [];
        const teachers = (await parseJson(teachersRes)) ?? [];

        // teacher별 subjectIds를 병렬로 fetch
        const teachersWithSubjects = await Promise.all(
          teachers.map(async (teacher: Teacher) => {
            try {
              const res = await fetch(
                `/api/teacher-subjects?userId=${encodeURIComponent(userId)}&teacherId=${encodeURIComponent(teacher.id)}`
              );
              if (!res.ok) return teacher;
              const json = await res.json();
              const subjectIds: string[] = json?.data ?? [];
              return { ...teacher, subjectIds };
            } catch {
              return teacher; // subjectIds 없이 graceful fallback
            }
          })
        );

        // serverData.lastModified는 모달 표시(timestamp) + 다음 진입 시 동기화
        // 결정 둘 다에 쓰임. fetch 시각이 아니라 entity 중 가장 최근 updatedAt을
        // 사용해야 정확함 (이전 버그: fetch 끝난 "지금" 시각이 박혀 server가
        // 항상 local보다 최신으로 보였음).
        const serverEntityLastModified = computeServerLastModified({
          students,
          subjects: subjects ?? [],
          sessions,
          enrollments,
          teachers: teachersWithSubjects,
        });

        // 운영 디버깅 — 어느 entity 카테고리/id가 server timestamp의 출처인지
        // 추적. "왜 server max(updatedAt)이 사용자 기대보다 최신인가?" 같은
        // 의문이 들었을 때 로그에서 즉시 원인 파악 가능 (omni-radar console_log
        // 이벤트로 자동 캡처됨).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const findMostRecent = (arr: any[], label: string) => {
          let maxEntity: { id?: string; name?: string; updatedAt?: string } | null = null;
          let maxMs = -Infinity;
          for (const e of arr) {
            const ts = e?.updatedAt ? new Date(e.updatedAt).getTime() : 0;
            if (Number.isFinite(ts) && ts > maxMs) {
              maxEntity = e;
              maxMs = ts;
            }
          }
          return {
            label,
            count: arr.length,
            mostRecentId: maxEntity?.id ?? null,
            mostRecentName: maxEntity?.name ?? null,
            mostRecentUpdatedAt: maxEntity?.updatedAt ?? null,
          };
        };
        logger.info("서버 데이터 max(updatedAt) 분포", {
          serverEntityLastModified,
          students: findMostRecent(students, "students"),
          subjects: findMostRecent(subjects ?? [], "subjects"),
          sessions: findMostRecent(sessions, "sessions"),
          enrollments: findMostRecent(enrollments, "enrollments"),
          teachers: findMostRecent(teachersWithSubjects, "teachers"),
        });

        const serverData: ClassPlannerData = {
          students,
          subjects: subjects ?? [],
          sessions,
          enrollments,
          teachers: teachersWithSubjects,
          version: "1.0",
          // 모든 entity가 updatedAt 없으면 빈 문자열 → DataCard에서 timestamp 미표시
          lastModified: serverEntityLastModified ?? "",
        };

        logger.info("서버 데이터 조회 완료", {
          studentCount: students.length,
          subjectCount: serverData.subjects.length,
          sessionCount: sessions.length,
          enrollmentCount: enrollments.length,
          teacherCount: teachers.length,
        });

        // 충돌 체크
        const migrationResult = checkLoginDataConflict(serverData);

        if (migrationResult.action === "conflict") {
          if (mounted) {
            setPendingUserId(userId);
            setPendingServerData(serverData);
            setConflictState(migrationResult);
          }
          return;
        }

        if (migrationResult.action === "upload-local") {
          await applyLocalDataChoice(userId, serverData);
          if (mounted) setIsInitialized(true);
          return;
        }

        // use-server: 정상 경로
        // fetch 에러(null)와 "정말 과목이 없음"(빈 배열)을 구분하여 불필요한 재생성 방지
        if (subjectsFetched && serverData.subjects.length === 0) {
          // 신규 계정 / 학원 — DEFAULT_SUBJECTS bootstrap. 비교 없이 항상 seed.
          logger.info("과목이 없어서 기본 과목을 추가합니다", {
            count: DEFAULT_SUBJECTS.length,
          });
          for (const subject of DEFAULT_SUBJECTS) {
            syncSubjectCreate(userId, subject);
          }
          const defaultSubjectsWithId = DEFAULT_SUBJECTS.map((s, i) => ({
            id: `default-${i + 1}`,
            ...s,
          }));
          setClassPlannerData({
            ...serverData,
            subjects: defaultSubjectsWithId,
          });
        } else {
          // Phase 1 (Local-first hybrid): timestamp 비교로 unsynced local writes 보호.
          // 이전엔 무조건 overwrite → fire-and-forget sync 실패 시 데이터 손실.
          // 이제 local lastModified > server max(updatedAt) 면 skip.
          const localBag = getClassPlannerData();
          const localIsEmpty =
            localBag.students.length === 0 &&
            localBag.subjects.length === 0 &&
            localBag.sessions.length === 0 &&
            localBag.enrollments.length === 0 &&
            localBag.teachers.length === 0;

          const serverLastModified = computeServerLastModified(serverData);
          const decision = decideOverwrite({
            localLastModified: localBag.lastModified,
            serverLastModified,
            localIsEmpty,
          });

          logger.info("로컬-서버 동기화 결정", {
            decision: decision.decision,
            reason: decision.reason,
            localLastModified: localBag.lastModified ?? null,
            serverLastModified,
            localMs: decision.localMs,
            serverMs: decision.serverMs,
            serverEntityCounts: {
              students: serverData.students.length,
              subjects: serverData.subjects.length,
              sessions: serverData.sessions.length,
              enrollments: serverData.enrollments.length,
              teachers: serverData.teachers.length,
            },
            localEntityCounts: {
              students: localBag.students.length,
              subjects: localBag.subjects.length,
              sessions: localBag.sessions.length,
              enrollments: localBag.enrollments.length,
              teachers: localBag.teachers.length,
            },
          });

          if (decision.decision === "overwrite") {
            setClassPlannerData(serverData);
          }
          // skip 시 local 그대로. Eventual consistency via apiSync.ts fire-and-forget.
        }

        if (mounted) setIsInitialized(true);
        logger.info("사용자 데이터 초기화 완료");
      } catch (error) {
        logger.error(
          "사용자 데이터 초기화 중 오류 발생",
          undefined,
          error as Error
        );
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };

    initializeUserData();

    return () => {
      mounted = false;
    };
  }, []);

  return { isInitialized, isInitializing, conflictState, resolveConflict, isMigrating, migrationError };
};
