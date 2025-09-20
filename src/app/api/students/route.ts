import { ServiceFactory } from "@/application/services/ServiceFactory";
import { logger } from "@/lib/logger";
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

  logger.debug("Service Role 클라이언트 생성 중");
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default-user-id";

    logger.debug("API GET - 사용자 ID:", { userId });

    const students = await getStudentService().getAllStudents(userId);
    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    logger.error("Error fetching students:", undefined, error as Error);
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
    logger.error("Error adding student:", undefined, error as Error);
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
    logger.error("Error updating student:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to update student" },
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
        { success: false, error: "Student ID is required" },
        { status: 400 }
      );
    }

    await getStudentService().deleteStudent(id);
    return NextResponse.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting student:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
