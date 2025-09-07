/**
 * useDataSync 커스텀 훅
 * 로그인 시 localStorage와 DB 간의 데이터 동기화 로직을 관리
 */

import { useCallback, useState } from 'react';
import {
  compareDataSummaries,
  createDataSummary,
  determineSyncScenario,
  loadFromLocalStorage,
  removeFromLocalStorage,
  saveToLocalStorage,
  validateData,
} from '../lib/dataSyncUtils';
import type {
  ClassPlannerData,
  DataSource,
  DataSummary,
  SyncAction,
  SyncModalState,
  SyncResult,
  SyncScenario,
  UseDataSyncReturn,
} from '../types/dataSyncTypes';
import { supabase } from '../utils/supabaseClient';

export const useDataSync = (): UseDataSyncReturn => {
  const [syncModal, setSyncModal] = useState<SyncModalState>({
    isOpen: false,
    scenario: 'noData',
  });
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * 데이터 요약 정보 생성
   */
  const getDataSummary = useCallback(
    (data: ClassPlannerData, source: DataSource = 'local'): DataSummary => {
      return createDataSummary(data, source);
    },
    []
  );

  /**
   * 데이터 비교 정보 생성
   */
  const compareData = useCallback(
    (local: DataSummary, server: DataSummary): string => {
      return compareDataSummaries(local, server);
    },
    []
  );

  /**
   * 동기화 필요 여부 확인
   */
  const checkSyncNeeded = useCallback(async (): Promise<SyncScenario> => {
    try {
      // localStorage 데이터 확인
      const localData = loadFromLocalStorage();
      const hasLocalData = localData && validateData(localData);

      // 서버 데이터 확인 (로그인된 사용자만)
      let hasServerData = false;
      let serverData = null;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('user_id', user.id)
            .single();

          if (!error && data?.data) {
            hasServerData = true;
            serverData = data.data;
          }
        }
      } catch (error) {
        console.warn('서버 데이터 확인 실패:', error);
      }

      const scenario = determineSyncScenario(!!hasLocalData, !!hasServerData);

      // 시나리오에 따른 모달 데이터 설정
      if (scenario === 'newUser' && hasLocalData) {
        const localSummary = getDataSummary(localData, 'local');
        setSyncModal(prev => ({
          ...prev,
          scenario,
          localData: localSummary,
        }));
      } else if (scenario === 'dataConflict' && hasLocalData && hasServerData) {
        const localSummary = getDataSummary(localData, 'local');
        const serverSummary = getDataSummary(serverData, 'server');
        setSyncModal(prev => ({
          ...prev,
          scenario,
          localData: localSummary,
          serverData: serverSummary,
        }));
      }

      return scenario;
    } catch (error) {
      console.error('동기화 필요 여부 확인 실패:', error);
      return 'noData';
    }
  }, [getDataSummary]);

  /**
   * 동기화 모달 열기
   */
  const openSyncModal = useCallback(
    (
      scenario: SyncScenario,
      localData?: DataSummary,
      serverData?: DataSummary
    ) => {
      setSyncModal({
        isOpen: true,
        scenario,
        localData,
        serverData,
      });
    },
    []
  );

  /**
   * 동기화 모달 닫기
   */
  const closeSyncModal = useCallback(() => {
    setSyncModal(prev => ({
      ...prev,
      isOpen: false,
      selectedAction: undefined,
    }));
  }, []);

  /**
   * 동기화 실행
   */
  const executeSync = useCallback(
    async (action: SyncAction): Promise<SyncResult> => {
      setIsSyncing(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('로그인이 필요합니다.');
        }

        let result: SyncResult;

        switch (action) {
          case 'uploadLocal': {
            // 로컬 데이터를 서버에 업로드
            const localData = loadFromLocalStorage();
            if (!localData || !validateData(localData)) {
              throw new Error('유효하지 않은 로컬 데이터입니다.');
            }

            const { error } = await supabase.from('user_data').upsert({
              user_id: user.id,
              data: localData,
              updated_at: new Date().toISOString(),
            });

            if (error) throw error;

            // 로컬 데이터 삭제
            removeFromLocalStorage();

            result = {
              success: true,
              action,
              message: '로컬 데이터가 계정에 성공적으로 저장되었습니다.',
              data: localData,
            };
            break;
          }

          case 'downloadServer': {
            // 서버 데이터를 로컬에 다운로드
            const { data, error } = await supabase
              .from('user_data')
              .select('data')
              .eq('user_id', user.id)
              .single();

            if (error) throw error;
            if (!data?.data) {
              throw new Error('서버에 저장된 데이터가 없습니다.');
            }

            const success = saveToLocalStorage(data.data);
            if (!success) {
              throw new Error('로컬 저장소에 데이터 저장에 실패했습니다.');
            }

            result = {
              success: true,
              action,
              message: '서버 데이터가 로컬에 성공적으로 저장되었습니다.',
              data: data.data,
            };
            break;
          }

          case 'keepServer': {
            // 서버 데이터 유지 (로컬 데이터 무시)
            const { data, error } = await supabase
              .from('user_data')
              .select('data')
              .eq('user_id', user.id)
              .single();

            if (error) throw error;
            if (!data?.data) {
              throw new Error('서버에 저장된 데이터가 없습니다.');
            }

            const success = saveToLocalStorage(data.data);
            if (!success) {
              throw new Error('로컬 저장소에 데이터 저장에 실패했습니다.');
            }

            result = {
              success: true,
              action,
              message:
                '서버 데이터를 사용합니다. 로컬 데이터는 무시되었습니다.',
              data: data.data,
            };
            break;
          }

          case 'keepLocal': {
            // 로컬 데이터 유지 (서버 데이터 덮어쓰기)
            const localData = loadFromLocalStorage();
            if (!localData || !validateData(localData)) {
              throw new Error('유효하지 않은 로컬 데이터입니다.');
            }

            const { error } = await supabase.from('user_data').upsert({
              user_id: user.id,
              data: localData,
              updated_at: new Date().toISOString(),
            });

            if (error) throw error;

            result = {
              success: true,
              action,
              message: '로컬 데이터로 서버를 덮어썼습니다.',
              data: localData,
            };
            break;
          }

          case 'cancelSync': {
            result = {
              success: true,
              action,
              message: '동기화가 취소되었습니다.',
            };
            break;
          }

          default:
            throw new Error('알 수 없는 동기화 액션입니다.');
        }

        // 모달 닫기
        closeSyncModal();
        return result;
      } catch (error) {
        console.error('동기화 실행 실패:', error);
        const result: SyncResult = {
          success: false,
          action,
          message:
            error instanceof Error
              ? error.message
              : '동기화 중 오류가 발생했습니다.',
        };
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [closeSyncModal]
  );

  return {
    // 상태
    syncModal,
    isSyncing,

    // 액션
    checkSyncNeeded,
    openSyncModal,
    closeSyncModal,
    executeSync,

    // 유틸리티
    getDataSummary,
    compareData,
  };
};
