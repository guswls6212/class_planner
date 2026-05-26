/**
 * Schedule picker(강사 pill picker / filter chip bar)에서 표시할 강사를 결정한다.
 *
 * 정책 (ADR-015, 2026-05-26 teacher-display-identity Phase 1 강화):
 * "강사 칩"은 member 만 표시. admin/owner 는 멤버십 권한이라 schedule 도메인 외.
 *
 * Phase 1 변경: owner/admin 은 `selected` 여부 무관 **hard exclude**.
 * 이유: owner 가 강사 dropdown 에 노출되면 원장이 강사인 척 가장 가능 → 신뢰 문제.
 * 친구 선공개 직전 차단. 기존 selected 예외 (legacy session 편집) 는 제거.
 * legacy admin 배정 session 은 별도 마이그레이션 또는 사용자 수동 정리.
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
 * - admin/owner 는 selected 여부 무관 항상 제외 (Phase 1 hard exclude)
 * - `selected` 인자는 호환성 위해 type signature 유지 (실제 사용 X)
 */
export function filterTeachersForPicker<T extends TeacherWithRole>(
  teachers: T[],
  _selected?: string | string[] | null,
): T[] {
  return teachers.filter((t) => !isAdminRole(t.role));
}
