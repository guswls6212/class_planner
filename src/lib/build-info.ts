// 빌드 정보 관리 유틸리티

export interface BuildInfo {
  buildTime: string;
  version: string;
  commitHash?: string;
  environment: "development" | "production";
}

// Vite 환경 변수에서 빌드 정보 가져오기
const BUILD_TIME =
  process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
const COMMIT_HASH = process.env.NEXT_PUBLIC_COMMIT_HASH || "unknown";
const ENVIRONMENT =
  (process.env.NODE_ENV as "development" | "production") || "development";

export const buildInfo: BuildInfo = {
  buildTime: BUILD_TIME,
  version: VERSION,
  commitHash: COMMIT_HASH,
  environment: ENVIRONMENT,
};

// 배포 상태 확인 함수
export function getDeploymentStatus(): {
  isLatest: boolean;
  lastDeployed: string;
  version: string;
} {
  const now = new Date();
  const buildDate = new Date(buildInfo.buildTime);
  const timeDiff = now.getTime() - buildDate.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // 24시간 이내면 최신으로 간주
  const isLatest = hoursDiff < 24;

  return {
    isLatest,
    lastDeployed: buildInfo.buildTime,
    version: buildInfo.version,
  };
}

// 배포 시간을 한국 시간으로 포맷팅
export function formatDeploymentTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
