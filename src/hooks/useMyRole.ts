"use client";

/**
 * useMyRole — thin re-export from MemberContext.
 *
 * 본 hook의 모든 로직(/api/members + /api/academies/mine + /api/auth/set-role-cookie
 * fetch, sessionStorage cache, setActiveAcademyId 부트스트랩)은 MemberProvider로 이전.
 * Provider는 RootProviders에서 1회만 mount → 모든 consumer가 in-flight + 결과를
 * 함께 공유 → /schedule 같은 다중 consumer 페이지의 중복 fetch 0.
 *
 * 기존 consumer는 코드 변경 없이 그대로 동작. signature/반환 타입 동일.
 */
export { useMemberContext as useMyRole } from "@/contexts/MemberContext";
export type {
  CurrentMemberData,
  AcademyMembership,
} from "@/contexts/MemberContext";
