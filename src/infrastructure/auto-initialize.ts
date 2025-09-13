/**
 * 자동 초기화 모듈
 * Next.js 앱 시작 시 RepositoryRegistry를 자동으로 초기화합니다.
 */

import { RepositoryInitializer } from "./container/RepositoryInitializer";

/**
 * Repository 자동 초기화
 * 서버 사이드와 클라이언트 사이드 모두에서 실행됩니다.
 */
export async function initializeRepositories(): Promise<void> {
  try {
    await RepositoryInitializer.initialize();
  } catch (error) {
    console.error("❌ Repository 자동 초기화 실패:", error);
    // 초기화 실패해도 앱은 계속 실행 (하위 호환성)
  }
}

/**
 * 클라이언트 사이드에서 Repository 상태 확인
 */
export function checkRepositoryStatus(): void {
  if (typeof window !== "undefined") {
    console.log("🌐 클라이언트 사이드에서 Repository 상태 확인");
    RepositoryInitializer.logStatus();
  }
}

// Next.js 앱 시작 시 자동 초기화 (서버와 클라이언트 모두)
initializeRepositories().catch((error) => {
  console.error("❌ Repository 초기화 중 오류:", error);
});
