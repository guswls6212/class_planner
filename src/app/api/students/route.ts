import { StudentApplicationServiceImpl } from "@/application/services/StudentApplicationService";
import { createStudentRepository } from "@/infrastructure/RepositoryFactory";
import { NextRequest, NextResponse } from "next/server";

// Create a function to get the student service (for testing purposes)
export function getStudentService() {
  return new StudentApplicationServiceImpl(createStudentRepository());
}

export async function GET(request: NextRequest) {
  try {
    const students = await getStudentService().getAllStudents();
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
    const { name, gender } = body;

    if (!name || !gender) {
      return NextResponse.json(
        { success: false, error: "Name and gender are required" },
        { status: 400 }
      );
    }

    const newStudent = await getStudentService().addStudent({ name, gender });
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
    const { id, name, gender } = body;

    if (!id || !name || !gender) {
      return NextResponse.json(
        { success: false, error: "ID, name and gender are required" },
        { status: 400 }
      );
    }

    const updatedStudent = await getStudentService().updateStudent(id, {
      name,
      gender,
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
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
