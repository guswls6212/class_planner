/**
 * 3-role 권한 데이터 SSOT — 사용자 친화 용어 + 색·아이콘 통합.
 *
 * 정책: ADR-019 (Academy Singularity + first-user owner-강제).
 *
 * 디자인 용어 정책: 화면에 노출되는 텍스트는 일반 사용자가 이해할 수 있는
 * 단어만 사용 — 개발자 약어 (CUD, RLS member_own, slug 등) 금지. 코드 식별자
 * (academyId 등) 는 본 파일 안에서만 사용하고 외부에는 한국어 라벨로 노출.
 *
 * 색·아이콘 SSOT (2026-05-20):
 *   원장(owner) — amber + Crown
 *   관리자(admin) — blue + Shield
 *   강사(member) — emerald + GraduationCap
 * 모든 컴포넌트 (RolePermissionCards / TeacherStatusPill / InviteModal /
 * design-explorations) 는 본 파일의 `ROLE_DESCRIPTORS[role].colors` 와
 * `ROLE_ICONS[role]` 만 사용. hardcoded 색·아이콘 금지.
 */

import { Crown, Shield, GraduationCap, type LucideIcon } from "lucide-react";

export type RoleKey = "owner" | "admin" | "member";

/**
 * 역할별 Tailwind 색 토큰. 컴포넌트는 본 객체의 클래스만 사용.
 * - text: 텍스트/아이콘 색 (chip 라벨, 카드 제목 등)
 * - bg: solid background 약 15% opacity (활성 chip · 아바타 배경)
 * - border: 외곽선 (chip · 카드)
 * - dot: dot indicator (높은 채도, 1.5px+)
 * - gradient: 카드 gradient (from-X-500/15 to-X-500/[0.04])
 */
export interface RoleColors {
  text: string;
  bg: string;
  border: string;
  dot: string;
  gradient: string;
}

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
  /** 색 토큰 — Tailwind class names */
  colors: RoleColors;
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
    colors: {
      text: "text-amber-300",
      bg: "bg-amber-500/20",
      border: "border-amber-400/30",
      dot: "bg-amber-400",
      gradient: "from-amber-500/15 to-amber-500/[0.04]",
    },
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
    colors: {
      text: "text-blue-300",
      bg: "bg-blue-500/20",
      border: "border-blue-400/30",
      dot: "bg-blue-400",
      gradient: "from-blue-500/12 to-blue-500/[0.03]",
    },
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
    colors: {
      text: "text-emerald-300",
      bg: "bg-emerald-500/20",
      border: "border-emerald-400/25",
      dot: "bg-emerald-400",
      gradient: "from-emerald-500/12 to-emerald-500/[0.03]",
    },
  },
};

/** 역할별 lucide-react 아이콘 SSOT. 컴포넌트는 본 map 만 사용. */
export const ROLE_ICONS: Record<RoleKey, LucideIcon> = {
  owner: Crown,
  admin: Shield,
  member: GraduationCap,
};

export const ROLE_KEYS_ORDERED: RoleKey[] = ["owner", "admin", "member"];

/**
 * 권한 미리보기 시 표시할 항목 개수 (SSOT).
 *
 * 모든 미리보기 UI (RolePermissionCards / InviteModal 권한 미리보기 / 향후
 * tooltip) 가 동일 개수 사용 → 사용자가 같은 역할의 권한을 어디서 보든
 * 동일하게 인지. 카드별 N 차이는 "왜 페이지별로 다르지?" 혼란 유발 (사용자
 * 발견 2026-05-21).
 *
 * permissions 전체(5개)는 detail view 또는 향후 "전체 보기" link 에서 노출.
 */
export const ROLE_PERMISSIONS_PREVIEW_COUNT = 4;

/**
 * 권한 미리보기 항목 반환 (SSOT helper).
 * 모든 미리보기 UI 는 본 함수만 호출 — slice/take 직접 호출 금지.
 */
export function getRolePermissionsPreview(role: RoleKey): { ok: boolean; text: string }[] {
  return ROLE_DESCRIPTORS[role].permissions.slice(0, ROLE_PERMISSIONS_PREVIEW_COUNT);
}

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
