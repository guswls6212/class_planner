/**
 * Cursor-based pagination helper — list endpoint 공통 패턴.
 *
 * 학원 시나리오에서 학생/강사/share_tokens 등 list가 200+로 커지는 경우 대비
 * server-side 페이징 prep. cursor는 (created_at, id) tie-break로 안정성 확보.
 *
 * 사용 흐름:
 *   - route handler: parsePaginationParams(searchParams) → opts
 *     opts.limit/cursor/q 중 하나라도 있으면 paginated mode
 *     없으면 기존 흐름(getAll) 그대로 — 회귀 없음
 *   - repository: applyCursor(query, cursor) + .limit(limit + 1) →
 *     hasMore 판정 + nextCursor 생성
 */

import { Buffer } from "node:buffer";

export const PAGINATION_DEFAULT_LIMIT = 50;
export const PAGINATION_MAX_LIMIT = 200;

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  q?: string;
}

export interface PaginationResult<T> {
  items: T[];
  nextCursor: string | null;
}

interface CursorPayload {
  createdAt: string;
  id: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8"),
    );
    if (
      decoded &&
      typeof decoded === "object" &&
      typeof decoded.createdAt === "string" &&
      typeof decoded.id === "string"
    ) {
      return { createdAt: decoded.createdAt, id: decoded.id };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * URLSearchParams에서 페이징 옵션 추출. 옵션 0개면 빈 객체 반환 (paginated mode 비활성).
 * limit 캡: PAGINATION_MAX_LIMIT (200).
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
): PaginationOptions {
  const opts: PaginationOptions = {};

  const limitRaw = parseInt(searchParams.get("limit") ?? "", 10);
  if (Number.isFinite(limitRaw) && limitRaw > 0) {
    opts.limit = Math.min(limitRaw, PAGINATION_MAX_LIMIT);
  }

  const cursor = searchParams.get("cursor");
  if (cursor) opts.cursor = cursor;

  const q = searchParams.get("q");
  if (q) opts.q = q;

  return opts;
}

/**
 * paginated mode 활성 여부. limit/cursor/q 중 하나라도 있으면 true.
 */
export function isPaginatedRequest(opts: PaginationOptions): boolean {
  return opts.limit !== undefined || opts.cursor !== undefined || opts.q !== undefined;
}

/**
 * Repository에서 cursor 결과로 다음 cursor 생성.
 * 받은 rows 중 limit+1 fetch했을 때 마지막 row가 있으면 그 정보로 cursor.
 */
export function buildNextCursor<T extends { id: string; createdAt: Date | string }>(
  items: T[],
  hasMore: boolean,
): string | null {
  if (!hasMore || items.length === 0) return null;
  const last = items[items.length - 1];
  const createdAt =
    last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt;
  return encodeCursor({ createdAt, id: last.id });
}
