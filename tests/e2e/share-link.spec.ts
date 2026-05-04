/**
 * Share link e2e — auth-required (settings 페이지 + share-tokens API).
 *
 * Phase 2a 학습: settings 페이지가 AuthGuard로 보호되며 supabase-js getSession()
 * mock이 어렵다. 본 spec은 처음부터 test.skip + FIXME 주석으로 후속 분리.
 *
 * 후속 PR에서 다음 패턴 도입 후 재활성:
 * (a) supabase-js test client 도입 또는 (b) AuthGuard mock decorator
 * (c) /share/[token] 공개 라우트만 단독 검증 (auth 우회 가능 — 별도 spec)
 */
import { test } from "@playwright/test";

test.describe.skip("share link — settings 페이지 share token 발급", () => {
  test("FIXME: 후속 PR에서 auth mock 정립 후 재활성 — POST /api/share-tokens", async () => {
    // auth-mock + settings 진입 후 "공유 링크 발급" 버튼 → 모달 → label/expiresInDays 입력 → POST
  });

  test("FIXME: 발급된 share token의 /share/[token] 페이지 접근 — anonymous OK", async () => {
    // /share/[token] 라우트는 public — 별도 spec으로 분리 가능
    // GET /api/share/[token] 응답으로 read-only schedule 검증
  });
});
