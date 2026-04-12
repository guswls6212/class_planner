import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export function getEnrollmentService() {
  return ServiceFactory.createEnrollmentService();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const academyId = await resolveAcademyId(userId);
    const enrollments = await getEnrollmentService().getAllEnrollments(academyId);
    return NextResponse.json({ success: true, data: enrollments });
  } catch (error) {
    logger.error("Error fetching enrollments:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, subjectId } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!studentId || !subjectId) {
      return NextResponse.json(
        { success: false, error: "studentId and subjectId are required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const academyId = await resolveAcademyId(userId);
    const newEnrollment = await getEnrollmentService().addEnrollment(
      { studentId, subjectId },
      academyId
    );
    return NextResponse.json(
      { success: true, data: newEnrollment },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error adding enrollment:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to add enrollment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Enrollment ID is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // userId는 권한 확인용 (resolveAcademyId로 academy 검증)
    await resolveAcademyId(userId);
    await getEnrollmentService().deleteEnrollment(id);
    return NextResponse.json({
      success: true,
      message: "Enrollment deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting enrollment:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to delete enrollment" },
      { status: 500 }
    );
  }
}
