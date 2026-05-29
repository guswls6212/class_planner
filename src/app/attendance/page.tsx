"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useAttendance } from "../../hooks/useAttendance";
import { useMyRole } from "../../hooks/useMyRole";
import {
  formatLocalISO,
  formatWeekRangeLabel,
  getWeekStart,
  instanceDateFromWeekStart,
} from "../../lib/dateUtils";
import type { Session, Student } from "../../lib/planner";
import { weekdays } from "../../lib/planner";

const AttendanceSheet = dynamic(
  () => import("../../components/molecules/AttendanceSheet"),
  { ssr: false },
);

type AttendanceEntry = { status: string; notes?: string | null };
type ViewMode = "daily" | "weekly";

/**
 * 출결 dedicated 페이지 — phase1-release-readiness rank 6 (발견성).
 *
 * mockup: /strategy/discoverability-attendance-recovery § A1 +
 * attendance-ux-redesign Phase B (일/주 view + 모던 카드 + 아바타 + bulk).
 * 본 페이지 = "오늘/이번 주 sessions list + 각 session 클릭 → AttendanceSheet
 * modal" entry point. schedule / teacher-schedule 의 출결 진입과 같은 modal UX 단,
 * URL 직접 진입 (북마크) + focus mode (시간표 안 보고 출결만) 가치.
 *
 * 강사 (member role) — sessions.teacher_id 기준 본인 수업만 표시
 * (attendance-permission-fix proposal — image #12 발견 fix).
 *
 * Phase 3 (deferred):
 * - 월별 출결 view (캘린더 마커 — Variant D)
 * - 결석 alert (3회 연속 결석 학생)
 * - 출결 CSV export / 학생별 출결률
 *
 * 상세: class-planner/docs/future-work/attendance-phase2-enhancements.md
 */
export default function AttendancePage() {
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

  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  // 출결 모달 대상 — (sessionId, date) 쌍. weekly view 는 각 카드 날짜가 달라 date 동반.
  const [attendanceTarget, setAttendanceTarget] = useState<{
    sessionId: string;
    date: string;
  } | null>(null);

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekStartISO = formatLocalISO(weekStart);
  const dateISO = formatLocalISO(selectedDate);
  // JS getDay() = 0=일, 1=월... session.weekday = 0=월, 1=화... 변환
  const sessionWeekday = (selectedDate.getDay() + 6) % 7;

  // 그 주 월요일 + weekday → 해당 occurrence 의 날짜 (YYYY-MM-DD).
  // teacher-schedule 와 동일한 공유 helper — date key 일치 (timezone 무관).
  const dateForWeekday = (weekday: number): string =>
    instanceDateFromWeekStart(weekStartISO, weekday);

  // 본인(member) 수업만 — 다른 강사 수업 노출 차단
  const visibleForMember = (s: Session) =>
    !isMember || s.teacherId === myTeacherId;

  const daySessions = useMemo(() => {
    return sessions
      .filter(
        (s) => s.weekday === sessionWeekday && s.weekStartDate === weekStartISO,
      )
      .filter(visibleForMember)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [sessions, sessionWeekday, weekStartISO, isMember, myTeacherId]);

  // 주별 — 7 요일 각각의 sessions (날짜 동반).
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      date: dateForWeekday(weekday),
      sessions: sessions
        .filter((s) => s.weekday === weekday && s.weekStartDate === weekStartISO)
        .filter(visibleForMember)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }));
  }, [sessions, weekStartISO, isMember, myTeacherId]);

  const weekHasSessions = weekDays.some((d) => d.sessions.length > 0);

  const getSessionStudents = (s: Session): Student[] => {
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

  const activeSession = sessions.find(
    (s) => s.id === attendanceTarget?.sessionId,
  );
  const activeStudents = activeSession ? getSessionStudents(activeSession) : [];

  // active session 의 attendance fetch (useAttendance 가 (session,date) dedup)
  useEffect(() => {
    if (attendanceTarget && userId) {
      void fetchAttendance(attendanceTarget.sessionId, attendanceTarget.date);
    }
  }, [attendanceTarget, userId, fetchAttendance]);

  const goPrev = () =>
    setSelectedDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() - (viewMode === "weekly" ? 7 : 1));
      return n;
    });
  const goNext = () =>
    setSelectedDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + (viewMode === "weekly" ? 7 : 1));
      return n;
    });
  const goToday = () => setSelectedDate(new Date());

  // 카드의 "전체 출석" quick bulk — 모달 안 열고 일괄 출석 처리.
  const handleMarkAll = async (s: Session, date: string) => {
    const ids = getSessionStudents(s).map((st) => st.id);
    if (ids.length === 0) return;
    await markAllPresent(s.id, ids, date);
  };

  const navLabel =
    viewMode === "weekly"
      ? formatWeekRangeLabel(weekStart)
      : `${dateISO} (${weekdays[sessionWeekday]})`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" data-testid="attendance-page">
      <header className="mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            출결
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            날짜별 수업 출결 입력. 시간표 페이지의 출결과 동일하게 기록됩니다.
          </p>
        </div>
      </header>

      {/* 일별 / 주별 전환 */}
      <div
        className="mb-3 inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/60 p-0.5"
        role="tablist"
        aria-label="출결 보기 전환"
      >
        {(["daily", "weekly"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={viewMode === mode}
            onClick={() => setViewMode(mode)}
            className={[
              "px-4 py-1.5 text-[13px] font-semibold rounded-[10px] transition-colors",
              viewMode === mode
                ? "bg-[var(--color-accent)] text-[var(--color-admin-ink)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
            data-testid={`attendance-view-${mode}`}
          >
            {mode === "daily" ? "일별" : "주별"}
          </button>
        ))}
      </div>

      {/* 날짜 / 주 네비게이션 */}
      <div className="mb-5 flex items-center gap-2 bg-[var(--color-bg-secondary)] rounded-xl p-2.5">
        <button
          type="button"
          onClick={goPrev}
          className="p-1.5 hover:bg-[var(--color-overlay-light)] rounded-lg transition-colors"
          aria-label={viewMode === "weekly" ? "이전 주" : "이전 날짜"}
          data-testid="attendance-prev-date"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={goToday}
          className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-overlay-light)] transition-colors"
          data-testid="attendance-today"
        >
          오늘
        </button>
        <div
          className="flex-1 text-center font-medium text-[var(--color-text-primary)]"
          data-testid="attendance-date-label"
        >
          {navLabel}
        </div>
        <button
          type="button"
          onClick={goNext}
          className="p-1.5 hover:bg-[var(--color-overlay-light)] rounded-lg transition-colors"
          aria-label={viewMode === "weekly" ? "다음 주" : "다음 날짜"}
          data-testid="attendance-next-date"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── 일별 ───────────────────────────────────────────────── */}
      {viewMode === "daily" &&
        (daySessions.length === 0 ? (
          <EmptyAttendance isMember={isMember} />
        ) : (
          <ul className="space-y-2.5" data-testid="attendance-sessions">
            {daySessions.map((s) => (
              <li key={s.id}>
                <SessionCard
                  session={s}
                  subjectName={getSubjectName(s)}
                  students={getSessionStudents(s)}
                  attendanceEntry={attendance[s.id]?.[dateISO]}
                  onOpen={() =>
                    setAttendanceTarget({ sessionId: s.id, date: dateISO })
                  }
                  onMarkAll={() => void handleMarkAll(s, dateISO)}
                />
              </li>
            ))}
          </ul>
        ))}

      {/* ── 주별 ───────────────────────────────────────────────── */}
      {viewMode === "weekly" &&
        (!weekHasSessions ? (
          <EmptyAttendance isMember={isMember} />
        ) : (
          <div className="space-y-5" data-testid="attendance-week">
            {weekDays
              .filter((d) => d.sessions.length > 0)
              .map((d) => (
                <section key={d.weekday} data-testid={`attendance-week-day-${d.weekday}`}>
                  <div className="mb-1.5 flex items-baseline gap-2 px-0.5">
                    <span className="text-[13px] font-bold text-[var(--color-text-primary)]">
                      {weekdays[d.weekday]}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {d.date.slice(5).replace("-", "/")}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      · {d.sessions.length}개 수업
                    </span>
                  </div>
                  <ul className="space-y-2.5">
                    {d.sessions.map((s) => (
                      <li key={s.id}>
                        <SessionCard
                          session={s}
                          subjectName={getSubjectName(s)}
                          students={getSessionStudents(s)}
                          attendanceEntry={attendance[s.id]?.[d.date]}
                          onOpen={() =>
                            setAttendanceTarget({ sessionId: s.id, date: d.date })
                          }
                          onMarkAll={() => void handleMarkAll(s, d.date)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        ))}

      {activeSession && attendanceTarget && (
        <AttendanceSheet
          isOpen={!!activeSession}
          onClose={() => setAttendanceTarget(null)}
          sessionId={activeSession.id}
          date={attendanceTarget.date}
          students={activeStudents}
          attendance={attendance[activeSession.id]?.[attendanceTarget.date] ?? {}}
          onMarkAttendance={(studentId, status) =>
            markAttendance(
              activeSession.id,
              studentId,
              attendanceTarget.date,
              status,
            )
          }
          onMarkAllPresent={() =>
            markAllPresent(
              activeSession.id,
              activeStudents.map((st) => st.id),
              attendanceTarget.date,
            )
          }
        />
      )}
    </div>
  );
}

// ============================================================
// EmptyAttendance — 수업 없음 상태 (일/주 공용)
// ============================================================
function EmptyAttendance({ isMember }: { isMember: boolean }) {
  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-8 text-center space-y-3"
      data-testid="attendance-empty"
    >
      <ClipboardCheck className="w-10 h-10 text-[var(--color-text-muted)] mx-auto opacity-50" />
      <p className="text-sm text-[var(--color-text-secondary)]">
        {isMember
          ? "이 기간에 본인 수업이 없어요"
          : "이 기간에 등록된 수업이 없어요"}
      </p>
      <p className="text-[11px] text-[var(--color-text-muted)]">
        {isMember
          ? "시간표 페이지에서 본인 수업을 확인하세요"
          : "시간표 페이지에서 수업을 먼저 추가하세요"}
      </p>
    </div>
  );
}

// ============================================================
// SessionCard — 모던 glassmorphic 카드 (아바타 + 출결 요약 + 전체 출석)
// ============================================================
const AVATAR_TONES = [
  "bg-amber-500/20 text-amber-300",
  "bg-sky-500/20 text-sky-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-violet-500/20 text-violet-300",
  "bg-rose-500/20 text-rose-300",
];

function SessionCard({
  session,
  subjectName,
  students,
  attendanceEntry,
  onOpen,
  onMarkAll,
}: {
  session: Session;
  subjectName: string;
  students: Student[];
  attendanceEntry?: Record<string, AttendanceEntry>;
  onOpen: () => void;
  onMarkAll: () => void;
}) {
  const total = students.length;
  // 출결 요약 — attendance 가 로드된 경우만 (모달 열었거나 전체 출석 누른 카드)
  const presentCount = attendanceEntry
    ? Object.values(attendanceEntry).filter((e) => e.status === "present").length
    : 0;
  const markedCount = attendanceEntry
    ? Object.values(attendanceEntry).filter(
        (e) => e.status && e.status !== "none",
      ).length
    : 0;
  const allPresent = total > 0 && presentCount === total;
  const hasSummary = Boolean(attendanceEntry) && markedCount > 0;

  return (
    <div className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/60 backdrop-blur-sm overflow-hidden transition-colors hover:border-[var(--color-accent-hover)]/40">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left p-4 flex items-start gap-4"
        data-testid={`attendance-session-${session.id}`}
        aria-label={`${subjectName} 출결 입력 (${session.startsAt}-${session.endsAt})`}
      >
        <div className="flex flex-col items-center text-[11px] font-mono text-[var(--color-text-secondary)] min-w-[52px] pt-0.5">
          <Clock className="w-3.5 h-3.5 mb-1 text-amber-400/80" />
          <span className="text-[var(--color-text-primary)] font-semibold">
            {session.startsAt}
          </span>
          <span className="text-[var(--color-text-muted)]">{session.endsAt}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[15px] text-[var(--color-text-primary)] truncate">
              {subjectName}
            </span>
            {hasSummary && (
              <span
                className={[
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium",
                  allPresent
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300",
                ].join(" ")}
                data-testid={`attendance-summary-${session.id}`}
              >
                {allPresent && <Check className="w-3 h-3" />}
                {markedCount}/{total} 체크
              </span>
            )}
          </div>

          {/* 학생 아바타 (첫 글자) */}
          <div className="mt-2 flex items-center gap-2">
            {total === 0 ? (
              <span className="text-[12px] text-[var(--color-text-muted)]">
                학생 없음
              </span>
            ) : (
              <>
                <div className="flex -space-x-1.5">
                  {students.slice(0, 7).map((st, i) => (
                    <span
                      key={st.id}
                      title={st.name}
                      className={[
                        "w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] ring-2 ring-[var(--color-bg-secondary)]",
                        AVATAR_TONES[i % AVATAR_TONES.length],
                      ].join(" ")}
                    >
                      {st.name.normalize("NFC").charAt(0)}
                    </span>
                  ))}
                  {total > 7 && (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[10px] bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] ring-2 ring-[var(--color-bg-secondary)]">
                      +{total - 7}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {total}명
                </span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* 전체 출석 quick bulk */}
      {total > 0 && (
        <div className="px-4 pb-3 -mt-1 flex justify-end">
          <button
            type="button"
            onClick={onMarkAll}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
              allPresent
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-[var(--color-border)] bg-[var(--color-bg-primary)]/40 text-[var(--color-text-secondary)] hover:border-emerald-500/40 hover:text-emerald-300",
            ].join(" ")}
            data-testid={`attendance-markall-${session.id}`}
            aria-label={`${subjectName} 전체 출석 처리`}
          >
            <Check className="w-3.5 h-3.5" />
            {allPresent ? "전체 출석 완료" : "전체 출석"}
          </button>
        </div>
      )}
    </div>
  );
}
