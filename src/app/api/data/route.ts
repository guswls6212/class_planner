import { ServiceFactory } from "@/application/services/ServiceFactory";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a function to get the data service (for testing purposes)
export function getDataService() {
  // 새로운 ServiceFactory 사용 (RepositoryRegistry 자동 초기화됨)
  return ServiceFactory.createDataService();
}

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
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();

    console.log("🔍 Service Role 쿼리 결과 - data:", data, "error:", error);

    if (error) {
      console.error("Service Role 데이터 조회 실패:", error);
      if (error.code === "PGRST116") {
        console.log("🔍 사용자 데이터가 없음, 빈 데이터 반환");
        return NextResponse.json({
          success: true,
          data: {
            students: [],
            subjects: [],
            sessions: [],
            enrollments: [],
            version: "1.0",
          },
        });
      }
      throw error;
    }

    const userData = data?.data;

    if (!userData) {
      return NextResponse.json({
        success: true,
        data: {
          students: [],
          subjects: [],
          sessions: [],
          enrollments: [],
          version: "1.0",
        },
      });
    }

    // JSONB 데이터를 구조화하여 반환
    return NextResponse.json({
      success: true,
      data: {
        students: userData.students || [],
        subjects: userData.subjects || [],
        sessions: userData.sessions || [],
        enrollments: userData.enrollments || [],
        version: userData.version || "1.0",
        lastModified: userData.lastModified,
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user data" },
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
    const { students, subjects, sessions, enrollments } = body;

    // Service Role 클라이언트로 직접 데이터 업데이트
    const userData = {
      students: students || [],
      subjects: subjects || [],
      sessions: sessions || [],
      enrollments: enrollments || [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const { data, error } = await serviceRoleClient
      .from("user_data")
      .upsert({
        user_id: userId,
        data: userData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.log("🔍 Service Role 업데이트 결과 - data:", data, "error:", error);

    if (error) {
      console.error("Service Role 데이터 업데이트 실패:", error);
      throw error;
    }

    const updatedData = data?.data;

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: "User data updated successfully",
    });
  } catch (error) {
    console.error("Error updating user data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user data" },
      { status: 500 }
    );
  }
}
