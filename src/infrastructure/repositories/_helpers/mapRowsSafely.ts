import { logger } from "../../../lib/logger";

/**
 * DB rows를 domain entity로 매핑할 때 invariant 위반 row를 skip한다.
 * 단일 invalid row가 전체 결과를 빈 배열로 swallow하는 함정 방지.
 *
 * 2026-05-12 사고: SupabaseStudentRepository.getAll()이 length<2 학생 1명 때문에
 * academy 전체 학생을 빈 배열로 반환. 사용자는 학생 목록이 비어 보였음.
 */
export function mapRowsSafely<TRow, TEntity>(
  rows: TRow[],
  mapper: (row: TRow) => TEntity,
  context: { entity: string; idField?: keyof TRow }
): TEntity[] {
  const result: TEntity[] = [];
  for (const row of rows) {
    try {
      result.push(mapper(row));
    } catch (err) {
      const id = context.idField ? row[context.idField] : undefined;
      logger.warn(`${context.entity} row invariant 위반 — skip`, {
        entity: context.entity,
        id: id as unknown,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return result;
}
