import { ServiceFactory } from "@/application/services/ServiceFactory";
import { logger } from "@/lib/logger";
import { trackDatabaseError } from "@/lib/errorTracker";
// import { validateUserAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Create a function to get the subject service (for testing purposes)
export function getSubjectService() {
  // 새로운 ServiceFactory 사용 (RepositoryRegistry 자동 초기화됨)
  return ServiceFactory.createSubjectService();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Subject ID is required" },
        { status: 400 }
      );
    }

    const subject = await getSubjectService().getSubjectById(id);

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "Subject not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subject });
  } catch (error) {
    logger.error("Error fetching subject:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subject" },
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
        { success: false, error: "Subject ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // 간단한 userId 추출 (실제 프로젝트에서는 적절한 인증 로직 사용)
    const userId = "default-user-id";
    const updatedSubject = await getSubjectService().updateSubject(id, {
      name,
      color,
    }, userId);

    return NextResponse.json({
      success: true,
      data: updatedSubject,
      message: "Subject updated successfully",
    });
  } catch (error) {
    logger.error("Error updating subject:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to update subject" },
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
    logger.error("Error deleting subject:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}

