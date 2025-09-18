/**
 * useDebouncedSave 커스텀 훅
 * DB 쓰기 작업을 Debounce하여 성능 최적화
 */

import { useCallback, useEffect, useRef } from "react";
import { DATA_SAVE_DEBOUNCE_CONFIG, debounce } from "../lib/debounceUtils";
import { logger } from "../lib/logger";
import type { ClassPlannerData } from "../types/dataSyncTypes";
import { supabase } from "../utils/supabaseClient";

interface UseDebouncedSaveReturn {
  saveData: (data: ClassPlannerData) => void;
  flush: () => Promise<void>;
  cancel: () => void;
  isPending: () => boolean;
}

export const useDebouncedSave = (): UseDebouncedSaveReturn => {
  const saveToServerRef = useRef<{
    (data: ClassPlannerData): Promise<void>;
    cancel(): void;
    flush(): void;
    pending(): boolean;
  } | null>(null);
  const pendingDataRef = useRef<ClassPlannerData | null>(null);

  /**
   * 서버에 데이터 저장
   */
  const saveToServer = useCallback(
    async (data: ClassPlannerData): Promise<void> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.warn("로그인되지 않은 사용자 - 서버 저장 건너뜀");
          return;
        }

        const { error } = await supabase.from("user_data").upsert({
          user_id: user.id,
          data: data,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          throw error;
        }

        logger.info("데이터가 서버에 성공적으로 저장되었습니다.");
      } catch (error) {
        logger.error("서버 저장 실패", undefined, error);
        throw error;
      }
    },
    []
  );

  /**
   * Debounced 저장 함수 생성
   */
  useEffect(() => {
    const debouncedSave = debounce(async (...args: unknown[]) => {
      const data = args[0] as ClassPlannerData;
      pendingDataRef.current = data;
      await saveToServer(data);
      pendingDataRef.current = null;
    }, DATA_SAVE_DEBOUNCE_CONFIG) as {
      (data: ClassPlannerData): Promise<void>;
      cancel(): void;
      flush(): void;
      pending(): boolean;
    };

    saveToServerRef.current = debouncedSave;

    return () => {
      debouncedSave.cancel();
    };
  }, [saveToServer]);

  /**
   * 데이터 저장 요청
   */
  const saveData = useCallback((data: ClassPlannerData) => {
    if (saveToServerRef.current) {
      saveToServerRef.current(data);
    }
  }, []);

  /**
   * 즉시 저장 (Debounce 무시)
   */
  const flush = useCallback(async (): Promise<void> => {
    if (saveToServerRef.current && pendingDataRef.current) {
      saveToServerRef.current.flush();
    }
  }, []);

  /**
   * 저장 취소
   */
  const cancel = useCallback(() => {
    if (saveToServerRef.current) {
      saveToServerRef.current.cancel();
      pendingDataRef.current = null;
    }
  }, []);

  /**
   * 저장 대기 중인지 확인
   */
  const isPending = useCallback((): boolean => {
    return saveToServerRef.current?.pending() || false;
  }, []);

  return {
    saveData,
    flush,
    cancel,
    isPending,
  };
};
