/**
 * 🎣 Custom Hook - useUserSettings
 *
 * 사용자 설정을 관리하는 훅입니다.
 * API Routes를 통해 user_settings 테이블과 상호작용합니다.
 */

import { useCallback, useEffect, useState } from "react";

// ===== 타입 정의 =====

export interface UserSettings {
  theme: "light" | "dark";
  language: "ko" | "en";
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy_settings: {
    profile_public: boolean;
    data_sharing: boolean;
  };
}

export interface UseUserSettingsReturn {
  // 상태
  settings: UserSettings;
  loading: boolean;
  error: string | null;

  // 액션
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<boolean>;
  updateTheme: (theme: UserSettings["theme"]) => Promise<boolean>;
  updateLanguage: (language: UserSettings["language"]) => Promise<boolean>;
  updateNotifications: (
    notifications: UserSettings["notifications"]
  ) => Promise<boolean>;
  updatePrivacySettings: (
    privacy_settings: UserSettings["privacy_settings"]
  ) => Promise<boolean>;

  // 유틸리티
  refreshSettings: () => Promise<void>;
  clearError: () => void;
}

// ===== 기본 설정 =====

const DEFAULT_SETTINGS: UserSettings = {
  theme: "light",
  language: "ko",
  timezone: "Asia/Seoul",
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  privacy_settings: {
    profile_public: false,
    data_sharing: false,
  },
};

// ===== 훅 구현 =====

export const useUserSettings = (): UseUserSettingsReturn => {
  // 상태
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 호출 헬퍼 함수
  const apiCall = useCallback(
    async (url: string, options: RequestInit = {}) => {
      try {
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          ...options,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data;
      } catch (error) {
        console.error("API 호출 실패:", error);
        throw error;
      }
    },
    []
  );

  // ===== 설정 조회 =====

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 사용자 ID 가져오기
      const userId =
        localStorage.getItem("supabase_user_id") || "default-user-id";

      const data = await apiCall(`/api/user-settings?userId=${userId}`);
      setSettings(data.data || DEFAULT_SETTINGS);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "설정 조회 실패";
      setError(errorMessage);
      console.error("설정 조회 실패:", err);

      // API 호출 실패 시 기본 설정 사용
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // ===== 설정 업데이트 =====

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        // 사용자 ID 가져오기
        const userId =
          localStorage.getItem("supabase_user_id") || "default-user-id";

        const data = await apiCall(`/api/user-settings?userId=${userId}`, {
          method: "PUT",
          body: JSON.stringify(newSettings),
        });

        setSettings(data.data);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "설정 업데이트 실패";
        setError(errorMessage);
        console.error("설정 업데이트 실패:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiCall]
  );

  // ===== 개별 설정 업데이트 =====

  const updateTheme = useCallback(
    async (theme: UserSettings["theme"]): Promise<boolean> => {
      return updateSettings({ theme });
    },
    [updateSettings]
  );

  const updateLanguage = useCallback(
    async (language: UserSettings["language"]): Promise<boolean> => {
      return updateSettings({ language });
    },
    [updateSettings]
  );

  const updateNotifications = useCallback(
    async (notifications: UserSettings["notifications"]): Promise<boolean> => {
      return updateSettings({ notifications });
    },
    [updateSettings]
  );

  const updatePrivacySettings = useCallback(
    async (
      privacy_settings: UserSettings["privacy_settings"]
    ): Promise<boolean> => {
      return updateSettings({ privacy_settings });
    },
    [updateSettings]
  );

  // ===== 유틸리티 =====

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== 초기화 =====

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // ===== 반환 =====

  return {
    // 상태
    settings,
    loading,
    error,

    // 액션
    updateSettings,
    updateTheme,
    updateLanguage,
    updateNotifications,
    updatePrivacySettings,

    // 유틸리티
    refreshSettings,
    clearError,
  };
};
