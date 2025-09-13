import { ServiceFactory } from "@/application/services/ServiceFactory";
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
        console.log("🔍 사용자 데이터가 없음, 빈 과목 목록 반환");
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    const userData = data?.data;
    const subjects = userData?.subjects || [];

    return NextResponse.json({ success: true, data: subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    console.error("Error adding subject:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add subject" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
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
    console.error("Error updating subject:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update subject" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
    console.error("Error deleting subject:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}
