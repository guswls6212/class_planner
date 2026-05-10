/**
 * 학생/강사 동명이인 식별용 부제 생성 helper (ADR-015).
 *
 * 같은 이름이 2명 이상이면 식별 정보를 부제로 노출:
 * - 학생: "성별 · 생년월일" (없으면 "학년 · 학교" fallback)
 * - 강사: "이메일 · 전화" (없으면 "")
 *
 * SSOT: layout 페이지(`StudentsPageLayout`/`TeachersPageLayout`) + schedule 모달
 * picker 모두 본 helper를 통해 동일 표기. 사양 drift 방지.
 */

export interface NameLike {
  name: string;
}

export function buildDuplicateNameSet<T extends NameLike>(items: T[]): Set<string> {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.name, (counts.get(it.name) ?? 0) + 1);
  return new Set(
    Array.from(counts.entries())
      .filter(([, n]) => n > 1)
      .map(([name]) => name),
  );
}

export interface StudentLike extends NameLike {
  gender?: string | null;
  birthDate?: string | null;
  grade?: string | null;
  school?: string | null;
}

export function formatStudentDuplicateLabel(s: StudentLike, dupSet: Set<string>): string {
  const isDup = dupSet.has(s.name);
  if (isDup) {
    const identity: string[] = [];
    if (s.gender === "male") identity.push("남");
    else if (s.gender === "female") identity.push("여");
    if (s.birthDate) identity.push(s.birthDate);
    if (identity.length > 0) return identity.join(" · ");
  }
  const meta = [s.grade, s.school].filter(Boolean).join(" · ");
  if (meta) return meta;
  return isDup ? "프로필 미입력 · 동명이인" : "프로필 미입력";
}

export interface TeacherLike extends NameLike {
  email?: string | null;
  phone?: string | null;
}

/**
 * 강사 부제 — 동명이인이면 이메일/전화 노출. 그 외는 호출부의 fallback(예: "주간 N회") 사용.
 * 호출부가 fallback을 합치기 쉽게 동명이인일 때만 string 반환, 아니면 빈 문자열.
 */
export function formatTeacherDuplicateLabel(t: TeacherLike, dupSet: Set<string>): string {
  if (!dupSet.has(t.name)) return "";
  const identity: string[] = [];
  if (t.email) identity.push(t.email);
  if (t.phone) identity.push(t.phone);
  return identity.join(" · ");
}
