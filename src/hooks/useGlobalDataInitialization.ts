/**
 * 전역 사용자 데이터 초기화 훅
 *
 * - 세션 없음(익명): 초기화 스킵 (localStorage 쓰기 없음)
 * - 세션 있음: 기존 로직 유지 (onboarding → 서버 fetch → localStorage:userId 저장)
 *   + anonymous 데이터와의 충돌 체크 (DataConflictModal 트리거)
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Teacher } from "../lib/planner";
import {
  ANONYMOUS_STORAGE_KEY,
  clearUserClassPlannerData,
  getActiveAcademyId,
  getClassPlannerData,
  setClassPlannerData,
} from "../lib/localStorageCrud";
import type { ClassPlannerData } from "../lib/localStorageCrud";
import { createSnapshot } from "../lib/snapshots/createSnapshot";
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
import { getPendingDeleteIds } from "../lib/pendingDeletes";
import { supabase } from "../utils/supabaseClient";

type ConflictState = Extract<MigrationResult, { action: "conflict" }>;

/**
 * Partial 손상 감지 — sessions=0이지만 다른 entity는 있는 비정상 상태.
 *
 * 발생 시나리오: multi-tab race / 부분 sync 실패 / 일부 storage write가
 * sessions만 reset. server에 sessions 있으면 local lastModified가 newer라도
 * server overwrite 강제 — 영구 sessions=0 stuck 방지 (EmptyWeekState false
 * positive 회피).
 *
 * Pure function — 단위 테스트 가능.
 */
export function detectPartialCorruption(
  localBag: ClassPlannerData,
  serverData: ClassPlannerData,
  localIsEmpty: boolean,
): boolean {
  // 사용자가 학생을 모두 삭제한 정상 흐름 (students=0 + sessions=0 + subject만 남음)을
  // corruption으로 잘못 판정하지 않도록, students 또는 enrollments가 local에 있을 때만
  // partial 손상으로 판정. (UAT 2026-05-09 강지원 부활 사고 — server가 in-flight 상태에서
  // session 1개 남아있을 때 corruption 분기로 강제 overwrite 발생.)
  //
  // partial 손상의 진짜 시그니처: 학생/수강신청은 그대로 있는데 sessions만 reset됨.
  // 학생을 모두 삭제하면 enrollments + sessions도 cascade라 모두 0이 정상.
  return (
    !localIsEmpty &&
    localBag.sessions.length === 0 &&
    serverData.sessions.length > 0 &&
    (localBag.students.length > 0 || localBag.enrollments.length > 0)
  );
}

/**
 * Custom event name dispatched when active academy changes (onboarding 완료,
 * 학원 추가 등). useGlobalDataInitialization이 이 이벤트를 감지하여 mig 흐름을
 * 재실행한다. Sidebar의 academy switcher는 `window.location.reload()`로 우회 중이라
 * 이벤트 dispatch 불필요. 본 이벤트는 SPA navigation 컨텍스트(onboarding → schedule)
 * 에서 hook이 mount 후 academy 생성을 감지할 수 없는 결함을 보호한다 (UAT 2026-05-08).
 */
export const ACADEMY_CHANGED_EVENT = "class-planner:academy-changed";

export const useGlobalDataInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingServerData, setPendingServerData] = useState<ClassPlannerData | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  // academy 변화 감지용 monotonic counter — bump 시 mig effect 재실행.
  // mount 시 한 번만 실행되는 deps:[] 패턴이 onboarding → schedule SPA navigation
  // 후 academy 생성을 인지 못 하는 결함 (UAT 2026-05-08) 회복.
  const [academyVersion, setAcademyVersion] = useState(0);

  const resolveConflict = useCallback(
    async (choice: "server" | "local") => {
      if (!pendingUserId || !pendingServerData) return;

      setMigrationError(null);

      try {
        // 충돌 직전 자동 백업 — 양쪽 데이터 모두 before_conflict로 보존.
        // 사용자가 잘못 선택해도 설정 페이지 데이터 이력에서 복원 가능
        // (before_conflict는 freemium 정책에 안 걸림 — 핵심 안전망).
        // academyId 미존재 시(신규 계정 등) skip.
        const academyId = getActiveAcademyId(pendingUserId);
        if (academyId) {
          const localData = getClassPlannerData();
          const backupResult = await createSnapshot(pendingUserId, academyId, {
            type: "before_conflict",
            payload: { local: localData, server: pendingServerData },
            description: `충돌 해결 직전 (선택: ${choice === "server" ? "내 계정" : "이 기기"})`,
          });
          if (!backupResult.success) {
            logger.warn("충돌 직전 자동 백업 실패 — 진행은 계속", {
              error: backupResult.error,
            });
          }
        }

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

  // ACADEMY_CHANGED_EVENT / cross-tab storage 이벤트 → academy 변화 감지 → mig
  // effect 재실행. mount 시 한 번만 등록.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setAcademyVersion((v) => v + 1);
    window.addEventListener(ACADEMY_CHANGED_EVENT, bump);
    const onStorage = (e: StorageEvent) => {
      // active_academy:{userId} 키 변경 시에만 bump (다른 tab에서 학원 전환 등)
      if (e.key && e.key.startsWith("active_academy:")) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ACADEMY_CHANGED_EVENT, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

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

        // Onboarding 가드 — academy 매핑 없으면 마이그레이션 시작 안 함.
        // /api/onboarding/status가 academy 발견 시 onboarded 쿠키도 set하므로
        // middleware 쿠키와 DB 진실 정합성 자동 회복. academy 부재 시 schedule
        // frame flash 방지 위해 setIsInitialized(true) 후 hard navigate.
        // status fetch 자체 실패 시(네트워크 에러 등) 기존 흐름 폴백 — anonymous
        // 데이터 보존은 applyLocalDataChoice의 totalSynced=0 분기가 2차 방어.
        // 이미 /onboarding에 있는 경우 redirect 발동 시 무한 루프 — pathname 체크 필수.
        try {
          const statusRes = await fetch(
            `/api/onboarding/status?userId=${encodeURIComponent(userId)}`
          );
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson?.success && statusJson?.hasAcademy === false) {
              const onOnboarding =
                typeof window !== "undefined" &&
                window.location.pathname === "/onboarding";
              logger.info("학원 매핑 없음 — 마이그레이션 skip", {
                redirect: !onOnboarding,
              });
              if (mounted) {
                setIsInitialized(true);
                setIsInitializing(false);
              }
              if (!onOnboarding) {
                window.location.replace("/onboarding");
              }
              return;
            }
          }
        } catch (statusError) {
          logger.warn("onboarding 상태 확인 실패 — 기존 흐름 폴백", {
            error:
              statusError instanceof Error
                ? statusError.message
                : String(statusError),
          });
        }

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

        // parseJson 결과를 별도 변수에 보관 — null=fetch 실패, []=정상 빈 응답.
        // allFetchesOk 판정에 fetch 성공 여부가 필요.
        const studentsResult = await parseJson(studentsRes);
        const subjectsResult = await parseJson(subjectsRes);
        const sessionsResult = await parseJson(sessionsRes);
        const enrollmentsResult = await parseJson(enrollmentsRes);
        const teachersResult = await parseJson(teachersRes);

        const allFetchesOk =
          studentsResult !== null &&
          subjectsResult !== null &&
          sessionsResult !== null &&
          enrollmentsResult !== null &&
          teachersResult !== null;

        let students = studentsResult ?? [];

        // pendingDeletes 필터 — 5초 deferred-commit 진행 중인 학생은 server에서
        // 다시 끌어오지 않는다. recovery hook이 commit timer를 재등록하므로
        // 동일한 흐름으로 commit이 마무리됨.
        const pendingStudentDeleteIds = getPendingDeleteIds("student");
        if (pendingStudentDeleteIds.size > 0) {
          const before = students.length;
          students = students.filter(
            (s: { id: string }) => !pendingStudentDeleteIds.has(s.id),
          );
          if (students.length !== before) {
            logger.info(
              "useGlobalDataInitialization - pendingDeletes filter 적용",
              { excluded: before - students.length },
            );
          }
        }
        let subjects = subjectsResult;
        // subjects도 students와 동일 패턴 — 5초 deferred-commit 진행 중인 과목은 fetch 결과에서 제외
        const pendingSubjectDeleteIds = getPendingDeleteIds("subject");
        if (subjects && pendingSubjectDeleteIds.size > 0) {
          const before = subjects.length;
          subjects = subjects.filter(
            (s: { id: string }) => !pendingSubjectDeleteIds.has(s.id),
          );
          if (subjects.length !== before) {
            logger.info(
              "useGlobalDataInitialization - subjects pendingDeletes filter 적용",
              { excluded: before - subjects.length },
            );
          }
        }
        const subjectsFetched = subjects !== null;
        let sessions = sessionsResult ?? [];
        // sessions pendingDeletes 필터 — 학생/과목/강사와 동일 패턴
        const pendingSessionDeleteIds = getPendingDeleteIds("session");
        if (pendingSessionDeleteIds.size > 0) {
          const before = sessions.length;
          sessions = sessions.filter(
            (s: { id: string }) => !pendingSessionDeleteIds.has(s.id),
          );
          if (sessions.length !== before) {
            logger.info(
              "useGlobalDataInitialization - sessions pendingDeletes filter 적용",
              { excluded: before - sessions.length },
            );
          }
        }
        const enrollments = enrollmentsResult ?? [];
        let teachers = teachersResult ?? [];
        // teachers pendingDeletes 필터
        const pendingTeacherDeleteIds = getPendingDeleteIds("teacher");
        if (pendingTeacherDeleteIds.size > 0) {
          const before = teachers.length;
          teachers = teachers.filter(
            (t: { id: string }) => !pendingTeacherDeleteIds.has(t.id),
          );
          if (teachers.length !== before) {
            logger.info(
              "useGlobalDataInitialization - teachers pendingDeletes filter 적용",
              { excluded: before - teachers.length },
            );
          }
        }

        // teachers GET 응답에 subjectIds 이미 포함 (PR #B-3 — server-side nested join).
        // N+1 fetch 제거: 강사 N명일 때 (N+5 RTT) → (5 RTT)로 단축.
        const teachersWithSubjects = teachers as Teacher[];

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
          // 자동 경로 — conflictState가 없어 DataConflictModal이 뜨지 않으므로
          // 실패를 모달 안에서 표시할 수 없다. throw가 외부 useEffect.catch에 잡혀
          // logger.error만 찍히고 사용자가 인지하지 못하면 다음 로그인에서 충돌
          // false positive cascade로 이어짐 (UAT 2026-05-08 사고).
          // 사용자가 즉시 알 수 있도록 toast로 표면화하고 anonymous 데이터를 보존한
          // 채 앱 진입을 허용한다 (다음 로그인 시 재시도).
          try {
            await applyLocalDataChoice(userId, serverData);
          } catch (error) {
            const msg =
              error instanceof Error
                ? error.message
                : "데이터 동기화 중 오류가 발생했습니다.";
            if (mounted) setMigrationError(msg);
            toast.error("자동 동기화 실패", {
              description: msg,
              duration: 8000,
            });
            logger.error(
              "upload-local 마이그레이션 실패 — 사용자 알림 표시",
              { msg },
              error as Error,
            );
          }
          if (mounted) setIsInitialized(true);
          return;
        }

        // use-server: 정상 경로 — 과목 자동 시드 없음.
        // 빈 학원도 그대로 진입 → 사용자가 GroupSessionModal 인라인 "+" 버튼
        // (PR #257)으로 첫 과목 직접 추가. 익명/로그인 동작 일관 + 충돌 모달
        // false positive 영구 소거.
        // Phase 1 (Local-first hybrid): timestamp 비교로 unsynced local writes 보호.
        {
          const localBag = getClassPlannerData();
          const localIsEmpty =
            localBag.students.length === 0 &&
            localBag.subjects.length === 0 &&
            localBag.sessions.length === 0 &&
            localBag.enrollments.length === 0 &&
            localBag.teachers.length === 0;

          const localIsPartiallyCorrupted = detectPartialCorruption(
            localBag,
            serverData,
            localIsEmpty,
          );

          const serverLastModified = computeServerLastModified(serverData);
          const decision = decideOverwrite({
            localLastModified: localBag.lastModified,
            serverLastModified,
            localIsEmpty,
          });

          logger.info("로컬-서버 동기화 결정", {
            decision: decision.decision,
            reason: decision.reason,
            localIsPartiallyCorrupted,
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

          // Per-entity intentional empty 감지 — entity별로 server=0 + local>0 케이스 처리.
          // decideOverwrite의 lastModified 통합 비교는 "학생만 모두 삭제 + subject/session
          // 남은" 케이스를 cover 못 한다 (lastModified가 다른 entity 기준이라 local-newer로
          // 판정되어 학생이 부활). UAT 2026-05-09 이동현 부활 사고 root cause.
          //
          // 전제: allFetchesOk (모든 fetch 200 OK). fetch 실패면 unreachable 가능성이라
          // 기존 흐름(skip)으로 보수적 보호 유지.
          //
          // pendingDeletes는 위에서 이미 server entity에서 filter 됐다. 즉 server[entity]=0
          // 이 "사용자가 그 entity의 모든 row 삭제했다"는 의미.
          const entitiesToClear: Array<keyof ClassPlannerData> = [];
          if (allFetchesOk) {
            if (serverData.students.length === 0 && localBag.students.length > 0) {
              entitiesToClear.push("students");
            }
            if (serverData.subjects.length === 0 && localBag.subjects.length > 0) {
              entitiesToClear.push("subjects");
            }
            if (serverData.sessions.length === 0 && localBag.sessions.length > 0) {
              entitiesToClear.push("sessions");
            }
            if (serverData.enrollments.length === 0 && localBag.enrollments.length > 0) {
              entitiesToClear.push("enrollments");
            }
            if (serverData.teachers.length === 0 && localBag.teachers.length > 0) {
              entitiesToClear.push("teachers");
            }
          }

          if (localIsPartiallyCorrupted) {
            logger.warn(
              "로컬 데이터 partial 손상 감지 — server overwrite 강제",
              {
                localSessions: localBag.sessions.length,
                serverSessions: serverData.sessions.length,
                localStudents: localBag.students.length,
                localSubjects: localBag.subjects.length,
                localEnrollments: localBag.enrollments.length,
              },
            );
            setClassPlannerData(serverData);
          } else if (entitiesToClear.length > 0) {
            logger.info(
              "useGlobalDataInitialization - per-entity intentional empty 감지, " +
                "해당 entity만 local에서 비움",
              {
                entitiesToClear,
                localCounts: {
                  students: localBag.students.length,
                  subjects: localBag.subjects.length,
                  sessions: localBag.sessions.length,
                  enrollments: localBag.enrollments.length,
                  teachers: localBag.teachers.length,
                },
              },
            );
            // 다른 entity는 lastModified 비교 결과에 따름. server에서 비운 entity만 local에서도 비움.
            const merged: ClassPlannerData = {
              ...localBag,
              ...(decision.decision === "overwrite" ? serverData : {}),
              students: entitiesToClear.includes("students")
                ? []
                : decision.decision === "overwrite"
                  ? serverData.students
                  : localBag.students,
              subjects: entitiesToClear.includes("subjects")
                ? []
                : decision.decision === "overwrite"
                  ? serverData.subjects
                  : localBag.subjects,
              sessions: entitiesToClear.includes("sessions")
                ? []
                : decision.decision === "overwrite"
                  ? serverData.sessions
                  : localBag.sessions,
              enrollments: entitiesToClear.includes("enrollments")
                ? []
                : decision.decision === "overwrite"
                  ? serverData.enrollments
                  : localBag.enrollments,
              teachers: entitiesToClear.includes("teachers")
                ? []
                : decision.decision === "overwrite"
                  ? serverData.teachers
                  : localBag.teachers,
              lastModified: new Date().toISOString(),
            };
            setClassPlannerData(merged);
          } else if (decision.decision === "overwrite") {
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
  }, [academyVersion]);

  return { isInitialized, isInitializing, conflictState, resolveConflict, isMigrating, migrationError };
};
