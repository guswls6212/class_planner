/**
 * Playwright global teardown — 모든 e2e spec 실행 후 한 번 동작.
 *
 * 동작:
 * 1. cleanupTestUserData 호출 — test user의 모든 academy + 데이터 삭제 (user 자체는 보존)
 * 2. 다음 CI run은 깨끗한 상태에서 시작 — setup-e2e-test-user가 새 academy INSERT
 *
 * 이전 문제: spec 안에서 명시적 cleanup 호출만 부분적 → 다른 데이터(academy/students/teachers)
 * 누적 → 다음 CI에서 이전 통과 spec까지 fail. globalTeardown으로 영구 해결.
 *
 * 실패 안전성: cleanup이 실패해도 다음 setup이 멱등이라 안전. 경고만 로그.
 */
import { cleanupTestUserData } from "./helpers/cleanup-test-data";

async function globalTeardown(): Promise<void> {
  try {
    await cleanupTestUserData();
    // eslint-disable-next-line no-console
    console.log("[e2e global-teardown] test user 데이터 cleanup 완료");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[e2e global-teardown] cleanup 실패 (무시): ${(err as Error).message}`,
    );
  }
}

export default globalTeardown;
