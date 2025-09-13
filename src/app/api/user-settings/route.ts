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

  console.log("🔍 Service Role 클라이언트 생성 중...");
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

    console.log("🔍 API GET - 사용자 ID:", userId);

    // Service Role 클라이언트로 직접 데이터 조회
    const { data, error } = await serviceRoleClient
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    console.log("🔍 Service Role 쿼리 결과 - data:", data, "error:", error);

    if (error) {
      console.error("Service Role 데이터 조회 실패:", error);
      if (error.code === "PGRST116") {
        console.log("🔍 사용자 설정이 없음, 기본 설정 반환");
        return NextResponse.json({
          success: true,
          data: {
            theme: "light",
            language: "ko",
            timezone: "Asia/Seoul",
            notifications: { email: true, push: true, sms: false },
            privacy_settings: { profile_public: false, data_sharing: false },
          },
        });
      }
      throw error;
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Service Role 클라이언트 생성 (RLS 우회)
    const serviceRoleClient = createServiceRoleClient();

    // URL에서 사용자 ID 가져오기
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user-id";

    console.log("🔍 API PUT - 사용자 ID:", userId);

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
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    console.log("🔍 Service Role 업데이트 결과 - data:", data, "error:", error);

    if (error) {
      console.error("Service Role 데이터 업데이트 실패:", error);
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
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user settings" },
      { status: 500 }
    );
  }
}
