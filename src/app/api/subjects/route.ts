import { SubjectApplicationServiceImpl } from "@/application/services/SubjectApplicationService";
import { createSubjectRepository } from "@/infrastructure/RepositoryFactory";
import { NextRequest, NextResponse } from "next/server";

const subjectService = new SubjectApplicationServiceImpl(
  createSubjectRepository()
);

export async function GET(request: NextRequest) {
  try {
    const subjects = await subjectService.getAllSubjects();
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

    if (!name || !color) {
      return NextResponse.json(
        { success: false, error: "Name and color are required" },
        { status: 400 }
      );
    }

    const newSubject = await subjectService.addSubject({ name, color });
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

    const updatedSubject = await subjectService.updateSubject(id, {
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

    await subjectService.deleteSubject(id);
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
