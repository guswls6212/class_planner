/**
 * 성능 모니터링 훅
 *
 * 특징:
 * - 페이지 로딩 시간 측정
 * - API 호출 성능 추적
 * - 사용자 상호작용 응답 시간 측정
 * - 메모리 사용량 모니터링
 * - Vercel 로그 시스템과 연동
 */

import { useCallback, useEffect, useRef } from "react";
import { trackPerformance } from "./useUserTracking";

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiCallTimes: Record<string, number>;
  interactionTimes: Record<string, number>;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    pageLoadTime: 0,
    apiCallTimes: {},
    interactionTimes: {},
  };

  private startTimes: Map<string, number> = new Map();

  // 페이지 로딩 시간 측정
  measurePageLoad() {
    if (typeof window === "undefined") return;

    const startTime = globalThis.performance?.now() || Date.now();

    window.addEventListener("load", () => {
      const loadTime = globalThis.performance?.now() || Date.now() - startTime;
      this.metrics.pageLoadTime = loadTime;

      trackPerformance("page_load", loadTime, {
        url: window.location.href,
        userAgent: globalThis.navigator?.userAgent || "unknown",
      });
    });
  }

  // API 호출 시간 측정 시작
  startApiCall(apiName: string) {
    this.startTimes.set(
      `api_${apiName}`,
      globalThis.performance?.now() || Date.now()
    );
  }

  // API 호출 시간 측정 종료
  endApiCall(apiName: string, success: boolean = true) {
    const startTime = this.startTimes.get(`api_${apiName}`);
    if (!startTime) return;

    const duration = globalThis.performance?.now() || Date.now() - startTime;
    this.metrics.apiCallTimes[apiName] = duration;
    this.startTimes.delete(`api_${apiName}`);

    trackPerformance("api_call", duration, {
      apiName,
      success,
      url: window.location.href,
    });

    // 느린 API 호출 경고 (5초 이상)
    if (duration > 5000) {
      trackPerformance("slow_api_call", duration, {
        apiName,
        success,
        threshold: 5000,
      });
    }
  }

  // 사용자 상호작용 시간 측정 시작
  startInteraction(interactionName: string) {
    this.startTimes.set(
      `interaction_${interactionName}`,
      globalThis.performance?.now() || Date.now()
    );
  }

  // 사용자 상호작용 시간 측정 종료
  endInteraction(interactionName: string) {
    const startTime = this.startTimes.get(`interaction_${interactionName}`);
    if (!startTime) return;

    const duration = globalThis.performance?.now() || Date.now() - startTime;
    this.metrics.interactionTimes[interactionName] = duration;
    this.startTimes.delete(`interaction_${interactionName}`);

    trackPerformance("user_interaction", duration, {
      interactionName,
      url: window.location.href,
    });

    // 느린 상호작용 경고 (1초 이상)
    if (duration > 1000) {
      trackPerformance("slow_interaction", duration, {
        interactionName,
        threshold: 1000,
      });
    }
  }

  // 메모리 사용량 측정
  measureMemoryUsage() {
    if (typeof window === "undefined" || !globalThis.performance || !("memory" in globalThis.performance)) return;

    const memory = (globalThis.performance as any).memory;
    if (memory) {
      const memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };

      this.metrics.memoryUsage = memory.usedJSHeapSize;

      trackPerformance("memory_usage", memory.usedJSHeapSize, {
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        url: window.location.href,
      });

      // 메모리 사용량이 높을 때 경고 (100MB 이상)
      if (memory.usedJSHeapSize > 100 * 1024 * 1024) {
        trackPerformance("high_memory_usage", memory.usedJSHeapSize, {
          threshold: 100 * 1024 * 1024,
          url: window.location.href,
        });
      }
    }
  }

  // 성능 메트릭 가져오기
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // 성능 메트릭 초기화
  resetMetrics() {
    this.metrics = {
      pageLoadTime: 0,
      apiCallTimes: {},
      interactionTimes: {},
    };
    this.startTimes.clear();
  }
}

// 전역 인스턴스
const performanceMonitor = new PerformanceMonitor();

export const usePerformanceMonitoring = () => {
  const monitorRef = useRef(performanceMonitor);

  // 페이지 로딩 시간 측정
  useEffect(() => {
    monitorRef.current.measurePageLoad();
  }, []);

  // 주기적 메모리 사용량 측정 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      monitorRef.current.measureMemoryUsage();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // API 호출 시간 측정 함수들
  const startApiCall = useCallback((apiName: string) => {
    monitorRef.current.startApiCall(apiName);
  }, []);

  const endApiCall = useCallback((apiName: string, success: boolean = true) => {
    monitorRef.current.endApiCall(apiName, success);
  }, []);

  // 사용자 상호작용 시간 측정 함수들
  const startInteraction = useCallback((interactionName: string) => {
    monitorRef.current.startInteraction(interactionName);
  }, []);

  const endInteraction = useCallback((interactionName: string) => {
    monitorRef.current.endInteraction(interactionName);
  }, []);

  // 성능 메트릭 가져오기
  const getMetrics = useCallback(() => {
    return monitorRef.current.getMetrics();
  }, []);

  // 성능 메트릭 초기화
  const resetMetrics = useCallback(() => {
    monitorRef.current.resetMetrics();
  }, []);

  return {
    startApiCall,
    endApiCall,
    startInteraction,
    endInteraction,
    getMetrics,
    resetMetrics,
  };
};

// 편의 함수들
export const measureApiCall = async <T>(
  apiName: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  performanceMonitor.startApiCall(apiName);

  try {
    const result = await apiCall();
    performanceMonitor.endApiCall(apiName, true);
    return result;
  } catch (error) {
    performanceMonitor.endApiCall(apiName, false);
    throw error;
  }
};

export const measureInteraction = async <T>(
  interactionName: string,
  interaction: () => Promise<T>
): Promise<T> => {
  performanceMonitor.startInteraction(interactionName);

  try {
    const result = await interaction();
    performanceMonitor.endInteraction(interactionName);
    return result;
  } catch (error) {
    performanceMonitor.endInteraction(interactionName);
    throw error;
  }
};
