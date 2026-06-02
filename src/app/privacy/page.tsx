import type { Metadata } from "next";

import PrivacyPolicyLayout from "@/components/organisms/PrivacyPolicyLayout";

export const metadata: Metadata = {
  title: "개인정보처리방침 | class-planner",
  description:
    "class-planner 가 처리하는 정보와 목적 · 보관기간 안내. 익명 분석(쿠키 없음), IP /24 마스킹, 자체 보관.",
};

/** 공개 정적 페이지 — 인증 불필요. 누구나 접근 가능해야 함(법적 고지). */
export default function PrivacyPage() {
  return <PrivacyPolicyLayout />;
}
