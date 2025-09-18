/**
 * 사용자 행동 추적 훅
 *
 * 특징:
 * - 사용자 행동 추적 (클릭, 네비게이션, 폼 제출 등)
 * - 에러 추적 및 보고
 * - 성능 메트릭 수집
 * - Vercel 로그 시스템과 연동
 */

import { LogContext, logger } from "@/lib/logger";
import { useCallback } from "react";

export interface UserAction {
  action: string;
  element?: string;
  page?: string;
  data?: Record<string, any>;
  timestamp?: string;
}

export interface ErrorInfo {
  error: Error;
  componentStack?: string;
  errorBoundary?: string;
  userId?: string;
  userAgent?: string;
}

class UserTracker {
  private userId: string | null = null;
  private sessionId: string;
  private startTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();

    // 페이지 로드 시 세션 시작 로깅
    this.trackPageLoad();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getContext(): LogContext {
    return {
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  setUserId(userId: string) {
    this.userId = userId;
    logger.business("사용자 로그인", this.getContext());
  }

  clearUserId() {
    const context = this.getContext();
    logger.business("사용자 로그아웃", context);
    this.userId = null;
  }

  trackPageLoad() {
    const context = this.getContext();
    logger.business("페이지 로드", context, {
      page:
        typeof window !== "undefined" ? window.location.pathname : undefined,
      referrer: typeof window !== "undefined" ? document.referrer : undefined,
    });
  }

  trackPageView(page: string) {
    const context = this.getContext();
    logger.business("페이지 뷰", context, {
      page,
      previousPage:
        typeof window !== "undefined" ? document.referrer : undefined,
    });
  }

  trackUserAction(
    action: string,
    element?: string,
    data?: Record<string, any>
  ) {
    const context = this.getContext();
    logger.business("사용자 액션", context, {
      action,
      element,
      data,
    });
  }

  trackFormSubmit(formName: string, data?: Record<string, any>) {
    const context = this.getContext();
    logger.business("폼 제출", context, {
      formName,
      data: data ? this.sanitizeData(data) : undefined,
    });
  }

  trackError(error: Error, componentStack?: string, errorBoundary?: string) {
    const context = this.getContext();
    logger.error("클라이언트 에러", context, error, {
      componentStack,
      errorBoundary,
      errorType: error.name,
    });
  }

  trackPerformance(
    operation: string,
    duration: number,
    data?: Record<string, any>
  ) {
    const context = this.getContext();
    logger.performance(operation, duration, context, data);
  }

  trackSecurityEvent(event: string, data?: Record<string, any>) {
    const context = this.getContext();
    logger.security(event, context, data);
  }

  // 민감한 데이터 제거
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ["password", "token", "key", "secret", "auth"];
    const sanitized = { ...data };

    Object.keys(sanitized).forEach((key) => {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        sanitized[key] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  // 세션 종료 시 로깅
  trackSessionEnd() {
    const duration = Date.now() - this.startTime;
    const context = this.getContext();
    logger.business("세션 종료", context, {
      sessionDuration: duration,
    });
  }
}

// 전역 인스턴스
const userTracker = new UserTracker();

// 페이지 언로드 시 세션 종료 로깅
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    userTracker.trackSessionEnd();
  });
}

export const useUserTracking = () => {
  // 사용자 ID 설정
  const setUserId = useCallback((userId: string) => {
    userTracker.setUserId(userId);
  }, []);

  // 사용자 ID 제거
  const clearUserId = useCallback(() => {
    userTracker.clearUserId();
  }, []);

  // 페이지 뷰 추적
  const trackPageView = useCallback((page: string) => {
    userTracker.trackPageView(page);
  }, []);

  // 사용자 액션 추적
  const trackAction = useCallback(
    (action: string, element?: string, data?: Record<string, any>) => {
      userTracker.trackUserAction(action, element, data);
    },
    []
  );

  // 폼 제출 추적
  const trackFormSubmit = useCallback(
    (formName: string, data?: Record<string, any>) => {
      userTracker.trackFormSubmit(formName, data);
    },
    []
  );

  // 에러 추적
  const trackError = useCallback(
    (error: Error, componentStack?: string, errorBoundary?: string) => {
      userTracker.trackError(error, componentStack, errorBoundary);
    },
    []
  );

  // 성능 추적
  const trackPerformance = useCallback(
    (operation: string, duration: number, data?: Record<string, any>) => {
      userTracker.trackPerformance(operation, duration, data);
    },
    []
  );

  // 보안 이벤트 추적
  const trackSecurityEvent = useCallback(
    (event: string, data?: Record<string, any>) => {
      userTracker.trackSecurityEvent(event, data);
    },
    []
  );

  return {
    setUserId,
    clearUserId,
    trackPageView,
    trackAction,
    trackFormSubmit,
    trackError,
    trackPerformance,
    trackSecurityEvent,
  };
};

// 편의 함수들
export const trackUserAction = (
  action: string,
  element?: string,
  data?: Record<string, any>
) => {
  userTracker.trackUserAction(action, element, data);
};

export const trackFormSubmit = (
  formName: string,
  data?: Record<string, any>
) => {
  userTracker.trackFormSubmit(formName, data);
};

export const trackError = (
  error: Error,
  componentStack?: string,
  errorBoundary?: string
) => {
  userTracker.trackError(error, componentStack, errorBoundary);
};

export const trackPerformance = (
  operation: string,
  duration: number,
  data?: Record<string, any>
) => {
  userTracker.trackPerformance(operation, duration, data);
};

export const trackSecurityEvent = (
  event: string,
  data?: Record<string, any>
) => {
  userTracker.trackSecurityEvent(event, data);
};
