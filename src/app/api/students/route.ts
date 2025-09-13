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

// Create a function to get the student service (for testing purposes)
export function getStudentService() {
  // 새로운 ServiceFactory 사용 (RepositoryRegistry 자동 초기화됨)
  return ServiceFactory.createStudentService();
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
        console.log("🔍 사용자 데이터가 없음, 빈 학생 목록 반환");
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    const userData = data?.data;
    const students = userData?.students || [];

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body; // gender 필드 완전 제거
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const newStudent = await getStudentService().addStudent({ name }, userId);
    return NextResponse.json(
      { success: true, data: newStudent },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding student:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add student" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body; // gender 필드 완전 제거

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: "ID and name are required" },
        { status: 400 }
      );
    }

    const updatedStudent = await getStudentService().updateStudent(id, {
      name,
    });
    return NextResponse.json({ success: true, data: updatedStudent });
  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update student" },
      { status: 500 }
    );
  }
}
