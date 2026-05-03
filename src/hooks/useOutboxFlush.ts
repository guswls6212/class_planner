"use client";

import { useEffect, useRef } from "react";
import { flushOutbox, getOutboxSize } from "@/lib/syncOutbox";
import { showToast } from "@/lib/toast";
import { logger } from "@/lib/logger";

/**
 * 페이지 진입 시 1회 outbox flush 시도.
 * 이전 세션에서 retry 10회 후 포기된 sync 작업이 있으면 자동 재시도.
 *
 * - 성공 항목 N개: success 토스트 ("X개 변경 사항이 자동 동기화됐습니다")
 * - 4xx로 영구 실패한 항목: error 토스트 (사용자에게 데이터 손실 알림)
 * - 24시간 만료된 항목: warning 토스트 (오래된 변경 손실 안내)
 *
 * 무손실은 아니지만 영구 silent failure보다 훨씬 나음.
 */
export function useOutboxFlush(userId: string | null): void {
  const flushedRef = useRef(false);

  useEffect(() => {
    if (!userId || flushedRef.current) return;
    if (getOutboxSize(userId) === 0) return;
    flushedRef.current = true;

    void (async () => {
      try {
        const initialSize = getOutboxSize(userId);
        const { sent, failed, expired } = await flushOutbox(userId);
        logger.info("outbox flush 결과", { initialSize, sent, failed, expired });

        if (sent > 0) {
          showToast(
            "success",
            `오프라인 동안 변경한 ${sent}건이 자동 동기화됐습니다.`,
          );
        }
        if (expired > 0) {
          showToast(
            "warning",
            `${expired}건의 오래된 변경(24시간 초과)을 동기화하지 못했습니다. 다시 입력해주세요.`,
          );
        }
        if (failed > 0) {
          showToast(
            "error",
            `${failed}건의 변경이 서버 거부로 동기화 실패했습니다. 관리자에게 문의해주세요.`,
          );
        }
      } catch (err) {
        logger.error("outbox flush 예외", { userId }, err as Error);
      }
    })();
  }, [userId]);
}
