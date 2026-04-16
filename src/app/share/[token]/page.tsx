"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import TimeTableGrid from "@/components/organisms/TimeTableGrid";
import type { Session, Student, Subject, Enrollment, Teacher } from "@/lib/planner";

interface ShareData {
  academyName: string;
  label: string | null;
  sessions: RawSession[];
  students: RawStudent[];
  subjects: RawSubject[];
  enrollments: RawEnrollment[];
  teachers: RawTeacher[];
}

interface RawSession {
  id: string;
  enrollment_ids?: string[];
  weekday: number;
  starts_at: string;
  ends_at: string;
  room?: string;
  y_position?: number;
  teacher_id?: string;
}

interface RawStudent {
  id: string;
  name: string;
  gender?: string;
  birth_date?: string;
  grade?: string;
  school?: string;
  phone?: string;
}

interface RawSubject {
  id: string;
  name: string;
  color?: string;
}

interface RawEnrollment {
  id: string;
  student_id: string;
  subject_id: string;
}

interface RawTeacher {
  id: string;
  name: string;
  color: string;
  user_id?: string | null;
}

function mapSessions(raw: RawSession[]): Session[] {
  return raw.map((s) => ({
    id: s.id,
    enrollmentIds: s.enrollment_ids ?? [],
    weekday: s.weekday,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    room: s.room,
    yPosition: s.y_position,
    teacherId: s.teacher_id,
  }));
}

function buildSessionMap(sessions: Session[]): Map<number, Session[]> {
  return sessions
    .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""))
    .reduce((acc, s) => {
      const list = acc.get(s.weekday) ?? [];
      list.push(s);
      acc.set(s.weekday, list);
      return acc;
    }, new Map<number, Session[]>());
}

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error ?? "링크를 불러올 수 없습니다.");
        }
      })
      .catch(() => setError("서버 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[--color-text-secondary]">불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <p className="text-lg font-semibold text-[--color-text-primary]">
          시간표를 불러올 수 없습니다
        </p>
        <p className="text-sm text-[--color-text-secondary]">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const sessions = mapSessions(data.sessions);
  const sessionMap = buildSessionMap(sessions);

  const students: Student[] = data.students.map((s) => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    birthDate: s.birth_date,
    grade: s.grade,
    school: s.school,
    phone: s.phone,
  }));

  const subjects: Subject[] = data.subjects.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
  }));

  const enrollments: Enrollment[] = data.enrollments.map((e) => ({
    id: e.id,
    studentId: e.student_id,
    subjectId: e.subject_id,
  }));

  const teachers: Teacher[] = data.teachers.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    userId: t.user_id,
  }));

  return (
    <div className="p-4">
      <div className="mb-4 border-b border-[--color-border] pb-3">
        <h2 className="text-2xl font-semibold text-[--color-text-primary]">
          {data.academyName}
        </h2>
        {data.label && (
          <p className="mt-1 text-sm text-[--color-text-secondary]">{data.label}</p>
        )}
      </div>

      <div data-surface="surface">
        <TimeTableGrid
          sessions={sessionMap}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          teachers={teachers}
          colorBy="student"
          isReadOnly={true}
          onSessionClick={() => {}}
          onDrop={() => {}}
          onEmptySpaceClick={() => {}}
        />
      </div>
    </div>
  );
}
