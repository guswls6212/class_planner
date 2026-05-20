/**
 * 3-role 권한 데이터 SSOT — 사용자 친화 용어.
 *
 * 정책: ADR-019 (Academy Singularity + first-user owner-강제).
 *
 * 디자인 용어 정책: 화면에 노출되는 텍스트는 일반 사용자가 이해할 수 있는
 * 단어만 사용 — 개발자 약어 (CUD, RLS member_own, slug 등) 금지. 코드 식별자
 * (academyId 등) 는 본 파일 안에서만 사용하고 외부에는 한국어 라벨로 노출.
 */

export type RoleKey = "owner" | "admin" | "member";

export interface RoleDescriptor {
  key: RoleKey;
  /** UI 라벨 (예: "원장") */
  label: string;
  /** 사용자가 한눈에 이해할 짧은 설명 (예: "학원 전체 관리") */
  shortDescription: string;
  /** 권한 목록 — ok: true 는 가능, false 는 불가능 (취소선 표시용) */
  permissions: { ok: boolean; text: string }[];
  /** 어떻게 이 역할을 부여받는지 — onboarding 안내용 */
  joinPath: string;
}

export const ROLE_DESCRIPTORS: Record<RoleKey, RoleDescriptor> = {
  owner: {
    key: "owner",
    label: "원장",
    shortDescription: "학원 전체 관리",
    permissions: [
      { ok: true, text: "학원 이름 · 학원 주소 변경" },
      { ok: true, text: "관리자 · 강사 초대" },
      { ok: true, text: "팀 멤버 역할 변경 · 내보내기" },
      { ok: true, text: "학생 · 강사 · 과목 · 수업 전체 관리" },
      { ok: true, text: "학부모 공유 링크 · 접속 코드 발급" },
    ],
    joinPath: "직접 학원을 만든 사람만 (계정당 1개)",
  },
  admin: {
    key: "admin",
    label: "관리자",
    shortDescription: "수업 운영 + 강사 초대",
    permissions: [
      { ok: true, text: "학생 · 강사 · 과목 · 수업 추가 · 편집 · 삭제" },
      { ok: true, text: "강사 초대 (관리자 권한 부여는 원장만)" },
      { ok: true, text: "학부모 공유 링크 · 접속 코드 발급" },
      { ok: false, text: "학원 이름 · 학원 주소 변경 (원장 전용)" },
      { ok: false, text: "원장 · 관리자 역할 변경 불가" },
    ],
    joinPath: "원장의 초대로만",
  },
  member: {
    key: "member",
    label: "강사",
    shortDescription: "본인 시간표 조회",
    permissions: [
      { ok: true, text: "본인 시간표 조회" },
      { ok: true, text: "본인 연락처 · 메모 편집" },
      { ok: false, text: "다른 강사 정보 편집 불가" },
      { ok: false, text: "학생 · 과목 · 수업 관리 불가" },
      { ok: false, text: "초대 발송 불가" },
    ],
    joinPath: "원장 또는 관리자의 초대로만",
  },
};

export const ROLE_KEYS_ORDERED: RoleKey[] = ["owner", "admin", "member"];

/**
 * 초대 가능한 role 목록 (현재 사용자 role 기준).
 * - owner: admin, member 모두 가능
 * - admin: member 만 가능 (다른 관리자 초대는 원장만)
 * - member: 초대 불가
 */
export function getInvitableRoles(currentRole: RoleKey | null): RoleKey[] {
  if (currentRole === "owner") return ["admin", "member"];
  if (currentRole === "admin") return ["member"];
  return [];
}
