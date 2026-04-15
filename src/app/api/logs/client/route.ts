import { NextRequest, NextResponse } from "next/server";
import { logger, maskPII } from "@/lib/logger";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { corsMiddleware, handleCorsOptions } from "@/middleware/cors";
import { checkRateLimit } from "@/lib/rateLimit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // CORS
  const corsResponse = corsMiddleware(request);
  if (corsResponse !== null && corsResponse.status !== 200) return corsResponse;

  // Rate limit — IP 기반
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(ip, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  // Payload 파싱
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_JSON" },
      { status: 400 }
    );
  }

  // 필드 검증
  const { level, message, code, context, stack, userId, academyId, url, userAgent } = body;

  if (level !== "error" && level !== "warn") {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", field: "level" },
      { status: 400 }
    );
  }
  if (typeof message !== "string" || message.length === 0 || message.length > 2000) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", field: "message" },
      { status: 400 }
    );
  }
  if (code !== undefined && (typeof code !== "string" || code.length > 128)) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", field: "code" },
      { status: 400 }
    );
  }
  if (context !== undefined && context !== null && typeof context !== "object") {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", field: "context" },
      { status: 400 }
    );
  }
  if (context !== undefined && context !== null) {
    if (JSON.stringify(context).length > 10_240) {
      return NextResponse.json(
        { success: false, error: "INVALID_PAYLOAD", field: "context" },
        { status: 400 }
      );
    }
  }
  if (stack !== undefined && (typeof stack !== "string" || stack.length > 16_384)) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", field: "stack" },
      { status: 400 }
    );
  }
  if (url !== undefined && (typeof url !== "string" || url.length > 2048)) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", field: "url" },
      { status: 400 }
    );
  }
  if (userAgent !== undefined && (typeof userAgent !== "string" || userAgent.length > 2048)) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", field: "userAgent" },
      { status: 400 }
    );
  }

  // UUID 검증 — FK 보호
  const safeUserId = isUUID(userId) ? userId : null;
  const safeAcademyId = isUUID(academyId) ? academyId : null;

  // 서버사이드 PII 마스킹 (클라이언트 마스킹 신뢰 안 함)
  const maskedContext = context != null
    ? (maskPII(context) as Record<string, unknown>)
    : null;
  const maskedStack = typeof stack === "string"
    ? (maskPII(stack) as string)
    : null;

  // Insert
  const client = getServiceRoleClient();
  const { error: dbError } = await client.from("app_logs").insert({
    level,
    source: "client",
    code: typeof code === "string" ? code : null,
    message,
    context: maskedContext,
    user_id: safeUserId,
    academy_id: safeAcademyId,
    request_id: crypto.randomUUID(),
    user_agent: typeof userAgent === "string" ? userAgent : null,
    url: typeof url === "string" ? url : null,
    stack: maskedStack,
  });

  if (dbError) {
    logger.error("클라이언트 로그 insert 실패", { endpoint: "/api/logs/client" });
    return NextResponse.json(
      { success: false, error: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export function OPTIONS(request: NextRequest): NextResponse {
  return handleCorsOptions(request);
}
