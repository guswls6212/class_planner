import { corsMiddleware, handleCorsOptions } from "@/middleware/cors";
import { NextRequest, NextResponse } from "next/server";

/**
 * API Routes에 보안 미들웨어를 적용하는 유틸리티 함수
 */
export function withSecurity<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;

    // CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    // 원본 핸들러 실행
    return handler(...args);
  };
}

/**
 * OPTIONS 요청을 처리하는 함수
 */
export function handleOptions() {
  return async (request: NextRequest) => {
    return handleCorsOptions(request);
  };
}

/**
 * 보안 헤더를 추가하는 함수
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}
