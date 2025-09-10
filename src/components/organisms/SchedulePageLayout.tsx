import type {
  Enrollment,
  Session,
  Student,
  Subject,
} from "@/shared/types/DomainTypes";
import React from "react";

interface SchedulePageLayoutProps {
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  students: Student[];
  loading: boolean;
  error: string | null;
  onAddSession: (session: Omit<Session, "id">) => Promise<boolean>;
  onUpdateSession: (id: string, session: Partial<Session>) => Promise<boolean>;
  onDeleteSession: (id: string) => Promise<boolean>;
  onAddEnrollment: (enrollment: Omit<Enrollment, "id">) => Promise<boolean>;
  onRemoveEnrollment: (id: string) => Promise<boolean>;
  onUpdateEnrollment: (
    id: string,
    enrollment: Partial<Enrollment>
  ) => Promise<boolean>;
  onExportSchedule: () => void;
  onImportSchedule: (file: File) => Promise<void>;
  onClearAllSessions: () => Promise<void>;
}

const SchedulePageLayout: React.FC<SchedulePageLayoutProps> = ({
  sessions,
  enrollments,
  subjects,
  students,
  loading,
  error,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onAddEnrollment,
  onRemoveEnrollment,
  onUpdateEnrollment,
  onExportSchedule,
  onImportSchedule,
  onClearAllSessions,
}) => {
  return (
    <div
      data-testid="schedule-page"
      className="schedule-page"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: "16px",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>시간표 관리</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onExportSchedule}>내보내기</button>
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportSchedule(file);
            }}
          />
          <button onClick={onClearAllSessions}>전체 삭제</button>
        </div>
      </div>

      {loading && <div>로딩 중...</div>}
      {error && <div style={{ color: "red" }}>에러: {error}</div>}

      <div style={{ flex: 1, display: "flex", gap: "16px" }}>
        <div
          style={{ width: "300px", border: "1px solid #ccc", padding: "16px" }}
        >
          <h3>학생 목록</h3>
          {students.map((student) => (
            <div
              key={student.id}
              style={{
                padding: "8px",
                border: "1px solid #eee",
                margin: "4px 0",
              }}
            >
              {student.name} ({student.gender})
            </div>
          ))}
        </div>

        <div style={{ flex: 1, border: "1px solid #ccc", padding: "16px" }}>
          <h3>시간표</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(24, 1fr)",
              gap: "2px",
            }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #eee",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                {i + 9}:00
              </div>
            ))}
          </div>

          <div style={{ marginTop: "16px" }}>
            <h4>세션 목록</h4>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  padding: "8px",
                  border: "1px solid #eee",
                  margin: "4px 0",
                }}
              >
                <div>
                  과목:{" "}
                  {subjects.find((s) => s.id === session.subjectId)?.name ||
                    "Unknown"}
                </div>
                <div>
                  시간: {session.startsAt} - {session.endsAt}
                </div>
                <div>수강생: {session.enrollmentIds.length}명</div>
                <button onClick={() => onDeleteSession(session.id)}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { SchedulePageLayout };
export default SchedulePageLayout;
