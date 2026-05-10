/**
 * Schedule picker(강사 pill picker / filter chip bar)에서 표시할 강사를 결정한다.
 *
 * 정책 (ADR-015): "강사 칩"은 강사(member)만 표시. admin/owner는 멤버십 권한이라
 * schedule 도메인에 속하지 않는다. 단, 기존에 admin이 배정된 session(legacy)을
 * 편집할 때는 selected 강사가 picker에서 누락되어 사용자 작업이 끊기지 않도록
 * `selectedId` 예외를 허용한다.
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
 * - admin/owner는 기본 제외
 * - selectedId가 admin/owner여도 보존 (legacy session 편집 안정성)
 * - selectedIds가 array면 그 중 admin/owner도 보존 (filter chip bar)
 */
export function filterTeachersForPicker<T extends TeacherWithRole>(
  teachers: T[],
  selected?: string | string[] | null,
): T[] {
  const selectedSet =
    selected == null
      ? new Set<string>()
      : typeof selected === "string"
        ? new Set([selected])
        : new Set(selected);
  return teachers.filter((t) => !isAdminRole(t.role) || selectedSet.has(t.id));
}
