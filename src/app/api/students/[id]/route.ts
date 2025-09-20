import { ServiceFactory } from "@/application/services/ServiceFactory";
import { logger } from "@/lib/logger";
import { trackDatabaseError } from "@/lib/errorTracker";
import { NextRequest, NextResponse } from "next/server";

// Create a function to get the student service (for testing purposes)
export function getStudentService() {
  // 새로운 ServiceFactory 사용 (RepositoryRegistry 자동 초기화됨)
  return ServiceFactory.createStudentService();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
        { status: 400 }
      );
    }

    const student = await getStudentService().getStudentById(id);

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: student });
  } catch (error) {
    logger.error("Error fetching student:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch student" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const updatedStudent = await getStudentService().updateStudent(id, {
      name,
    });

    return NextResponse.json({
      success: true,
      data: updatedStudent,
      message: "Student updated successfully",
    });
  } catch (error) {
    logger.error("Error updating student:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to update student" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

