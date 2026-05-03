/**
 * Local-first hybrid sync — timestamp comparison helpers.
 *
 * Used by useGlobalDataInitialization (and future Phase 2/3 polling/Realtime)
 * to decide whether a server fetch should overwrite the localStorage bag.
 *
 * Core rule (Local-first 보호):
 *   - 로컬이 서버보다 신선하면 → 덮어쓰지 않음 (unsynced local writes 보존)
 *   - 서버가 신선 OR 로컬이 비어 있음 → 덮어씀
 *   - 서버 timestamp 알 수 없음 (모든 fetch 실패 등) → 보수적 SKIP
 *
 * See: ARCHITECTURE.md § 1.2 Local-First Architecture
 *      docs/plan: Hybrid Local-First Phase 1
 */

export interface EntityWithUpdatedAt {
  updatedAt?: string | Date | null;
}

/**
 * Permissive type — entity arrays may contain any object (we only read
 * optional `updatedAt`). Allows passing the full ClassPlannerData bag
 * without conformance casts.
 */
export interface ServerDataForSync {
  students?: ReadonlyArray<{ updatedAt?: string | Date | null } & Record<string, unknown>>;
  subjects?: ReadonlyArray<{ updatedAt?: string | Date | null } & Record<string, unknown>>;
  sessions?: ReadonlyArray<{ updatedAt?: string | Date | null } & Record<string, unknown>>;
  enrollments?: ReadonlyArray<{ updatedAt?: string | Date | null } & Record<string, unknown>>;
  teachers?: ReadonlyArray<{ updatedAt?: string | Date | null } & Record<string, unknown>>;
}

export type OverwriteReason =
  | "local-empty"
  | "server-unreachable-or-no-timestamps"
  | "local-no-timestamp"
  | "local-newer"
  | "server-newer"
  | "tiebreak";

export interface OverwriteDecision {
  decision: "overwrite" | "skip";
  reason: OverwriteReason;
  localMs: number | null;
  serverMs: number | null;
}

const DEFAULT_TOLERANCE_MS = 1000;

function parseTimestamp(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * 모든 entity 배열에서 max(updatedAt)을 추출해 ISO string 반환.
 * parseable 한 timestamp가 하나도 없으면 null.
 *
 * - 누락 배열 (undefined) 무시
 * - 빈 배열 무시
 * - NaN/invalid updatedAt 개별 entry 무시
 * - Date 객체 + ISO string 둘 다 처리
 */
export function computeServerLastModified(
  data: ServerDataForSync,
): string | null {
  const arrays: Array<ReadonlyArray<EntityWithUpdatedAt> | undefined> = [
    data.students,
    data.subjects,
    data.sessions,
    data.enrollments,
    data.teachers,
  ];
  let maxMs = -Infinity;
  for (const arr of arrays) {
    if (!arr || arr.length === 0) continue;
    for (const entity of arr) {
      const ms = parseTimestamp(entity.updatedAt);
      if (ms !== null && ms > maxMs) maxMs = ms;
    }
  }
  return maxMs === -Infinity ? null : new Date(maxMs).toISOString();
}

/**
 * local 과 server timestamp 를 비교해 overwrite/skip 결정.
 *
 * Decision rules (순서대로 평가):
 *   1. localIsEmpty=true → overwrite, "local-empty"
 *      (첫 로그인 + academy switch 모두 처리. localStorage createDefaultData가
 *       fresh "now" lastModified 를 만들어도 빈 entity면 안전하게 덮어씀.)
 *   2. serverLastModified=null → skip, "server-unreachable-or-no-timestamps"
 *      (모든 fetch 실패 또는 모든 entity에 updatedAt 없는 레거시 데이터.
 *       로컬 데이터 보존 — silent server failure로 인한 데이터 손실 방지.)
 *   3. localLastModified parse 실패 → overwrite, "local-no-timestamp"
 *      (방어적. localStorageCrud는 항상 lastModified 채우지만 corrupt 시 대비.)
 *   4. localMs - serverMs > toleranceMs → skip, "local-newer"
 *      (★ 핵심 버그 fix — unsynced local writes 보호)
 *   5. otherwise → overwrite. server가 더 신선하면 "server-newer", 같으면
 *      tiebreak ("server-as-truth").
 *
 * tolerance 기본 1000ms — 클럭 skew 흡수.
 */
export function decideOverwrite(args: {
  localLastModified: string | null | undefined;
  serverLastModified: string | null;
  localIsEmpty: boolean;
  toleranceMs?: number;
}): OverwriteDecision {
  const tolerance = args.toleranceMs ?? DEFAULT_TOLERANCE_MS;
  const localMs = parseTimestamp(args.localLastModified ?? null);
  const serverMs = args.serverLastModified
    ? parseTimestamp(args.serverLastModified)
    : null;

  // Rule 1: localIsEmpty 우선 — fresh "now" lastModified 무시
  if (args.localIsEmpty) {
    return {
      decision: "overwrite",
      reason: "local-empty",
      localMs,
      serverMs,
    };
  }

  // Rule 2: server timestamp 알 수 없음 → 보수적 skip
  if (serverMs === null) {
    return {
      decision: "skip",
      reason: "server-unreachable-or-no-timestamps",
      localMs,
      serverMs,
    };
  }

  // Rule 3: local timestamp 손상 → 방어적 overwrite
  if (localMs === null) {
    return {
      decision: "overwrite",
      reason: "local-no-timestamp",
      localMs,
      serverMs,
    };
  }

  // Rule 4: local이 tolerance 넘게 신선 → skip (★ 핵심)
  if (localMs - serverMs > tolerance) {
    return {
      decision: "skip",
      reason: "local-newer",
      localMs,
      serverMs,
    };
  }

  // Rule 5: server-as-truth tiebreak
  return {
    decision: "overwrite",
    reason: serverMs > localMs ? "server-newer" : "tiebreak",
    localMs,
    serverMs,
  };
}
