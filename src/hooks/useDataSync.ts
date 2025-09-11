/**
 * useDataSync 커스텀 훅
 * 로그인 시 localStorage와 DB 간의 데이터 동기화 로직을 관리
 */

import { useCallback, useEffect, useState } from "react";
import {
  compareDataSummaries,
  createDataSummary,
  determineSyncScenario,
  loadFromLocalStorage,
  removeFromLocalStorage,
  saveToLocalStorage,
  validateData,
} from "../lib/dataSyncUtils";
import type {
  ClassPlannerData,
  DataSource,
  DataSummary,
  SyncAction,
  SyncModalState,
  SyncResult,
  SyncScenario,
  UseDataSyncReturn,
} from "../types/dataSyncTypes";
import { supabase } from "../utils/supabaseClient";

export const useDataSync = (): UseDataSyncReturn => {
  const [syncModal, setSyncModal] = useState<SyncModalState>({
    isOpen: false,
    scenario: "noData",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);

  // 모달 상태 변경 추적 (디버깅용 - 무한루프 방지)
  useEffect(() => {
    if (syncModal.isOpen) {
      console.log("useDataSync: 모달 상태 변경됨:", syncModal);
    }
  }, [syncModal]);

  // Realtime 구독 설정
  useEffect(() => {
    let mounted = true;

    const setupRealtimeSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // 로그아웃 상태이거나 컴포넌트가 언마운트된 경우 종료
        if (!user || !mounted) {
          console.log(
            "🔔 Realtime 구독 건너뜀 - 로그아웃 상태 또는 언마운트됨"
          );
          return;
        }

        // 기존 채널 정리
        if (realtimeChannel) {
          await supabase.removeChannel(realtimeChannel);
        }

        // 새로운 Realtime 채널 생성
        const channel = supabase
          .channel("user_data_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_data",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("🔄 Realtime 변경 감지:", payload);

              if (payload.eventType === "UPDATE" && payload.new) {
                // 서버에서 데이터가 업데이트되었을 때 로컬 저장소도 업데이트
                const serverData = payload.new.data as ClassPlannerData;
                if (serverData && validateData(serverData)) {
                  saveToLocalStorage(serverData);
                  console.log("✅ Realtime으로 로컬 데이터 동기화 완료");

                  // 페이지 새로고침을 통해 UI 업데이트
                  window.location.reload();
                }
              } else if (payload.eventType === "INSERT" && payload.new) {
                // 새 데이터가 삽입되었을 때
                const serverData = payload.new.data as ClassPlannerData;
                if (serverData && validateData(serverData)) {
                  saveToLocalStorage(serverData);
                  console.log("✅ Realtime으로 새 데이터 동기화 완료");
                  window.location.reload();
                }
              }
            }
          )
          .subscribe();

        if (mounted) {
          setRealtimeChannel(channel);
          console.log("🔔 Realtime 구독 설정 완료");
        }
      } catch (error) {
        console.error("❌ Realtime 구독 설정 실패:", error);
      }
    };

    setupRealtimeSubscription();

    // 컴포넌트 언마운트 시 채널 정리
    return () => {
      mounted = false;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []); // 컴포넌트 마운트 시에만 실행

  /**
   * 데이터 요약 정보 생성
   */
  const getDataSummary = useCallback(
    (data: ClassPlannerData, source: DataSource = "local"): DataSummary => {
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
    console.log("checkSyncNeeded 함수 시작");
    try {
      // 먼저 로그인 상태 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("로그아웃 상태 - 동기화 건너뜀");
        return "noData";
      }

      // localStorage 데이터 확인
      console.log("localStorage 데이터 로딩 시작");
      const localData = loadFromLocalStorage();
      console.log("localStorage 데이터 로딩 완료:", localData);

      const hasLocalData = localData && validateData(localData);
      console.log("데이터 유효성 검증 완료:", hasLocalData);

      console.log("로컬 데이터 확인:", {
        hasLocalData,
        localDataKeys: hasLocalData ? Object.keys(localData) : null,
        localDataSample: hasLocalData
          ? {
              students: localData.students?.length || 0,
              subjects: localData.subjects?.length || 0,
              sessions: localData.sessions?.length || 0,
            }
          : null,
      });

      // 서버 데이터 확인 (로그인된 사용자만)
      console.log("서버 데이터 확인 시작");
      let hasServerData = false;
      let serverData = null;

      try {
        console.log("user_data 테이블 조회 시작");

        // getSession 타임아웃 설정
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("getSession 타임아웃 (5초)")),
            5000
          );
        });

        const sessionResult = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]);

        if (sessionResult && (sessionResult as any).data?.session?.user) {
          const { data, error } = await supabase
            .from("user_data")
            .select("data")
            .eq("user_id", (sessionResult as any).data.session.user.id)
            .single();

          console.log("서버 데이터 조회 결과:", { data, error });

          if (!error && data) {
            hasServerData = true;
            serverData = data.data;
            console.log("서버 데이터 발견:", Object.keys(serverData));
            console.log(
              "서버 데이터 업데이트 시간:",
              (data as { updated_at?: string }).updated_at
            );
          } else if (error && error.code === "PGRST116") {
            // PGRST116: No rows found (정상적인 경우)
            console.log("서버에 데이터 없음 (새 사용자)");
          } else if (error) {
            console.log("서버 데이터 조회 오류:", error.message);
          } else {
            console.log("서버에 데이터 없음");
          }
        } else {
          console.log("세션이 없음 - 서버 데이터 조회 건너뜀");
        }
      } catch (error) {
        console.error("서버 데이터 확인 실패:", error);
        // 타임아웃이 발생해도 계속 진행
      }

      const scenario = determineSyncScenario(!!hasLocalData, !!hasServerData);

      console.log("동기화 시나리오 결정:", {
        hasLocalData,
        hasServerData,
        scenario,
      });

      // 시나리오에 따른 모달 데이터 설정
      if (scenario === "localOnlyFirstLogin" && hasLocalData) {
        const localSummary = getDataSummary(localData, "local");
        setSyncModal((prev) => ({
          ...prev,
          isOpen: true,
          scenario,
          localData: localSummary,
        }));
      } else if (
        scenario === "localAndServerConflict" &&
        hasLocalData &&
        hasServerData
      ) {
        const localSummary = getDataSummary(localData, "local");
        const serverSummary = getDataSummary(serverData, "server");
        setSyncModal((prev) => ({
          ...prev,
          isOpen: true,
          scenario,
          localData: localSummary,
          serverData: serverSummary,
        }));
      } else if (scenario === "noData") {
        // 데이터가 없는 경우에도 테스트를 위해 모달 표시
        console.log("데이터 없음 - 테스트를 위해 모달 표시");
        setSyncModal((prev) => {
          const newState = {
            ...prev,
            isOpen: true,
            scenario: "localOnlyFirstLogin" as SyncScenario,
            localData: undefined,
            serverData: undefined,
          };
          console.log("setSyncModal 호출:", newState);
          return newState;
        });
      }

      return scenario;
    } catch (error) {
      console.error("동기화 필요 여부 확인 실패:", error);
      return "noData";
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
    setSyncModal((prev) => ({
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
          throw new Error("로그인이 필요합니다.");
        }

        let result: SyncResult;

        switch (action) {
          case "importData": {
            // 로컬 데이터를 서버에 업로드하고 로컬 데이터 삭제
            const localData = loadFromLocalStorage();
            if (!localData || !validateData(localData)) {
              throw new Error("유효하지 않은 로컬 데이터입니다.");
            }

            const { error } = await supabase.from("user_data").upsert(
              {
                user_id: user.id,
                data: localData,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id",
              }
            );

            if (error) throw error;

            // 로컬 데이터 삭제 (사용자 선택 후)
            removeFromLocalStorage();

            result = {
              success: true,
              action,
              message: "로컬 데이터가 계정에 성공적으로 저장되었습니다.",
              data: localData,
            };
            break;
          }

          case "startFresh": {
            // 로컬 데이터 삭제하고 서버의 빈 데이터로 시작
            removeFromLocalStorage();

            // 서버에 빈 데이터 저장
            const emptyData = {
              students: [],
              subjects: [],
              sessions: [],
              enrollments: [],
              lastModified: new Date().toISOString(),
              version: "1.0",
            };

            const { error } = await supabase.from("user_data").upsert(
              {
                user_id: user.id,
                data: emptyData,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id",
              }
            );

            if (error) throw error;

            result = {
              success: true,
              action,
              message: "새로운 시작으로 설정되었습니다.",
              data: emptyData,
            };
            break;
          }

          case "useDeviceData": {
            // 로컬 데이터를 서버에 업로드하고 로컬 데이터 삭제
            const localData = loadFromLocalStorage();
            if (!localData || !validateData(localData)) {
              throw new Error("유효하지 않은 로컬 데이터입니다.");
            }

            const { error } = await supabase.from("user_data").upsert(
              {
                user_id: user.id,
                data: localData,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id",
              }
            );

            if (error) throw error;

            // 로컬 데이터 삭제 (사용자 선택 후)
            removeFromLocalStorage();

            result = {
              success: true,
              action,
              message: "기기 데이터로 서버를 덮어썼습니다.",
              data: localData,
            };
            break;
          }

          case "useServerData": {
            // 서버 데이터를 로컬에 다운로드하고 로컬 데이터 삭제
            const { data, error } = await supabase
              .from("user_data")
              .select("data, updated_at")
              .eq("user_id", user.id)
              .single();

            if (error) throw error;
            if (!data?.data) {
              throw new Error("서버에 저장된 데이터가 없습니다.");
            }

            // 로컬 데이터 삭제 (사용자 선택 후)
            removeFromLocalStorage();

            const success = saveToLocalStorage(data.data);
            if (!success) {
              throw new Error("로컬 저장소에 데이터 저장에 실패했습니다.");
            }

            result = {
              success: true,
              action,
              message: "서버 데이터를 사용합니다.",
              data: data.data,
            };
            break;
          }

          case "cancelSync": {
            result = {
              success: true,
              action,
              message: "동기화가 취소되었습니다.",
            };
            break;
          }

          default:
            throw new Error("알 수 없는 동기화 액션입니다.");
        }

        // 모달 닫기
        closeSyncModal();
        return result;
      } catch (error) {
        console.error("동기화 실행 실패:", error);
        const result: SyncResult = {
          success: false,
          action,
          message:
            error instanceof Error
              ? error.message
              : "동기화 중 오류가 발생했습니다.",
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
