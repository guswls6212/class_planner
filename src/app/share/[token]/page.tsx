"use client";

import { useEffect, useRef, useState } from "react";
import { use } from "react";
import { RefreshCw, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import TimeTableGrid from "@/components/organisms/TimeTableGrid";
import { ScheduleDailyView } from "@/components/organisms/ScheduleDailyView";
import ScheduleMonthlyView from "@/components/organisms/ScheduleMonthlyView";
import ScheduleChangeBanner from "@/components/molecules/ScheduleChangeBanner";
import SegmentedButton from "@/components/atoms/SegmentedButton";
import type { Session, Student, Subject, Enrollment, Teacher } from "@/lib/planner";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const POLL_INTERVAL_MS = 30_000;

interface ShareData {
  academyName: string;
  label: string | null;
  sessions: RawSession[];
  students: RawStudent[];
  subjects: RawSubject[];
  enrollments: RawEnrollment[];
  teachers: RawTeacher[];
  scheduleUpdatedAt: string;
  lastViewedAt: string | null;
  hasChanges: boolean;
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
interface RawStudent { id: string; name: string; gender?: string; birth_date?: string; grade?: string; school?: string; phone?: string; }
interface RawSubject { id: string; name: string; color?: string; }
interface RawEnrollment { id: string; student_id: string; subject_id: string; }
interface RawTeacher { id: string; name: string; color: string; user_id?: string | null; }

type ViewMode = "daily" | "weekly" | "monthly";

function mapSessions(raw: RawSession[]): Session[] {
  return raw.map((s) => ({
    id: s.id, enrollmentIds: s.enrollment_ids ?? [], weekday: s.weekday,
    startsAt: s.starts_at, endsAt: s.ends_at, room: s.room,
    weekStartDate: (s as any).week_start_date ?? "",
    yPosition: s.y_position, teacherId: s.teacher_id,
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

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch(`/api/share/${token}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      } else {
        setError(json.error ?? "링크를 불러올 수 없습니다.");
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    pollerRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    return () => { if (pollerRef.current) clearInterval(pollerRef.current); };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // 날짜 네비게이션
  const navigate = (dir: -1 | 1) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      if (viewMode === "daily") next.setDate(next.getDate() + dir);
      else if (viewMode === "weekly") next.setDate(next.getDate() + dir * 7);
      else next.setMonth(next.getMonth() + dir);
      return next;
    });
  };
  const goToday = () => setSelectedDate(new Date());

  const dateLabel = (() => {
    if (viewMode === "daily") {
      return selectedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    }
    if (viewMode === "weekly") {
      const ws = getWeekStart(selectedDate);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return `${ws.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} — ${we.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}`;
    }
    return selectedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
  })();

  // --- Loading / Error states ---
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--color-text-muted)]">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center">
          <Calendar size={24} className="text-[var(--color-text-muted)]" />
        </div>
        <p className="text-base font-semibold text-[var(--color-text-primary)]">시간표를 불러올 수 없습니다</p>
        <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const sessions = mapSessions(data.sessions);
  const sessionMap = buildSessionMap(sessions);
  const today = new Date();
  const todayWeekday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const selectedWeekday = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;

  const students: Student[] = data.students.map((s) => ({ id: s.id, name: s.name, gender: s.gender, birthDate: s.birth_date, grade: s.grade, school: s.school, phone: s.phone }));
  const subjects: Subject[] = data.subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  const enrollments: Enrollment[] = data.enrollments.map((e) => ({ id: e.id, studentId: e.student_id, subjectId: e.subject_id }));
  const teachers: Teacher[] = data.teachers.map((t) => ({ id: t.id, name: t.name, color: t.color, userId: t.user_id }));

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* 헤더 */}
      <header className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* 학원 정보 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-black text-[var(--color-admin-ink)]">CP</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-tight">
                {data.academyName}
              </p>
              {data.label && (
                <p className="text-[11px] text-[var(--color-text-muted)] truncate leading-tight">{data.label}</p>
              )}
            </div>
          </div>

          {/* 뷰 전환 */}
          <div className="flex-shrink-0">
            <SegmentedButton
              options={[
                { label: "일별", value: "daily" },
                { label: "주간", value: "weekly" },
                { label: "월별", value: "monthly" },
              ]}
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
            />
          </div>

          {/* 시간표 마지막 수정 시각 */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            {isRefreshing && <RefreshCw size={13} className="text-[var(--color-text-muted)] animate-spin" />}
            {data && !isRefreshing && (
              <span className="text-[10px] text-[var(--color-text-muted)] hidden sm:block">
                {new Date(data.scheduleUpdatedAt).toLocaleString("ko-KR", {
                  month: "numeric", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })} 수정
              </span>
            )}
          </div>
        </div>

        {/* 날짜 네비게이터 */}
        <div className="flex items-center gap-2 px-4 pb-2.5">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] transition-colors">
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <span className="flex-1 text-center text-sm font-medium text-[var(--color-text-primary)]">{dateLabel}</span>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] transition-colors">
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
          <button onClick={goToday} className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-light)] transition-colors">
            오늘
          </button>
        </div>
      </header>

      {/* 변경 알림 배너 */}
      {data.hasChanges && data.lastViewedAt !== null && (
        <div className="flex-shrink-0">
          <ScheduleChangeBanner scheduleUpdatedAt={data.scheduleUpdatedAt} />
        </div>
      )}

      {/* 시간표 본문 */}
      <main className="flex-1 overflow-hidden">
        {viewMode === "daily" && (
          <div className="h-full overflow-y-auto">
            <ScheduleDailyView
              sessions={sessionMap}
              subjects={subjects}
              students={students}
              enrollments={enrollments}
              teachers={teachers}
              selectedWeekday={selectedWeekday}
              colorBy="subject"
              onSessionClick={() => {}}
            />
          </div>
        )}

        {viewMode === "weekly" && (
          <TimeTableGrid
            sessions={sessionMap}
            subjects={subjects}
            enrollments={enrollments}
            students={students}
            teachers={teachers}
            colorBy="subject"
            isReadOnly={true}
            onSessionClick={() => {}}
            onDrop={() => {}}
            onEmptySpaceClick={() => {}}
            baseDate={getWeekStart(selectedDate)}
          />
        )}

        {viewMode === "monthly" && (
          <div className="h-full overflow-y-auto p-4">
            <ScheduleMonthlyView
              sessions={sessionMap}
              subjects={subjects}
              enrollments={enrollments}
              students={students}
              teachers={teachers}
              colorBy="subject"
              currentDate={selectedDate}
              onDayClick={(date) => {
                setSelectedDate(date);
                setViewMode("daily");
              }}
            />
          </div>
        )}
      </main>

      {/* 하단 — 일별 요일 탭 */}
      {viewMode === "daily" && (
        <nav className="flex-shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]">
          <div className="flex">
            {WEEKDAY_LABELS.map((label, idx) => {
              const isToday = idx === todayWeekday;
              const isSelected = idx === selectedWeekday;
              const count = sessionMap.get(idx)?.length ?? 0;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    const ws = getWeekStart(selectedDate);
                    const d = new Date(ws); d.setDate(d.getDate() + idx);
                    setSelectedDate(d);
                  }}
                  className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${
                    isSelected ? "bg-[var(--color-overlay-light)]" : "hover:bg-[var(--color-overlay-light)]"
                  }`}
                >
                  <span className={`text-[10px] font-medium ${isToday ? "text-accent" : "text-[var(--color-text-muted)]"}`}>{label}</span>
                  <span className={`text-xs font-bold ${isSelected ? "text-accent" : isToday ? "text-accent" : "text-[var(--color-text-secondary)]"}`}>
                    {isToday ? "●" : count > 0 ? count : "·"}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
