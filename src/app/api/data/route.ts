import { ServiceFactory } from "@/application/services/ServiceFactory";
import { trackDatabaseError } from "@/lib/errorTracker";
import { logger } from "@/lib/logger";
import { getKSTTime } from "@/lib/timeUtils";
import { corsMiddleware, handleCorsOptions } from "@/middleware/cors";
import { withApiLogging } from "@/middleware/logging";
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

  logger.debug("Service Role 클라이언트 생성 중");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const GET = withApiLogging(async (request: NextRequest) => {
  // URL에서 사용자 ID 가져오기 (catch 블록에서도 접근 가능하도록 상위 스코프에 선언)
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "default-user-id";

  try {
    // Service Role 클라이언트 생성 (RLS 우회)
    const serviceRoleClient = createServiceRoleClient();

    logger.info("API GET - 사용자 ID 조회", { userId, endpoint: "/api/data" });

    // Service Role 클라이언트로 직접 데이터 조회
    const { data, error } = await serviceRoleClient
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();

    logger.debug("Service Role 쿼리 결과", {
      userId,
      hasData: !!data,
      hasError: !!error,
    });

    if (error) {
      logger.error("Service Role 데이터 조회 실패", { userId }, error);
      if (error.code === "PGRST116") {
        logger.info("사용자 데이터가 없음, 빈 데이터 반환", { userId });
        return NextResponse.json(
          {
            success: true,
            data: {
              students: [],
              subjects: [],
              sessions: [],
              enrollments: [],
              version: "1.0",
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

    const userData = data?.data;

    if (!userData) {
      return NextResponse.json(
        {
          success: true,
          data: {
            students: [],
            subjects: [],
            sessions: [],
            enrollments: [],
            version: "1.0",
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

    // JSONB 데이터를 구조화하여 반환
    return NextResponse.json(
      {
        success: true,
        data: {
          students: userData.students || [],
          subjects: userData.subjects || [],
          sessions: userData.sessions || [],
          enrollments: userData.enrollments || [],
          version: userData.version || "1.0",
          lastModified: userData.lastModified,
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
    const err = error instanceof Error ? error : new Error(String(error));
    trackDatabaseError(err, { userId, endpoint: "/api/data" });

    logger.error("Error fetching user data", { userId }, err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user data" },
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
});

export async function PUT(request: NextRequest) {
  try {
    // CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    // Service Role 클라이언트 생성 (RLS 우회)
    const serviceRoleClient = createServiceRoleClient();

    // URL에서 사용자 ID 가져오기
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user-id";

    logger.info("API PUT - 사용자 데이터 업데이트", {
      userId,
      endpoint: "/api/data",
    });

    const body = await request.json();
    const { students, subjects, sessions, enrollments } = body;

    // Service Role 클라이언트로 직접 데이터 업데이트
    const userData = {
      students: students || [],
      subjects: subjects || [],
      sessions: sessions || [],
      enrollments: enrollments || [],
      version: "1.0",
      lastModified: getKSTTime(),
    };

    const { data, error } = await serviceRoleClient
      .from("user_data")
      .upsert({
        user_id: userId,
        data: userData,
        updated_at: getKSTTime(),
      })
      .select()
      .single();

    logger.debug("Service Role 업데이트 결과", { data, error });

    if (error) {
      logger.error("Service Role 데이터 업데이트 실패:", undefined, error);
      throw error;
    }

    const updatedData = data?.data;

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: "User data updated successfully",
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    trackDatabaseError(err, { endpoint: "/api/data" });

    logger.error("Error updating user data", { endpoint: "/api/data" }, err);
    return NextResponse.json(
      { success: false, error: "Failed to update user data" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}
