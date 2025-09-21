import { logger } from "@/lib/logger";
import { getKSTTime } from "@/lib/timeUtils";
import { corsMiddleware, handleCorsOptions } from "@/middleware/cors";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service Role Key를 사용한 Supabase 클라이언트 생성 (RLS 우회)
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase URL 또는 Service Role Key가 설정되지 않았습니다."
    );
  }

  logger.debug("Service Role 클라이언트 생성 중...");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // Service Role 클라이언트 생성 (RLS 우회)
    const serviceRoleClient = createServiceRoleClient();

    // URL에서 사용자 ID 가져오기
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user-id";

    logger.debug("API GET - 사용자 ID:", { userId });

    // Service Role 클라이언트로 직접 데이터 조회
    const { data, error } = await serviceRoleClient
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    logger.debug("Service Role 쿼리 결과", { data, error });

    if (error) {
      logger.error("Service Role 데이터 조회 실패:", undefined, error);
      if (error.code === "PGRST116") {
        logger.debug("사용자 설정이 없음, 기본 설정 반환");
        return NextResponse.json(
          {
            success: true,
            data: {
              theme: "light",
              language: "ko",
              timezone: "Asia/Seoul",
              notifications: { email: true, push: true, sms: false },
              privacy_settings: { profile_public: false, data_sharing: false },
            },
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers":
                "Content-Type, Authorization, X-Requested-With",
            },
          }
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          theme: data.theme || "light",
          language: data.language || "ko",
          timezone: data.timezone || "Asia/Seoul",
          notifications: data.notifications || {
            email: true,
            push: true,
            sms: false,
          },
          privacy_settings: data.privacy_settings || {
            profile_public: false,
            data_sharing: false,
          },
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
        },
      }
    );
  } catch (error) {
    logger.error("Error fetching user settings:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user settings" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
        },
      }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // CORS 검증 (테스트 환경에서는 null 반환 가능)
    const corsResponse = corsMiddleware(request);
    if (corsResponse !== null && corsResponse.status !== 200) {
      return corsResponse;
    }

    // Service Role 클라이언트 생성 (RLS 우회)
    const serviceRoleClient = createServiceRoleClient();

    // URL에서 사용자 ID 가져오기
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user-id";

    logger.debug("API PUT - 사용자 ID:", { userId });

    const body = await request.json();
    const { theme, language, timezone, notifications, privacy_settings } = body;

    // Service Role 클라이언트로 직접 데이터 업데이트 (upsert 대신 update 사용)
    const { data, error } = await serviceRoleClient
      .from("user_settings")
      .update({
        theme: theme || "light",
        language: language || "ko",
        timezone: timezone || "Asia/Seoul",
        notifications: notifications || { email: true, push: true, sms: false },
        privacy_settings: privacy_settings || {
          profile_public: false,
          data_sharing: false,
        },
        updated_at: getKSTTime(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    logger.debug("Service Role 업데이트 결과", { data, error });

    if (error) {
      logger.error("Service Role 데이터 업데이트 실패:", undefined, error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        theme: data.theme,
        language: data.language,
        timezone: data.timezone,
        notifications: data.notifications,
        privacy_settings: data.privacy_settings,
      },
      message: "User settings updated successfully",
    });
  } catch (error) {
    logger.error("Error updating user settings:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to update user settings" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}
