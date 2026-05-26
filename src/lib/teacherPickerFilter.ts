/**
 * Schedule picker(강사 pill picker / filter chip bar)에서 표시할 강사를 결정한다.
 *
 * 정책 (ADR-015, 2026-05-26 teacher-display-identity Phase 1 의도 정정):
 *
 * **모든 teachers 노출** (owner/admin/member 무관). 원장도 직접 수업 가능하므로
 * dropdown / grid / chip / sidebar 모두에 노출. 진짜 원장 vs 가짜 "원장님" 이름의
 * 일반 강사 구분은 **badge (Crown + "원장")** 으로 시각 표현 (isAdminRole helper +
 * TeacherStatusPill / inline icon).
 *
 * 본 함수는 SSOT 자리 보존 — 향후 filter logic (예: archived 제외, role 별 정렬)
 * 추가 시 단일 진입점. 현재 signature 는 호환성 유지.
 */

export type TeacherRoleLike = "owner" | "admin" | "member" | string | null | undefined;

export interface TeacherWithRole {
  id: string;
  role?: TeacherRoleLike;
}

export function isAdminRole(role: TeacherRoleLike): boolean {
  return role === "admin" || role === "owner";
}

/**
 * Picker에 표시할 teachers를 추린다.
 * 현재: 모든 teachers 반환 (owner/admin 도 노출 — badge 으로 시각 구분).
 * `selected` 인자는 호환성 위해 signature 유지 (향후 filter 추가 시 활용).
 */
export function filterTeachersForPicker<T extends TeacherWithRole>(
  teachers: T[],
  _selected?: string | string[] | null,
): T[] {
  return teachers;
}
