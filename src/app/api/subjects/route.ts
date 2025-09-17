import { ServiceFactory } from "@/application/services/ServiceFactory";
import { logger } from "@/lib/logger";
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

// Create a function to get the subject service (for testing purposes)
export function getSubjectService() {
  // 새로운 ServiceFactory 사용 (RepositoryRegistry 자동 초기화됨)
  return ServiceFactory.createSubjectService();
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
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();

    logger.debug("Service Role 쿼리 결과", { data, error });

    if (error) {
      logger.error("Service Role 데이터 조회 실패:", undefined, error);
      if (error.code === "PGRST116") {
        logger.debug("사용자 데이터가 없음, 빈 과목 목록 반환");
        return NextResponse.json(
          { success: true, data: [] },
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
    const subjects = userData?.subjects || [];

    return NextResponse.json(
      { success: true, data: subjects },
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
    logger.error("Error fetching subjects:", undefined, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subjects" },
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

export async function POST(request: NextRequest) {
  try {
    // CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    const body = await request.json();
    const { name, color } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!name || !color) {
      return NextResponse.json(
        { success: false, error: "Name and color are required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const newSubject = await getSubjectService().addSubject(
      { name, color },
      userId
    );
    return NextResponse.json(
      { success: true, data: newSubject },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error adding subject:", undefined, error);
    return NextResponse.json(
      { success: false, error: "Failed to add subject" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    const body = await request.json();
    const { id, name, color } = body;

    if (!id || !name || !color) {
      return NextResponse.json(
        { success: false, error: "ID, name and color are required" },
        { status: 400 }
      );
    }

    const updatedSubject = await getSubjectService().updateSubject(id, {
      name,
      color,
    });
    return NextResponse.json({ success: true, data: updatedSubject });
  } catch (error) {
    logger.error("Error updating subject:", undefined, error);
    return NextResponse.json(
      { success: false, error: "Failed to update subject" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Subject ID is required" },
        { status: 400 }
      );
    }

    await getSubjectService().deleteSubject(id);
    return NextResponse.json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting subject:", undefined, error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}
