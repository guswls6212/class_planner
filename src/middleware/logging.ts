/**
 * API Routes용 로깅 미들웨어
 *
 * 기능:
 * - 요청/응답 자동 로깅
 * - 성능 측정
 * - 에러 추적
 * - 요청 ID 생성
 */

import { LogContext, logger } from "@/lib/logger";
import { getKSTTime } from "@/lib/timeUtils";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export interface LoggingOptions {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  logHeaders?: boolean;
  excludePaths?: string[];
  includePaths?: string[];
}

const defaultOptions: LoggingOptions = {
  logRequestBody: false, // 기본적으로 요청 본문은 로그하지 않음 (보안)
  logResponseBody: false, // 기본적으로 응답 본문은 로그하지 않음 (성능)
  logHeaders: false, // 기본적으로 헤더는 로그하지 않음 (보안)
  excludePaths: ["/api/health", "/api/metrics"], // 헬스체크는 제외
};

export function createLoggingMiddleware(options: LoggingOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return function loggingMiddleware(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) {
    return async function (
      request: NextRequest,
      context?: any
    ): Promise<NextResponse> {
      const startTime = Date.now();
      const requestId = uuidv4();
      const url = new URL(request.url);
      const pathname = url.pathname;

      // 제외할 경로 확인
      if (config.excludePaths?.some((path) => pathname.startsWith(path))) {
        return handler(request, context);
      }

      // 포함할 경로 확인 (설정된 경우)
      if (
        config.includePaths &&
        !config.includePaths.some((path) => pathname.startsWith(path))
      ) {
        return handler(request, context);
      }

      // 요청 컨텍스트 생성
      const requestContext: LogContext = {
        requestId,
        endpoint: pathname,
        method: request.method,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      };

      // 사용자 ID 추출 (Authorization 헤더에서)
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        try {
          // JWT 토큰에서 사용자 ID 추출 (간단한 예시)
          const token = authHeader.replace("Bearer ", "");
          // 실제로는 JWT 디코딩 로직이 필요
          requestContext.userId = "extracted-from-token";
        } catch (error) {
          // 토큰 파싱 실패는 로그하지 않음
        }
      }

      // 요청 로깅
      const requestMetadata: Record<string, any> = {};

      if (config.logHeaders) {
        requestMetadata.headers = Object.fromEntries(request.headers.entries());
      }

      if (config.logRequestBody && request.method !== "GET") {
        try {
          const body = await request.clone().text();
          if (body) {
            requestMetadata.requestBody = body;
          }
        } catch (error) {
          requestMetadata.requestBodyError = "Failed to read request body";
        }
      }

      logger.apiRequest(
        request.method,
        pathname,
        requestContext,
        requestMetadata
      );

      let response: NextResponse;
      let error: Error | undefined;

      try {
        // 원본 핸들러 실행
        response = await handler(request, context);
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));

        // 에러 로깅
        logger.error(
          `API Error: ${request.method} ${pathname}`,
          requestContext,
          error,
          {
            errorType: error.name,
            errorMessage: error.message,
          }
        );

        // 에러 응답 생성
        response = new NextResponse(
          JSON.stringify({
            error: "Internal Server Error",
            requestId,
            timestamp: getKSTTime(),
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "X-Request-ID": requestId,
            },
          }
        );
      }

      // 응답 시간 계산
      const duration = Date.now() - startTime;

      // 응답 로깅
      const responseMetadata: Record<string, any> = {
        duration,
        statusCode: response.status,
      };

      if (config.logResponseBody && response.status < 400) {
        try {
          const responseBody = await response.clone().text();
          if (responseBody) {
            responseMetadata.responseBody = responseBody;
          }
        } catch (error) {
          responseMetadata.responseBodyError = "Failed to read response body";
        }
      }

      logger.apiResponse(
        request.method,
        pathname,
        response.status,
        duration,
        requestContext,
        responseMetadata
      );

      // 성능 경고
      if (duration > 5000) {
        // 5초 이상
        logger.warn(
          `Slow API Response: ${request.method} ${pathname}`,
          requestContext,
          {
            duration,
            threshold: 5000,
          }
        );
      }

      // 응답에 요청 ID 추가
      response.headers.set("X-Request-ID", requestId);
      response.headers.set("X-Response-Time", `${duration}ms`);

      return response;
    };
  };
}

// 편의 함수들
export const withLogging = createLoggingMiddleware();

export const withDetailedLogging = createLoggingMiddleware({
  logRequestBody: true,
  logResponseBody: true,
  logHeaders: true,
});

export const withMinimalLogging = createLoggingMiddleware({
  logRequestBody: false,
  logResponseBody: false,
  logHeaders: false,
});

// 특정 경로용 로깅 설정
export const withApiLogging = createLoggingMiddleware({
  includePaths: ["/api"],
  logRequestBody: false,
  logResponseBody: false,
  logHeaders: false,
});
