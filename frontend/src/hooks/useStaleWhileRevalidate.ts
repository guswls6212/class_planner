/**
 * useStaleWhileRevalidate 커스텀 훅
 * 로그인 사용자를 위한 캐시 전략 구현
 * localStorage를 캐시로 활용하여 빠른 초기 로딩과 백그라운드 동기화 제공
 */

import { useCallback, useEffect, useState } from 'react';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  validateData,
} from '../lib/dataSyncUtils';
import type { CacheStrategy, ClassPlannerData } from '../types/dataSyncTypes';
import { supabase } from '../utils/supabaseClient';

interface UseStaleWhileRevalidateReturn {
  data: ClassPlannerData | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
  updateData: (newData: ClassPlannerData) => Promise<void>;
}

export const useStaleWhileRevalidate = (
  cacheKey: string = 'classPlannerData',
  strategy: CacheStrategy = {
    useStaleWhileRevalidate: true,
    cacheExpiry: 5 * 60 * 1000, // 5분
    backgroundRefresh: true,
  }
): UseStaleWhileRevalidateReturn => {
  const [data, setData] = useState<ClassPlannerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  /**
   * 캐시된 데이터가 유효한지 확인
   */
  const isCacheValid = useCallback(
    (cachedData: ClassPlannerData): boolean => {
      if (!cachedData || !validateData(cachedData)) {
        return false;
      }

      const cacheTime = new Date(cachedData.lastModified || 0);
      const now = new Date();
      const age = now.getTime() - cacheTime.getTime();

      return age < strategy.cacheExpiry;
    },
    [strategy.cacheExpiry]
  );

  /**
   * 서버에서 최신 데이터 가져오기
   */
  const fetchFromServer =
    useCallback(async (): Promise<ClassPlannerData | null> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('로그인이 필요합니다.');
        }

        const { data: serverData, error } = await supabase
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', user.id)
          .single();

        if (error) {
          throw error;
        }

        return serverData?.data || null;
      } catch (error) {
        console.error('서버에서 데이터 가져오기 실패:', error);
        throw error;
      }
    }, []);

  /**
   * 데이터 새로고침 (강제 업데이트)
   */
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setIsStale(false);

    try {
      const serverData = await fetchFromServer();

      if (serverData) {
        setData(serverData);
        setLastUpdated(new Date().toISOString());

        // 캐시 업데이트
        saveToLocalStorage(serverData, cacheKey);
      }
    } catch (error) {
      console.error('데이터 새로고침 실패:', error);
      // 서버에서 가져오기 실패 시 캐시된 데이터 유지
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromServer, cacheKey]);

  /**
   * 데이터 업데이트 (로컬 + 서버)
   */
  const updateData = useCallback(
    async (newData: ClassPlannerData): Promise<void> => {
      try {
        // 로컬 상태 업데이트
        setData(newData);
        setLastUpdated(new Date().toISOString());

        // 캐시 업데이트
        saveToLocalStorage(newData, cacheKey);

        // 서버 업데이트 (백그라운드)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_data').upsert({
            user_id: user.id,
            data: newData,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('데이터 업데이트 실패:', error);
        throw error;
      }
    },
    [cacheKey]
  );

  /**
   * 초기 데이터 로드
   */
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);

      try {
        // 1. 캐시된 데이터 확인
        const cachedData = loadFromLocalStorage(cacheKey);

        if (cachedData && validateData(cachedData)) {
          // 캐시된 데이터로 즉시 화면 표시
          setData(cachedData);
          setLastUpdated(cachedData.lastModified);

          // 캐시가 오래된 경우 stale 표시
          if (!isCacheValid(cachedData)) {
            setIsStale(true);
          }
        }

        // 2. 서버에서 최신 데이터 가져오기 (백그라운드)
        if (strategy.backgroundRefresh) {
          try {
            const serverData = await fetchFromServer();

            if (serverData) {
              // 서버 데이터가 캐시와 다른 경우 업데이트
              if (
                !cachedData ||
                JSON.stringify(serverData) !== JSON.stringify(cachedData)
              ) {
                setData(serverData);
                setLastUpdated(
                  serverData.lastModified || new Date().toISOString()
                );
                saveToLocalStorage(serverData, cacheKey);
              }

              setIsStale(false);
            }
          } catch (error) {
            console.warn('백그라운드 데이터 동기화 실패:', error);
            // 서버 동기화 실패 시 캐시된 데이터 유지
          }
        }
      } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [cacheKey, strategy.backgroundRefresh, fetchFromServer, isCacheValid]);

  /**
   * 주기적 백그라운드 동기화
   */
  useEffect(() => {
    if (!strategy.backgroundRefresh || !data) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const serverData = await fetchFromServer();

        if (serverData && JSON.stringify(serverData) !== JSON.stringify(data)) {
          setData(serverData);
          setLastUpdated(serverData.lastModified || new Date().toISOString());
          saveToLocalStorage(serverData, cacheKey);
          setIsStale(false);
        }
      } catch (error) {
        console.warn('주기적 동기화 실패:', error);
      }
    }, strategy.cacheExpiry); // 캐시 만료 시간마다 동기화

    return () => clearInterval(interval);
  }, [
    data,
    strategy.backgroundRefresh,
    strategy.cacheExpiry,
    fetchFromServer,
    cacheKey,
  ]);

  return {
    data,
    isLoading,
    isStale,
    lastUpdated,
    refresh,
    updateData,
  };
};
