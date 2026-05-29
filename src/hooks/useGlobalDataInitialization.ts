/**
 * useGlobalDataInitialization: 로그인 사용자의 5 entity (학생/과목/세션/등록/강사)
 * server fetch + localStorage hydration + anonymous → server conflict 해결 만 담당.
 *
 * - 익명: localStorage 그대로, 초기화 skip.
 * - 로그인: onboarding 가드 → 5 API 병렬 fetch → pendingDeletes filter → conflict 체크.
 *
 * 의존성:
 *   - supabaseClient (auth session)
 *   - onboarding API + middleware 쿠키 (academy 매핑 검증)
 *   - localStorageCrud (get/set/clear)
 *   - pendingDeletes (deferred-commit 진행 중인 entity 제외)
 *   - sync/timestamps (computeServerLastModified, decideOverwrite)
 *   - auth/handleLoginDataMigration (conflict 분기 + applyServerChoice/applyLocalDataChoice)
 *   - snapshots (충돌 직전 자동 백업 before_conflict)
 *
 * 결정 history:
 *   - PR #319/#297/#299: pendingDeletes 패턴 (student/subject/teacher) — race window 0
 *   - UAT 2026-05-09 강지원/박태환 부활 사고: detectPartialCorruption 제거 (false-positive
 *     로 정상 삭제 의도 학생 부활), per-entity intentional empty 분기 도입
 *   - UAT 2026-05-08: onboarding redirect — academy 부재 시 hard navigate /onboarding
 *   - 2026-05-23: pathname guard (/invite/* 는 academy 없음이 정상 — redirect skip)
 *   - PR #B-3: teachers GET 의 nested subjectIds — N+1 fetch 제거
 *   - PR #257: 빈 학원 그대로 진입 (충돌 모달 false positive 영구 소거)
 *   - ADR-002 (2026-05-28): Cohesion Sweep — pendingDeletes filter 4 entity 동일 패턴
 *     + findMostRecent debug helper 추출 (DRY). main useEffect 450L 단일 흐름은 한 도메인
 *     (initialization workflow) 으로 유지.
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
import {
  getPendingDeleteIds,
  type PendingDeleteEntityType,
} from "../lib/pendingDeletes";
import { supabase } from "../utils/supabaseClient";

/**
 * server fetch 결과에서 pendingDeletes (deferred-commit 진행 중) 의 entity 제외.
 *
 * 5초 deferred-commit 진행 중인 entity 를 server fetch 결과로 재흡수하면 사용자가
 * 본 "삭제됨" 상태가 부활하는 race 가 발생. recovery hook 이 commit timer 를 재등록
 * 해서 동일한 흐름으로 commit 이 마무리되므로, fetch 시점에는 단순 filter 만 하면 됨.
 *
 * 4 entity (student/subject/session/teacher) 동일 패턴 — ADR-002 sweep #6 helper 추출.
 */
function filterByPendingDeletes<T extends { id: string }>(
  items: T[],
  entityType: PendingDeleteEntityType,
  logLabel: string,
): T[] {
  const pendingIds = getPendingDeleteIds(entityType);
  if (pendingIds.size === 0) return items;
  const filtered = items.filter((item) => !pendingIds.has(item.id));
  if (filtered.length !== items.length) {
    logger.info(
      `useGlobalDataInitialization - ${logLabel} pendingDeletes filter 적용`,
      { excluded: items.length - filtered.length },
    );
  }
  return filtered;
}

/**
 * 배열에서 updatedAt 이 가장 최근인 entity 의 요약 (debug 로그용).
 *
 * "서버 데이터 max(updatedAt) 분포" 로그에서 어느 entity 카테고리/id 가 server
 * timestamp 의 출처인지 추적 — "왜 server 가 사용자 기대보다 최신인가?" 운영
 * 디버깅 진입점. omni-radar console_log 이벤트로 자동 캡처.
 *
 * Pure function — unit test 가능 (ADR-002 sweep #6).
 */
export function findMostRecentEntity<
  T extends { id?: string; name?: string; updatedAt?: string | null },
>(
  arr: T[],
  label: string,
): {
  label: string;
  count: number;
  mostRecentId: string | null;
  mostRecentName: string | null;
  mostRecentUpdatedAt: string | null;
} {
  let maxEntity: T | null = null;
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
}

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
// detectPartialCorruption 함수 제거됨 (UAT 2026-05-09 박태환 부활).
// 원래 의도(PR #063b274 — sessions=0 stuck 방지) 자체는 유효하지만, 정상 사용자
// 흐름과 구분 못 하는 광범위한 휴리스틱이 false-positive로 학생 부활 사고 반복 일으킴.
// 정상 흐름 보호가 매우 드문 multi-tab race 보호보다 우선.

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
          const { failed } = await applyLocalDataChoice(pendingUserId, pendingServerData);
          if (failed.length > 0) {
            toast.warning("일부 데이터 동기화 안 됨", {
              description: `${failed.length}개 항목이 동기화되지 않았습니다 (강사 미배정 수업 등). 강사 지정 후 다시 추가해주세요.`,
              duration: 8000,
            });
          }
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
        // 오류 시 모달을 닫지 않음 — 사용자가 재시도 가능. 단 init gate(isInitialized)는
        // 해제해 앱 진입을 막지 않는다 (총 실패 시도 무한 spinner 회피).
        setIsInitialized(true);
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
        //
        // pathname guard (PR 11) — onboarding redirect 발동 안 하는 경로:
        //   /onboarding — 자기 자신 (무한 루프 회피)
        //   /invite/* — invite 수락 흐름은 academy 없음이 정상. OAuth callback 후
        //     invite 페이지에서 이 redirect 가 발동되면 사용자가 학원 정보 설정으로
        //     강제 이동되어 invite accept 못 함 (사용자 2026-05-23 발견 버그).
        try {
          const statusRes = await fetch(
            `/api/onboarding/status?userId=${encodeURIComponent(userId)}`
          );
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson?.success && statusJson?.hasAcademy === false) {
              const pathname =
                typeof window !== "undefined" ? window.location.pathname : "";
              const onProtectedPath =
                pathname === "/onboarding" || pathname.startsWith("/invite/");
              logger.info("학원 매핑 없음 — 마이그레이션 skip", {
                redirect: !onProtectedPath,
                pathname,
              });
              if (mounted) {
                setIsInitialized(true);
                setIsInitializing(false);
              }
              if (!onProtectedPath) {
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

        // pendingDeletes filter (5초 deferred-commit 진행 중인 entity 는 server fetch
        // 결과에서 제외 — recovery hook 이 commit timer 재등록). ADR-002 sweep #6 helper.
        const students = filterByPendingDeletes(
          studentsResult ?? [],
          "student",
          "students",
        );
        const subjects = subjectsResult
          ? filterByPendingDeletes(subjectsResult, "subject", "subjects")
          : null;
        const subjectsFetched = subjects !== null;
        const sessions = filterByPendingDeletes(
          sessionsResult ?? [],
          "session",
          "sessions",
        );
        const enrollments = enrollmentsResult ?? [];
        const teachers = filterByPendingDeletes(
          teachersResult ?? [],
          "teacher",
          "teachers",
        );

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

        // 운영 디버깅 — 어느 entity 카테고리/id 가 server timestamp 출처인지 추적.
        // findMostRecentEntity helper 사용 (ADR-002 sweep #6).
        logger.info("서버 데이터 max(updatedAt) 분포", {
          serverEntityLastModified,
          students: findMostRecentEntity(students, "students"),
          subjects: findMostRecentEntity(subjects ?? [], "subjects"),
          sessions: findMostRecentEntity(sessions, "sessions"),
          enrollments: findMostRecentEntity(enrollments, "enrollments"),
          teachers: findMostRecentEntity(teachersWithSubjects, "teachers"),
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
          // 실패를 toast로 표면화한다 (UAT 2026-05-08).
          // 부분 실패(정책상 영원히 실패하는 레코드 등)는 applyLocalDataChoice가
          // 성공분만 서버 기준 반영 + anonymous 정리(totalSynced>0)로 재flood loop를 끊는다
          // (2026-05-29 migration-partial-failure-resilience). 진짜 infra 실패만 throw.
          try {
            const { failed } = await applyLocalDataChoice(userId, serverData);
            if (failed.length > 0) {
              toast.warning("일부 데이터 동기화 안 됨", {
                description: `${failed.length}개 항목이 동기화되지 않았습니다 (강사 미배정 수업 등). 강사 지정 후 다시 추가해주세요.`,
                duration: 8000,
              });
            }
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

          // detectPartialCorruption 분기 제거 (UAT 2026-05-09 박태환 부활).
          // 원래 의도(PR #063b274)는 multi-tab race로 sessions만 reset된 케이스 복원.
          // 그러나 사용자 정상 흐름(학생 일부/모두 삭제)도 false-positive로 매칭하여
          // 강제 overwrite → 학생 부활 사고 반복. partial 손상은 매우 드문 multi-tab
          // race로 한정되고, 정상 사용자 의도를 false-positive로 깨뜨리는 비용이 더 큼.
          //
          // partial 손상 발생 시 사용자는 settings의 "데이터 수동 동기화" 또는 다른
          // 기기에서 같은 계정 로그인으로 server 따라갈 수 있다.

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

          if (entitiesToClear.length > 0) {
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
