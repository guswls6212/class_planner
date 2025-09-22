/**
 * Vercel 환경에 최적화된 로깅 시스템
 *
 * 특징:
 * - 구조화된 JSON 로그 출력
 * - 환경별 로그 레벨 제어
 * - Vercel Functions 로그 최적화
 * - 성능 모니터링 지원
 */

import { getKSTTime } from "./timeUtils";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";

    // 환경별 로그 레벨 설정
    this.logLevel = this.isDevelopment
      ? LogLevel.DEBUG
      : (process.env.LOG_LEVEL as unknown as LogLevel) || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, any>
  ): LogEntry {
    const logEntry: LogEntry = {
      timestamp: getKSTTime(),
      level,
      message,
    };

    if (context) {
      logEntry.context = context;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined, // 프로덕션에서는 스택 트레이스 제외
      };
    }

    if (metadata) {
      logEntry.metadata = metadata;
    }

    return logEntry;
  }

  private output(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatLog(level, message, context, error, metadata);

    // Vercel Functions에서는 console.log가 자동으로 로그 시스템에 전송됨
    if (this.isDevelopment) {
      // 개발 환경: 가독성 좋은 포맷
      const levelName = LogLevel[level];
      const contextStr = context
        ? ` | Context: ${JSON.stringify(context)}`
        : "";
      const errorStr = error ? ` | Error: ${error.message}` : "";
      const metadataStr = metadata
        ? ` | Metadata: ${JSON.stringify(metadata)}`
        : "";

      console.log(
        `[${logEntry.timestamp}] ${levelName}: ${message}${contextStr}${errorStr}${metadataStr}`
      );
    } else {
      // 프로덕션 환경: JSON 포맷 (구조화된 로그)
      console.log(JSON.stringify(logEntry));
    }
  }

  // 공개 메서드들
  error(
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, any>
  ): void {
    this.output(LogLevel.ERROR, message, context, error, metadata);
  }

  warn(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.output(LogLevel.WARN, message, context, undefined, metadata);
  }

  info(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.output(LogLevel.INFO, message, context, undefined, metadata);
  }

  debug(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.output(LogLevel.DEBUG, message, context, undefined, metadata);
  }

  // API 요청 로깅 전용 메서드
  apiRequest(
    method: string,
    endpoint: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.info(
      `API Request: ${method} ${endpoint}`,
      {
        ...context,
        method,
        endpoint,
      },
      metadata
    );
  }

  apiResponse(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.output(
      level,
      `API Response: ${method} ${endpoint} - ${statusCode}`,
      {
        ...context,
        method,
        endpoint,
        statusCode,
        duration,
      },
      undefined,
      metadata
    );
  }

  // 성능 모니터링 전용 메서드
  performance(
    operation: string,
    duration: number,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.info(
      `Performance: ${operation}`,
      {
        ...context,
        operation,
        duration,
      },
      metadata
    );
  }

  // 보안 이벤트 전용 메서드
  security(
    event: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.warn(`Security Event: ${event}`, context, metadata);
  }

  // 비즈니스 로직 전용 메서드
  business(
    event: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.info(`Business Event: ${event}`, context, metadata);
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 편의 함수들
export const logError = (
  message: string,
  context?: LogContext,
  error?: Error,
  metadata?: Record<string, any>
) => logger.error(message, context, error, metadata);

export const logWarn = (
  message: string,
  context?: LogContext,
  metadata?: Record<string, any>
) => logger.warn(message, context, metadata);

export const logInfo = (
  message: string,
  context?: LogContext,
  metadata?: Record<string, any>
) => logger.info(message, context, metadata);

export const logDebug = (
  message: string,
  context?: LogContext,
  metadata?: Record<string, any>
) => logger.debug(message, context, metadata);

export const logApiRequest = (
  method: string,
  endpoint: string,
  context?: LogContext,
  metadata?: Record<string, any>
) => logger.apiRequest(method, endpoint, context, metadata);

export const logApiResponse = (
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  context?: LogContext,
  metadata?: Record<string, any>
) =>
  logger.apiResponse(method, endpoint, statusCode, duration, context, metadata);

export const logPerformance = (
  operation: string,
  duration: number,
  context?: LogContext,
  metadata?: Record<string, any>
) => logger.performance(operation, duration, context, metadata);

export const logSecurity = (
  event: string,
  context?: LogContext,
  metadata?: Record<string, any>
) => logger.security(event, context, metadata);

export const logBusiness = (
  event: string,
  context?: LogContext,
  metadata?: Record<string, any>
) => logger.business(event, context, metadata);
