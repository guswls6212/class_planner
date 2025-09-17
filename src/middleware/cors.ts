import { NextRequest, NextResponse } from "next/server";

// 허용된 도메인 설정
const corsConfig = {
  development: {
    allowedOrigins: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
    ],
  },
  production: {
    allowedOrigins: [
      "https://class-planner.info365.studio",
      "https://www.class-planner.info365.studio",
    ],
  },
};

export function getAllowedOrigins(): string[] {
  const env = process.env.NODE_ENV || "development";
  return corsConfig[env as keyof typeof corsConfig].allowedOrigins;
}

export function corsMiddleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  // 개발 환경에서는 localhost의 모든 포트 허용
  if (process.env.NODE_ENV === "development") {
    const isLocalhost =
      origin &&
      (origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        allowedOrigins.includes(origin));

    if (isLocalhost) {
      return NextResponse.next({
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400", // 24시간
          Vary: "Origin",
        },
      });
    }
  }

  // 프로덕션 환경 또는 개발 환경에서 허용된 도메인인지 확인
  if (origin && allowedOrigins.includes(origin)) {
    return NextResponse.next({
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400", // 24시간
        Vary: "Origin",
      },
    });
  }

  // 허용되지 않은 도메인에서의 요청 차단
  return new NextResponse(
    JSON.stringify({
      error: "CORS policy violation",
      message: "허용되지 않은 도메인에서의 요청입니다.",
      allowedOrigins:
        process.env.NODE_ENV === "development" ? allowedOrigins : undefined,
      currentOrigin: origin,
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

// OPTIONS 요청 처리
export function handleCorsOptions(request: NextRequest) {
  return corsMiddleware(request);
}
