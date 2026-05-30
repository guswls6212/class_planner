"use client";

import { useEffect, useState } from "react";

/**
 * 사용자 플랜 tier 관리 (T2 결제 시스템 도입 전 placeholder).
 *
 * 현재: 모두 free 고정. 향후 T2 결제 머지 후 실제 plan tier 테이블/API
 * 연동으로 확장. 지금은 freemium 잠금 UI(DataHistorySection 등)가
 * "프리미엄 곧 출시" 패턴으로 동작하도록 false 반환.
 *
 * ADR-008 (T2 multi-slot Coming Soon) 패턴과 정합.
 */
export type PlanTier = "free" | "pro";

export interface PlanData {
  tier: PlanTier;
  /** 일반 자동 백업 복구 가능 슬롯 수 (free=3, pro=10) */
  autoSnapshotRestoreSlots: number;
  /** 수동 백업 슬롯 수 (free=0, pro=5) */
  manualSnapshotSlots: number;
  isLoading: boolean;
}

const FREE_PLAN: PlanData = {
  tier: "free",
  autoSnapshotRestoreSlots: 3,
  manualSnapshotSlots: 0,
  isLoading: false,
};

export function useMyPlan(): PlanData {
  const [plan, setPlan] = useState<PlanData>({
    ...FREE_PLAN,
    isLoading: true,
  });

  useEffect(() => {
    // T2 결제 시스템 도입 시 fetch('/api/plans?...') 같은 호출로 교체.
    // 현재는 즉시 free 고정.
    setPlan(FREE_PLAN);
  }, []);

  return plan;
}
