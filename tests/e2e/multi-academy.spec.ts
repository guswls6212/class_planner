/**
 * Multi-academy e2e — auth-required (다중 academy 멤버십 + active academy 전환).
 *
 * Phase 2a 학습: auth 통과가 어려워 처음부터 test.skip + FIXME 주석으로 후속 분리.
 *
 * 시나리오 (후속 PR 작업 가이드):
 * - 두 개 이상의 academy에 속한 사용자 시드
 * - active_academy:{userId} localStorage 또는 cookie active_academy_id
 * - POST /api/auth/set-active-academy — 활성 academy 전환
 * - schedule 페이지 데이터가 active academy 기준으로 필터링되는지
 *
 * 필요 mock: supabase auth + GET /api/members + GET /api/academies/mine
 */
import { test } from "@playwright/test";

test.describe.skip("multi-academy — 다중 학원 멤버 시나리오", () => {
  test("FIXME: 후속 PR에서 auth mock + 다중 academy seed 정립 후 재활성", async () => {
    // 활성 academy 전환 → schedule 페이지 데이터 변경 검증
  });
});
