"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Users,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useAttendance } from "../../hooks/useAttendance";
import { useMyRole } from "../../hooks/useMyRole";
import { formatLocalISO, getWeekStart } from "../../lib/dateUtils";
import type { Session } from "../../lib/planner";
import { weekdays } from "../../lib/planner";
import { useHiddenRedirect } from "../../hooks/useHiddenRedirect";

const AttendanceSheet = dynamic(
  () => import("../../components/molecules/AttendanceSheet"),
  { ssr: false },
);

/**
 * 출결 dedicated 페이지 — phase1-release-readiness rank 6 (발견성).
 *
 * mockup: /strategy/discoverability-attendance-recovery § A1.
 * 본 페이지 = "오늘/이번 주 sessions list + 각 session 클릭 → AttendanceSheet
 * modal" entry point. schedule 페이지 안의 attendance 진입과 같은 UX 단,
 * URL 직접 진입 (북마크) + focus mode (시간표 안 보고 출결만) 가치.
 *
 * 강사 (member role) — sessions.teacher_id 기준 본인 수업만 표시
 * (attendance-permission-fix proposal — image #12 발견 fix).
 *
 * Phase 2 보강 (별도 future-work doc):
 * - 월별/주별 출결 view (학생별 출결률)
 * - 결석 alert (3회 연속 결석 학생)
 * - 출결 CSV export
 * - 학생 detail/list 출결 stat
 *
 * 상세: class-planner/docs/future-work/attendance-phase2-enhancements.md
 */
export default function AttendancePage() {
  const hidden = useHiddenRedirect("attendance");
  if (hidden) return null;
  return <AttendancePageInner />;
}

function AttendancePageInner() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const {
    data: { students, subjects, sessions, enrollments, teachers },
  } = useIntegratedDataLocal();
  const { attendance, fetchAttendance, markAttendance, markAllPresent } =
    useAttendance(userId);
  const { role } = useMyRole();
  const isMember = role === "member";

  // 강사 (member) 의 teacher_id — sessions.teacher_id 매칭용 (본인 수업 filter)
  const myTeacherId = useMemo(() => {
    if (!isMember) return null;
    if (typeof window === "undefined") return null;
    const localUserId = localStorage.getItem("supabase_user_id");
    if (!localUserId) return null;
    return teachers.find((t) => t.userId === localUserId)?.id ?? null;
  }, [teachers, isMember]);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(
    null,
  );

  const dateISO = formatLocalISO(selectedDate);
  const weekStartISO = formatLocalISO(getWeekStart(selectedDate));
  // JS getDay() = 0=일, 1=월... session.weekday = 0=월, 1=화... 변환
  const sessionWeekday = (selectedDate.getDay() + 6) % 7;

  const daySessions = useMemo(() => {
    return sessions
      .filter(
        (s) =>
          s.weekday === sessionWeekday && s.weekStartDate === weekStartISO,
      )
      // 강사 (member) 본인 수업만 — 다른 강사 수업 노출 차단
      .filter((s) => !isMember || s.teacherId === myTeacherId)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [sessions, sessionWeekday, weekStartISO, isMember, myTeacherId]);

  const getSessionStudents = (s: Session) => {
    const eIds = s.enrollmentIds ?? [];
    const studentIds = enrollments
      .filter((e) => eIds.includes(e.id))
      .map((e) => e.studentId);
    return students.filter((st) => studentIds.includes(st.id));
  };

  const getSubjectName = (s: Session): string => {
    if (!s.subjectId) {
      // 그룹 수업: enrollments 의 첫 enrollment 의 subject 추정
      const firstEnrollment = (s.enrollmentIds ?? [])
        .map((eid) => enrollments.find((e) => e.id === eid))
        .find(Boolean);
      if (firstEnrollment) {
        const sub = subjects.find((sub) => sub.id === firstEnrollment.subjectId);
        if (sub) return sub.name;
      }
      return "?";
    }
    return subjects.find((sub) => sub.id === s.subjectId)?.name ?? "?";
  };

  const activeSession = daySessions.find((s) => s.id === attendanceSessionId);
  const activeStudents = activeSession ? getSessionStudents(activeSession) : [];

  // active session 의 attendance fetch
  useEffect(() => {
    if (activeSession && userId) {
      void fetchAttendance(activeSession.id, dateISO);
    }
  }, [activeSession?.id, dateISO, userId, fetchAttendance, activeSession]);

  const goPrev = () =>
    setSelectedDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() - 1);
      return n;
    });
  const goNext = () =>
    setSelectedDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + 1);
      return n;
    });
  const goToday = () => setSelectedDate(new Date());

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" data-testid="attendance-page">
      <header className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            출결
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            날짜별 수업 출결 입력. 시간표 페이지의 출결 인터랙션과 동일.
          </p>
        </div>
      </header>

      {/* Date navigation */}
      <div className="mb-4 flex items-center gap-2 bg-[var(--color-bg-secondary)] rounded-lg p-3">
        <button
          type="button"
          onClick={goPrev}
          className="p-1.5 hover:bg-[var(--color-overlay-light)] rounded transition-colors"
          aria-label="이전 날짜"
          data-testid="attendance-prev-date"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={goToday}
          className="px-2 py-0.5 text-[11px] rounded border border-[var(--color-border)] hover:bg-[var(--color-overlay-light)] transition-colors"
          data-testid="attendance-today"
        >
          오늘
        </button>
        <div
          className="flex-1 text-center font-medium text-[var(--color-text-primary)]"
          data-testid="attendance-date-label"
        >
          {dateISO} ({weekdays[sessionWeekday]})
        </div>
        <button
          type="button"
          onClick={goNext}
          className="p-1.5 hover:bg-[var(--color-overlay-light)] rounded transition-colors"
          aria-label="다음 날짜"
          data-testid="attendance-next-date"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sessions list */}
      {daySessions.length === 0 ? (
        <div
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-8 text-center space-y-3"
          data-testid="attendance-empty"
        >
          <ClipboardCheck className="w-10 h-10 text-[var(--color-text-muted)] mx-auto opacity-50" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isMember
              ? "이 날짜에 본인 수업이 없어요"
              : "이 날짜에 등록된 수업이 없어요"}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {isMember
              ? "시간표 페이지에서 본인 수업을 확인하세요"
              : "시간표 페이지에서 수업을 먼저 추가하세요"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="attendance-sessions">
          {daySessions.map((s) => {
            const sStudents = getSessionStudents(s);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setAttendanceSessionId(s.id)}
                  className="w-full text-left bg-[var(--color-bg-secondary)] hover:bg-[var(--color-overlay-light)] rounded-lg p-4 flex items-center gap-4 transition-colors"
                  data-testid={`attendance-session-${s.id}`}
                  aria-label={`${getSubjectName(s)} 출결 입력 (${s.startsAt}-${s.endsAt})`}
                >
                  <div className="flex flex-col items-center text-[11px] font-mono text-[var(--color-text-secondary)] min-w-[60px]">
                    <Clock className="w-3 h-3 mb-0.5" />
                    <span>{s.startsAt}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {s.endsAt}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--color-text-primary)]">
                      {getSubjectName(s)}
                    </div>
                    <div className="text-[12px] text-[var(--color-text-muted)] truncate flex items-center gap-1">
                      <Users className="w-3 h-3 shrink-0" />
                      {sStudents.length > 0
                        ? sStudents.map((st) => st.name).join(", ")
                        : "학생 없음"}
                    </div>
                  </div>
                  <ClipboardCheck className="w-4 h-4 text-amber-400 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {activeSession && (
        <AttendanceSheet
          isOpen={!!activeSession}
          onClose={() => setAttendanceSessionId(null)}
          sessionId={activeSession.id}
          date={dateISO}
          students={activeStudents}
          attendance={attendance[activeSession.id]?.[dateISO] ?? {}}
          onMarkAttendance={(studentId, status) =>
            markAttendance(activeSession.id, studentId, dateISO, status)
          }
          onMarkAllPresent={() =>
            markAllPresent(
              activeSession.id,
              activeStudents.map((st) => st.id),
              dateISO,
            )
          }
        />
      )}
    </div>
  );
}
