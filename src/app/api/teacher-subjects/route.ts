import { getTeacherService } from "@/lib/server/teacherServiceFactory";
import { toErrorResponse } from "@/lib/errors";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { requireOwnTeacher } from "@/lib/auth/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const teacherId = searchParams.get("teacherId");
    if (!userId || !teacherId) {
      return NextResponse.json({ success: false, error: "userId and teacherId are required" }, { status: 400 });
    }
    await resolveAcademyId(userId);
    const subjectIds = await getTeacherService().getTeacherSubjects(teacherId);
    return NextResponse.json({ success: true, data: subjectIds });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, subjectId } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId || !teacherId || !subjectId) {
      return NextResponse.json({ success: false, error: "userId, teacherId, subjectId required" }, { status: 400 });
    }

    const { role, academyId } = await resolveAcademyMembership(userId);
    if (role === "member") {
      await requireOwnTeacher(userId, teacherId);
    } else if (!["owner", "admin"].includes(role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await getTeacherService().addTeacherSubject(teacherId, subjectId, academyId);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, subjectId } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId || !teacherId || !subjectId) {
      return NextResponse.json({ success: false, error: "userId, teacherId, subjectId required" }, { status: 400 });
    }

    const { role } = await resolveAcademyMembership(userId);
    if (role === "member") {
      await requireOwnTeacher(userId, teacherId);
    } else if (!["owner", "admin"].includes(role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await getTeacherService().removeTeacherSubject(teacherId, subjectId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "GET, POST, DELETE, OPTIONS" } });
}
