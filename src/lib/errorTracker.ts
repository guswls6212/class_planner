/**
 * 에러 추적 및 모니터링 시스템
 *
 * 기능:
 * - 에러 분류 및 카테고리화
 * - 에러 발생 빈도 추적
 * - 알림 시스템 (향후 확장)
 * - 에러 패턴 분석
 */

import { LogContext, logger } from "./logger";

export enum ErrorCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  DATABASE = "database",
  NETWORK = "network",
  BUSINESS_LOGIC = "business_logic",
  EXTERNAL_API = "external_api",
  SYSTEM = "system",
  UNKNOWN = "unknown",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface ErrorDetails {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  context?: LogContext;
  metadata?: Record<string, any>;
  stackTrace?: string;
  userId?: string;
  endpoint?: string;
  timestamp: string;
}

class ErrorTracker {
  private errorCounts: Map<string, number> = new Map();
  private recentErrors: ErrorDetails[] = [];
  private readonly maxRecentErrors = 100;

  /**
   * 에러를 추적하고 로깅합니다.
   */
  trackError(
    error: Error,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    const errorKey = `${category}:${error.name}:${error.message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    const errorDetails: ErrorDetails = {
      category,
      severity,
      code: error.name,
      context,
      metadata,
      stackTrace: error.stack,
      userId: context?.userId,
      endpoint: context?.endpoint,
      timestamp: new Date().toISOString(),
    };

    // 최근 에러 목록에 추가
    this.recentErrors.unshift(errorDetails);
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.pop();
    }

    // 로깅
    logger.error(`Error Tracked: ${error.message}`, context, error, {
      category,
      severity,
      errorCount: count + 1,
      ...metadata,
    });

    // 심각한 에러에 대한 추가 처리
    if (severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(errorDetails);
    }

    // 에러 빈도가 높은 경우 경고
    if (count > 0 && count % 10 === 0) {
      logger.warn(`Frequent Error Detected: ${errorKey}`, context, {
        errorCount: count + 1,
        category,
        severity,
      });
    }
  }

  /**
   * 심각한 에러 처리
   */
  private handleCriticalError(errorDetails: ErrorDetails): void {
    logger.error("Critical Error Detected", errorDetails.context, undefined, {
      category: errorDetails.category,
      severity: errorDetails.severity,
      code: errorDetails.code,
      endpoint: errorDetails.endpoint,
      userId: errorDetails.userId,
    });

    // 향후 알림 시스템 연동 가능
    // await this.sendAlert(errorDetails);
  }

  /**
   * 에러 통계 조회
   */
  getErrorStats(): {
    totalErrors: number;
    errorCounts: Array<{ key: string; count: number }>;
    recentErrors: ErrorDetails[];
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
  } {
    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;

    // 카테고리별 통계
    Object.values(ErrorCategory).forEach((category) => {
      errorsByCategory[category] = 0;
    });

    Object.values(ErrorSeverity).forEach((severity) => {
      errorsBySeverity[severity] = 0;
    });

    this.recentErrors.forEach((error) => {
      errorsByCategory[error.category]++;
      errorsBySeverity[error.severity]++;
    });

    return {
      totalErrors: this.recentErrors.length,
      errorCounts: Array.from(this.errorCounts.entries()).map(
        ([key, count]) => ({
          key,
          count,
        })
      ),
      recentErrors: this.recentErrors.slice(0, 20), // 최근 20개만 반환
      errorsByCategory,
      errorsBySeverity,
    };
  }

  /**
   * 에러 패턴 분석
   */
  analyzeErrorPatterns(): {
    mostFrequentErrors: Array<{ key: string; count: number }>;
    errorTrends: Record<string, number>;
    criticalErrors: ErrorDetails[];
  } {
    const mostFrequentErrors = Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));

    const errorTrends: Record<string, number> = {};
    this.recentErrors.forEach((error) => {
      const hour = new Date(error.timestamp).getHours();
      errorTrends[hour] = (errorTrends[hour] || 0) + 1;
    });

    const criticalErrors = this.recentErrors.filter(
      (error) => error.severity === ErrorSeverity.CRITICAL
    );

    return {
      mostFrequentErrors,
      errorTrends,
      criticalErrors,
    };
  }

  /**
   * 에러 카운트 리셋 (테스트용)
   */
  reset(): void {
    this.errorCounts.clear();
    this.recentErrors = [];
  }
}

// 싱글톤 인스턴스
export const errorTracker = new ErrorTracker();

// 편의 함수들
export const trackError = (
  error: Error,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: LogContext,
  metadata?: Record<string, any>
) => errorTracker.trackError(error, category, severity, context, metadata);

// 특정 에러 타입별 추적 함수들
export const trackAuthError = (
  error: Error,
  context?: LogContext,
  metadata?: Record<string, any>
) =>
  trackError(
    error,
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.HIGH,
    context,
    metadata
  );

export const trackValidationError = (
  error: Error,
  context?: LogContext,
  metadata?: Record<string, any>
) =>
  trackError(
    error,
    ErrorCategory.VALIDATION,
    ErrorSeverity.MEDIUM,
    context,
    metadata
  );

export const trackDatabaseError = (
  error: Error,
  context?: LogContext,
  metadata?: Record<string, any>
) =>
  trackError(
    error,
    ErrorCategory.DATABASE,
    ErrorSeverity.HIGH,
    context,
    metadata
  );

export const trackSystemError = (
  error: Error,
  context?: LogContext,
  metadata?: Record<string, any>
) =>
  trackError(
    error,
    ErrorCategory.SYSTEM,
    ErrorSeverity.CRITICAL,
    context,
    metadata
  );
