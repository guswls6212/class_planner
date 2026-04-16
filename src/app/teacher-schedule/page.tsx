"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useTeacherDisplaySessions } from "../../hooks/useTeacherDisplaySessions";
import TimeTableGrid from "../../components/organisms/TimeTableGrid";
import { renderSchedulePdf } from "@/lib/pdf/PdfRenderer";

const PDFDownloadButton = dynamic(
  () => import("../../components/molecules/PDFDownloadButton"),
  { ssr: false, loading: () => null }
);

function findMyTeacherId(teachers: Array<{ id: string; userId?: string | null }>): string | null {
  if (typeof window === "undefined") return null;
  const userId = localStorage.getItem("supabase_user_id");
  if (!userId) return null;
  const teacher = teachers.find((t) => t.userId === userId);
  return teacher?.id ?? null;
}

export default function TeacherSchedulePage() {
  const {
    data: { sessions, enrollments, subjects, students, teachers },
  } = useIntegratedDataLocal();

  const myTeacherId = findMyTeacherId(teachers);
  const myTeacher = teachers.find((t) => t.id === myTeacherId) ?? null;

  const { sessions: displaySessions } = useTeacherDisplaySessions(
    sessions,
    enrollments,
    myTeacherId
  );

  const [isDownloading, setIsDownloading] = useState(false);

  return (
    <div style={{ padding: 16 }}>
      <div className="mb-4 flex items-center justify-between border-b border-[--color-border] pb-3">
        <div>
          <h2 className="text-2xl font-semibold text-[--color-text-primary]">
            내 시간표
          </h2>
          {myTeacher ? (
            <p className="mt-1 text-sm text-[--color-text-secondary]">
              {myTeacher.name} 강사의 시간표입니다.
            </p>
          ) : (
            <p className="mt-1 text-sm text-[--color-text-secondary]">
              연결된 강사 정보가 없습니다. 설정에서 계정을 강사와 연결해 주세요.
            </p>
          )}
        </div>
        <PDFDownloadButton
          onDownload={() =>
            renderSchedulePdf(
              Array.from(displaySessions.values()).flat(),
              subjects,
              students,
              enrollments,
              teachers,
              {
                academyName: "CLASS PLANNER",
              }
            )
          }
          isDownloading={isDownloading}
          onDownloadStart={() => setIsDownloading(true)}
          onDownloadEnd={() => setIsDownloading(false)}
        />
      </div>

      <div data-surface="surface">
        <TimeTableGrid
          sessions={displaySessions}
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
