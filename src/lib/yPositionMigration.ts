/**
 * yPosition 마이그레이션 유틸리티
 * 기존 픽셀 값(0, 51, 102...)을 논리적 위치(1, 2, 3...)로 변환
 */

import type { Session } from "./planner";

/**
 * 픽셀 위치를 논리적 위치로 변환
 * @param pixelPosition 픽셀 위치 (0, 47, 94, ...)
 * @returns 논리적 위치 (1, 2, 3, ...)
 */
export function pixelToLogicalPosition(pixelPosition: number): number {
  if (pixelPosition < 0) return 1; // 음수는 1번째 자리로
  return Math.round(pixelPosition / 47) + 1; // 0px = 1번째, 47px = 2번째, 94px = 3번째
}

/**
 * 논리적 위치를 픽셀 위치로 변환
 * @param logicalPosition 논리적 위치 (1, 2, 3, ...)
 * @returns 픽셀 위치 (0, 47, 94, ...)
 */
export function logicalToPixelPosition(logicalPosition: number): number {
  if (logicalPosition < 1) return 0; // 1 미만은 0px로
  return (logicalPosition - 1) * 47; // 1번째 = 0px, 2번째 = 47px, 3번째 = 94px
}

/**
 * 세션 배열의 yPosition을 픽셀에서 논리적 위치로 마이그레이션
 * @param sessions 세션 배열
 * @returns 마이그레이션된 세션 배열
 */
export function migrateSessionsToLogicalPosition(
  sessions: Session[]
): Session[] {
  return sessions.map((session) => {
    if (session.yPosition !== undefined && session.yPosition !== null) {
      // 기존 값이 논리적 위치인지 픽셀 위치인지 판단
      // 픽셀 위치는 보통 47의 배수이고, 논리적 위치는 보통 작은 정수
      const isPixelPosition =
        session.yPosition >= 47 && session.yPosition % 47 === 0;

      if (isPixelPosition) {
        // 픽셀 위치를 논리적 위치로 변환
        const logicalPosition = pixelToLogicalPosition(session.yPosition);
        console.log(
          `🔄 세션 ${session.id} yPosition 마이그레이션: ${session.yPosition}px → ${logicalPosition}번째 자리`
        );
        return { ...session, yPosition: logicalPosition };
      } else {
        // 이미 논리적 위치인 경우 그대로 유지
        return session;
      }
    }
    return session;
  });
}

/**
 * 세션 배열의 yPosition을 논리적 위치에서 픽셀로 마이그레이션 (역방향)
 * @param sessions 세션 배열
 * @returns 마이그레이션된 세션 배열
 */
export function migrateSessionsToPixelPosition(sessions: Session[]): Session[] {
  return sessions.map((session) => {
    if (session.yPosition !== undefined && session.yPosition !== null) {
      // 논리적 위치를 픽셀 위치로 변환
      const pixelPosition = logicalToPixelPosition(session.yPosition);
      console.log(
        `🔄 세션 ${session.id} yPosition 역마이그레이션: ${session.yPosition}번째 자리 → ${pixelPosition}px`
      );
      return { ...session, yPosition: pixelPosition };
    }
    return session;
  });
}
