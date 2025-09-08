/**
 * useFeatureGuard 커스텀 훅
 * 유료 기능 제한 및 업그레이드 유도 로직을 관리
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  FeatureLimit,
  FeatureType,
  UseFeatureGuardReturn,
} from '../types/dataSyncTypes';
import { supabase } from '../utils/supabaseClient';

// 기능별 제한 설정
const FEATURE_LIMITS: Record<
  FeatureType,
  { freeLimit: number; premiumLimit: number }
> = {
  addStudent: { freeLimit: 10, premiumLimit: -1 }, // -1은 무제한
  addSubject: { freeLimit: 20, premiumLimit: -1 },
  addSession: { freeLimit: 50, premiumLimit: -1 },
  exportData: { freeLimit: 0, premiumLimit: -1 }, // 무료 사용자는 내보내기 불가
};

export const useFeatureGuard = (): UseFeatureGuardReturn => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState({
    isOpen: false,
    featureType: undefined as FeatureType | undefined,
    currentCount: undefined as number | undefined,
    limit: undefined as number | undefined,
  });

  /**
   * 로그인 상태 확인
   */
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);

        if (user) {
          // 프리미엄 상태 확인 (실제 구현에서는 결제 상태를 확인)
          // 현재는 로그인한 사용자를 모두 프리미엄으로 간주
          setIsPremium(true);
        } else {
          setIsPremium(false);
        }
      } catch (error) {
        console.warn('인증 상태 확인 실패:', error);
        setIsLoggedIn(false);
        setIsPremium(false);
      }
    };

    checkAuthStatus();

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setIsPremium(!!session?.user); // 로그인 시 프리미엄으로 간주
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * 기능 제한 정보 가져오기
   */
  const getFeatureLimit = useCallback((feature: FeatureType): FeatureLimit => {
    const limits = FEATURE_LIMITS[feature];
    return {
      type: feature,
      freeLimit: limits.freeLimit,
      premiumLimit: limits.premiumLimit,
      currentCount: 0, // 실제 사용 시에는 현재 카운트를 전달받아야 함
    };
  }, []);

  /**
   * 기능 접근 권한 확인
   */
  const checkFeatureAccess = useCallback(
    (feature: FeatureType, currentCount: number): boolean => {
      const limits = FEATURE_LIMITS[feature];

      if (isLoggedIn && isPremium) {
        // 프리미엄 사용자는 무제한 (premiumLimit이 -1인 경우)
        return limits.premiumLimit === -1 || currentCount < limits.premiumLimit;
      } else {
        // 무료 사용자는 제한 적용
        return currentCount < limits.freeLimit;
      }
    },
    [isLoggedIn, isPremium],
  );

  /**
   * 업그레이드 모달 표시
   */
  const showUpgradeModal = useCallback(
    (feature: FeatureType, currentCount: number, limit: number) => {
      setUpgradeModal({
        isOpen: true,
        featureType: feature,
        currentCount,
        limit,
      });
    },
    [],
  );

  /**
   * 업그레이드 모달 닫기
   */
  const closeUpgradeModal = useCallback(() => {
    setUpgradeModal(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  /**
   * 기능 사용 시도 (가드 함수)
   */
  const guardFeature = useCallback(
    (feature: FeatureType, currentCount: number): boolean => {
      const hasAccess = checkFeatureAccess(feature, currentCount);

      if (!hasAccess) {
        const limits = FEATURE_LIMITS[feature];
        showUpgradeModal(feature, currentCount, limits.freeLimit);
        return false;
      }

      return true;
    },
    [checkFeatureAccess, showUpgradeModal],
  );

  return {
    // 상태
    isLoggedIn,
    isPremium,
    upgradeModal,

    // 액션
    checkFeatureAccess,
    showUpgradeModal,
    closeUpgradeModal,

    // 유틸리티
    getFeatureLimit,
    guardFeature,
  };
};
