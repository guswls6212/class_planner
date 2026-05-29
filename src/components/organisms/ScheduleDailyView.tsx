"use client";

/**
 * ScheduleDailyView: 시간표 일별 view 의 1 day 렌더 — time-axis × lane layout + session 배치
 * + day navigation (이전/다음 일) 만 담당.
 *
 * 의존성:
 *   - planner type (Session)
 *   - molecules/SessionBlock (session 렌더)
 *   - non-goal: weekly view (TimeTableGrid), share view, drag (단순 view 모드)
 *
 * 결정 history:
 *   - weekly view 와 별도 컴포넌트 — 같은 grid 패턴이지만 단일 day 만 표시.
 *   - share view 와 일부 시각 토큰 공유.
 *   - ADR-002 (2026-05-28): Cohesion Sweep Phase 2 — UI organism, 분리는 needs-review.
 *
 * Sniff test (자기 답변, 2026-05-28):
 *   1. 다른 파일? — yes (SessionBlock + day picker).
 *   2. 시그니처? — props 명확.
 *   3. UI/state/API 섞임? — UI + state (current day). API X.
 *   4. 도메인? — 한 도메인 (1 day timetable view).
 *   5. pure + 부수효과? — 부수효과 (state, scroll).
 *
 * 분리 후보 (needs-review): day navigation header 분리, time-axis 분리.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  GripVertical,
  MessageCircle,
  Users,
} from "lucide-react";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";
import type { ColorByMode } from "@/hooks/useColorBy";
import {
  resolveSessionColor,
  sessionMatchesFilters,
} from "@/components/molecules/SessionBlock.utils";

/**
 * 일별 시간표 — A+C 혼합 (좌 timeline 2/3 + 우 detail panel 1/3).
 *
 * Spec (사용자 결정 2026-05-21, ADR-020 후속):
 *   - 데이터 기반 자동 timeRange (가장 빠른/늦은 session ± 1h)
 *   - 5-stack 같은 겹침 side-by-side (weekly 와 일관). detail panel 이 정보 보완.
 *   - 첫 진입 시 현재 시각 가까운 (in-progress 우선, 없으면 next) session 자동 선택
 *   - 현재 시각 amber line + "지금" pill
 *   - 시간대 background tint (오전·오후·저녁 subtle)
 *   - 다음 수업까지 분 카운트다운
 *   - 이전/다음 nav 버튼 (J/K 단축키)
 *   - 출석 관련 prop 은 호환성 위해 유지하되 UI 에서 사용 X (deprecated)
 *   - 드래그/복사 affordance (실제 동작은 후속 PR)
 *
 * 클릭 의미:
 *   - timeline block 클릭 → 선택 (detail panel 갱신)
 *   - detail panel "편집" 클릭 → onSessionClick 호출 (기존 EditSessionModal)
 */

type AttendanceStatus = "all-present" | "partial" | "absent" | "unmarked";

interface ScheduleDailyViewProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  selectedWeekday: number;
  colorBy: ColorByMode;
  selectedStudentIds?: string[];
  selectedSubjectIds?: string[];
  selectedTeacherIds?: string[];
  /** detail panel 의 "편집" 버튼 클릭 시 호출 — 기존 EditSessionModal 진입점 호환 */
  onSessionClick: (session: Session) => void;
  /** read-only(강사 본인 시간표 등) — 편집 버튼 + drag/copy affordance 숨김. default false */
  readOnly?: boolean;
  /**
   * read-only 인데도 detail panel 의 액션 버튼(→ onSessionClick) 노출 + 라벨 "출결 체크".
   * drag/copy/편집 affordance 는 readOnly 로 여전히 차단. teacher-schedule 출결 진입용. default false.
   */
  allowReadOnlySessionClick?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** @deprecated 출석은 별도 detail 또는 후속 view 에서 처리 — daily view 에서 노출 X */
  onAttendanceClick?: (session: Session) => void;
  /** @deprecated */
  attendanceStatusMap?: Record<string, AttendanceStatus>;
}

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function ScheduleDailyView({
  sessions,
  subjects,
  students,
  enrollments,
  teachers,
  selectedWeekday,
  colorBy,
  selectedStudentIds,
  selectedSubjectIds,
  selectedTeacherIds,
  onSessionClick,
  readOnly = false,
  allowReadOnlySessionClick = false,
  onSwipeLeft,
  onSwipeRight,
}: ScheduleDailyViewProps) {
  // 활성 필터 type 어느 하나라도 있으면 매칭/비매칭 dim (ADR-020 R5 Full Parity)
  const isAnyFilterActive =
    (selectedStudentIds?.length ?? 0) > 0 ||
    (selectedSubjectIds?.length ?? 0) > 0 ||
    (selectedTeacherIds?.length ?? 0) > 0;

  // 시간 정렬된 그날의 sessions
  const daySessions = useMemo(() => {
    const raw = sessions.get(selectedWeekday) ?? [];
    return [...raw].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [sessions, selectedWeekday]);

  // 자동 timeRange (데이터 기반)
  const { startHour, endHour } = useMemo(() => {
    if (daySessions.length === 0) return { startHour: 9, endHour: 22 };
    const min = Math.min(...daySessions.map((s) => timeToMin(s.startsAt)));
    const max = Math.max(...daySessions.map((s) => timeToMin(s.endsAt)));
    return {
      startHour: Math.max(0, Math.floor(min / 60) - 1),
      endHour: Math.min(24, Math.ceil(max / 60) + 1),
    };
  }, [daySessions]);

  // 현재 시각 (분 단위) — 1분마다 업데이트
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // 첫 진입 시 현재 시각 가까운 session 자동 선택
  const initialSelected = useMemo(() => {
    if (daySessions.length === 0) return null;
    const inProgress = daySessions.find(
      (s) => timeToMin(s.startsAt) <= nowMin && timeToMin(s.endsAt) > nowMin,
    );
    if (inProgress) return inProgress.id;
    const next = daySessions.find((s) => timeToMin(s.startsAt) >= nowMin);
    return next?.id ?? daySessions[0].id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySessions]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);

  // weekday 변경 시 자동 선택 갱신
  useEffect(() => {
    setSelectedId(initialSelected);
  }, [initialSelected]);

  const selectedSession =
    daySessions.find((s) => s.id === selectedId) ?? null;

  // 이전/다음 nav (J/K)
  const navPrev = () => {
    const idx = daySessions.findIndex((s) => s.id === selectedId);
    if (idx > 0) setSelectedId(daySessions[idx - 1].id);
  };
  const navNext = () => {
    const idx = daySessions.findIndex((s) => s.id === selectedId);
    if (idx >= 0 && idx < daySessions.length - 1)
      setSelectedId(daySessions[idx + 1].id);
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        navNext();
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        navPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, daySessions]);

  // 다음 수업 카운트다운
  const nextSession = useMemo(
    () => daySessions.find((s) => timeToMin(s.startsAt) > nowMin),
    [daySessions, nowMin],
  );

  // Swipe gesture (모바일 day navigate)
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
  };

  if (daySessions.length === 0) {
    return (
      <div
        className="flex flex-col flex-1 overflow-y-auto relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-testid="schedule-daily-view"
      >
        <div className="flex-1 flex items-center justify-center py-16 text-[var(--color-text-muted)] text-sm">
          수업이 없습니다
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="schedule-daily-view"
    >
      {/* 데스크탑: 좌 timeline 2/3 + 우 detail 1/3.
       *  모바일 (< md): timeline full width + detail은 selectedId 변경 시 bottom sheet (향후 PR). */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-[2] min-w-0 overflow-y-auto border-r border-[var(--color-border)]">
          <DailyTimeline
            sessions={daySessions}
            subjects={subjects}
            students={students}
            enrollments={enrollments}
            teachers={teachers}
            colorBy={colorBy}
            selectedStudentIds={selectedStudentIds}
            selectedSubjectIds={selectedSubjectIds}
            selectedTeacherIds={selectedTeacherIds}
            isAnyFilterActive={isAnyFilterActive}
            selectedId={selectedId}
            onSelect={setSelectedId}
            startHour={startHour}
            endHour={endHour}
            nowMin={nowMin}
            readOnly={readOnly}
          />
        </div>
        <div className="flex-[1] min-w-[280px] overflow-y-auto bg-[var(--color-bg-secondary)]/40 hidden md:block">
          <DailyDetailPanel
            session={selectedSession}
            subjects={subjects}
            students={students}
            enrollments={enrollments}
            teachers={teachers}
            nextSession={nextSession}
            nowMin={nowMin}
            onPrev={navPrev}
            onNext={navNext}
            hasPrev={
              daySessions.findIndex((s) => s.id === selectedId) > 0
            }
            hasNext={
              daySessions.findIndex((s) => s.id === selectedId) <
              daySessions.length - 1
            }
            onEdit={() => selectedSession && onSessionClick(selectedSession)}
            readOnly={readOnly}
            allowReadOnlySessionClick={allowReadOnlySessionClick}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DailyTimeline
// ============================================================

interface TimelineProps {
  sessions: Session[];
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  colorBy: ColorByMode;
  selectedStudentIds?: string[];
  selectedSubjectIds?: string[];
  selectedTeacherIds?: string[];
  isAnyFilterActive: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  startHour: number;
  endHour: number;
  nowMin: number;
  readOnly?: boolean;
}

const HOUR_HEIGHT = 64;

function DailyTimeline({
  sessions,
  subjects,
  students,
  enrollments,
  teachers,
  colorBy,
  selectedStudentIds,
  selectedSubjectIds,
  selectedTeacherIds,
  isAnyFilterActive,
  selectedId,
  onSelect,
  startHour,
  endHour,
  nowMin,
  readOnly = false,
}: TimelineProps) {
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;

  // Overlap groups — 같은 startsAt/endsAt 묶기
  const overlapGroups = useMemo(() => {
    const groups = new Map<string, Session[]>();
    for (const s of sessions) {
      const key = `${s.startsAt}-${s.endsAt}`;
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }
    return groups;
  }, [sessions]);

  // 시간대 zone tint
  const zones = [
    { from: 6 * 60, to: 12 * 60, color: "rgba(251, 191, 36, 0.04)" },
    { from: 12 * 60, to: 18 * 60, color: "rgba(59, 130, 246, 0.03)" },
    { from: 18 * 60, to: 24 * 60, color: "rgba(139, 92, 246, 0.04)" },
  ];
  const lowerMin = startHour * 60;
  const upperMin = endHour * 60;

  const showNowLine = nowMin >= lowerMin && nowMin <= upperMin;

  return (
    <div className="flex p-4" style={{ minHeight: totalHeight + 32 }}>
      {/* Time axis */}
      <div className="w-14 shrink-0 text-[10px] text-[var(--color-text-muted)] relative pt-2 pr-2 text-right">
        {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute right-2 -translate-y-1/2"
            style={{ top: i * HOUR_HEIGHT + 8 }}
          >
            {`${String(startHour + i).padStart(2, "0")}:00`}
          </div>
        ))}
      </div>

      {/* Sessions area */}
      <div
        className="flex-1 relative pt-2 ml-2 border-l border-[var(--color-border)]"
        style={{ minWidth: 0 }}
      >
        {/* zone tints */}
        {zones.map((z, i) => {
          const fromVis = Math.max(z.from, lowerMin);
          const toVis = Math.min(z.to, upperMin);
          if (fromVis >= toVis) return null;
          return (
            <div
              key={i}
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: ((fromVis - lowerMin) / 60) * HOUR_HEIGHT + 8,
                height: ((toVis - fromVis) / 60) * HOUR_HEIGHT,
                background: z.color,
              }}
            />
          );
        })}

        {/* hour grid */}
        {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-[var(--color-border)]/50"
            style={{ top: i * HOUR_HEIGHT + 8 }}
          />
        ))}

        {/* 현재 시각 line */}
        {showNowLine && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{
              top: ((nowMin - lowerMin) / 60) * HOUR_HEIGHT + 8,
            }}
          >
            <div className="h-px bg-[var(--color-accent)]" />
            <span
              className="absolute -top-2.5 -left-1 px-1.5 py-0.5 text-[9px] rounded bg-[var(--color-accent)] text-white font-bold"
              data-testid="now-pill"
            >
              지금 {String(Math.floor(nowMin / 60)).padStart(2, "0")}:
              {String(nowMin % 60).padStart(2, "0")}
            </span>
          </div>
        )}

        {/* sessions */}
        {sessions.map((s) => {
          const groupKey = `${s.startsAt}-${s.endsAt}`;
          const group = overlapGroups.get(groupKey) ?? [s];
          const indexInGroup = group.indexOf(s);
          const widthPct = 100 / group.length;
          const startMin = timeToMin(s.startsAt) - lowerMin;
          const duration = timeToMin(s.endsAt) - timeToMin(s.startsAt);
          const isSelected = s.id === selectedId;
          const matches = isAnyFilterActive
            ? sessionMatchesFilters(
                s,
                enrollments,
                selectedStudentIds ?? [],
                selectedSubjectIds ?? [],
                selectedTeacherIds ?? [],
              )
            : true;
          const isDimmed = isAnyFilterActive && !matches;
          const resolvedColor = resolveSessionColor(
            s,
            colorBy,
            enrollments,
            subjects,
            students,
            teachers,
            selectedStudentIds,
          );
          // 학생 이름 (visible 시 1~3명만 timeline 에 표시)
          const studentNames = (s.enrollmentIds ?? [])
            .flatMap((eid) => {
              const e = enrollments.find((x) => x.id === eid);
              return e
                ? students.find((st) => st.id === e.studentId)?.name ?? []
                : [];
            });
          const previewNames = studentNames.slice(0, 2).join(", ");
          const moreCount = studentNames.length - 2;

          return (
            <button
              key={s.id}
              type="button"
              data-testid={`daily-session-${s.id}`}
              onClick={() => onSelect(s.id)}
              className="absolute rounded p-1.5 text-left text-xs group transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              style={{
                top: (startMin / 60) * HOUR_HEIGHT + 8,
                height: (duration / 60) * HOUR_HEIGHT - 3,
                left: `${indexInGroup * widthPct}%`,
                width: `calc(${widthPct}% - 4px)`,
                background: isSelected
                  ? `${resolvedColor}44`
                  : `${resolvedColor}1f`,
                borderLeft: `3px solid ${resolvedColor}`,
                boxShadow: isSelected
                  ? `0 0 0 1.5px ${resolvedColor}, 0 4px 12px rgba(0,0,0,0.2)`
                  : undefined,
                opacity: isDimmed ? 0.25 : 1,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className="font-bold truncate"
                  style={{ color: resolvedColor }}
                >
                  {subjects.find((sub) => {
                    const enrollment = enrollments.find((e) =>
                      s.enrollmentIds?.includes(e.id),
                    );
                    return enrollment && sub.id === enrollment.subjectId;
                  })?.name ?? "과목 없음"}
                </span>
                {!readOnly && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0">
                    <GripVertical
                      size={10}
                      className="text-[var(--color-text-secondary)] cursor-grab"
                      aria-label="드래그"
                    />
                    <Copy
                      size={10}
                      className="text-[var(--color-text-secondary)]"
                      aria-label="복제"
                    />
                  </div>
                )}
              </div>
              <div className="text-[9px] text-[var(--color-text-muted)] truncate">
                {s.startsAt}
              </div>
              {previewNames && (
                <div
                  className="text-[10px] text-[var(--color-text-secondary)] truncate mt-0.5"
                  title={
                    studentNames.length > 0
                      ? studentNames.join(", ")
                      : undefined
                  }
                >
                  {previewNames}
                  {moreCount > 0 && (
                    <span className="text-[var(--color-text-muted)]"> +{moreCount}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// DailyDetailPanel
// ============================================================

interface DetailPanelProps {
  session: Session | null;
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  nextSession: Session | undefined;
  nowMin: number;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onEdit: () => void;
  readOnly?: boolean;
  allowReadOnlySessionClick?: boolean;
}

function DailyDetailPanel({
  session,
  subjects,
  students,
  enrollments,
  teachers,
  nextSession,
  nowMin,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onEdit,
  readOnly = false,
  allowReadOnlySessionClick = false,
}: DetailPanelProps) {
  if (!session) {
    return (
      <div
        className="h-full flex items-center justify-center text-center text-sm text-[var(--color-text-muted)] p-6"
        data-testid="daily-detail-panel-empty"
      >
        왼쪽에서 수업을 선택하세요
      </div>
    );
  }

  const subject = (() => {
    const e = enrollments.find((en) => session.enrollmentIds?.includes(en.id));
    return e ? subjects.find((s) => s.id === e.subjectId) ?? null : null;
  })();
  const teacher = session.teacherId
    ? teachers.find((t) => t.id === session.teacherId) ?? null
    : null;
  const studentList = (session.enrollmentIds ?? [])
    .flatMap((eid) => {
      const e = enrollments.find((x) => x.id === eid);
      return e ? students.find((st) => st.id === e.studentId) ?? [] : [];
    });

  const subjectColor = subject?.color ?? "#888";
  const teacherColor = teacher?.color ?? "#888";

  const minsToNext =
    nextSession && nextSession.id !== session.id
      ? timeToMin(nextSession.startsAt) - nowMin
      : null;
  const nextSubject = (() => {
    if (!nextSession) return null;
    const e = enrollments.find((en) =>
      nextSession.enrollmentIds?.includes(en.id),
    );
    return e ? subjects.find((s) => s.id === e.subjectId) ?? null : null;
  })();

  return (
    <div
      className="h-full flex flex-col p-4"
      data-testid="daily-detail-panel"
    >
      {/* 다음 수업 카운트다운 */}
      {minsToNext !== null && minsToNext >= 0 && nextSubject && (
        <div className="mb-3 px-3 py-2 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[11px] text-[var(--color-accent)]">
          <Clock size={11} className="inline mr-1" />
          다음 수업 <strong>{nextSubject.name}</strong> 까지{" "}
          <strong>{minsToNext}분</strong>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between mb-3 text-[11px] text-[var(--color-text-muted)]">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--color-bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid="detail-nav-prev"
        >
          <ChevronLeft size={12} /> 이전
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--color-bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid="detail-nav-next"
        >
          다음 <ChevronRight size={12} />
        </button>
      </div>

      {/* Title block */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4
            className="text-2xl font-bold leading-tight"
            style={{ color: subjectColor }}
            data-testid="detail-subject-name"
          >
            {subject?.name ?? "과목 없음"}
          </h4>
          {!readOnly && (
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-muted)]"
                title="드래그로 시간 이동 (후속 PR)"
                aria-label="드래그"
              >
                <GripVertical size={14} />
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-muted)]"
                title="복제 (후속 PR)"
                aria-label="복제"
              >
                <Copy size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="text-xs text-[var(--color-text-muted)]">
          {session.startsAt} – {session.endsAt}
        </div>
        {teacher ? (
          <div
            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px]"
            style={{
              background: `${teacherColor}22`,
              color: teacherColor,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: teacherColor }}
            />
            {teacher.name}
          </div>
        ) : (
          <div className="mt-1.5 text-[11px] text-[var(--color-text-muted)] italic">
            강사 미배정
          </div>
        )}
      </div>

      {/* Students */}
      <div className="mb-4">
        <div className="text-[10px] uppercase text-[var(--color-text-muted)] tracking-wider mb-2 flex items-center gap-1">
          <Users size={11} /> 학생 ({studentList.length}명)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {studentList.length === 0 ? (
            <span className="text-[11px] text-[var(--color-text-muted)] italic">
              학생 없음
            </span>
          ) : (
            studentList.map((st) => (
              <span
                key={st.id}
                className="px-2 py-1 text-xs rounded-full bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
              >
                {st.name}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Notes — internalNote(운영자 전용)는 read-only(강사/공유 view)에서 숨김. */}
      {(session.publicDescription || (session.internalNote && !readOnly)) && (
        <div className="mb-4 space-y-2">
          {session.publicDescription && (
            <div>
              <div className="text-[10px] uppercase text-[var(--color-text-muted)] tracking-wider mb-1.5 flex items-center gap-1">
                <MessageCircle size={11} /> 공개 메모
              </div>
              <p
                className="text-sm text-[var(--color-text-primary)] p-2 rounded bg-[var(--color-bg-primary)]/60 leading-relaxed"
                data-testid="detail-public-description"
              >
                {session.publicDescription}
              </p>
            </div>
          )}
          {session.internalNote && !readOnly && (
            <div>
              <div className="text-[10px] uppercase text-[var(--color-accent)]/70 tracking-wider mb-1.5 flex items-center gap-1">
                <MessageCircle size={11} /> 내부 메모
              </div>
              <p
                className="text-sm text-[var(--color-text-primary)] p-2 rounded bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/15 leading-relaxed"
                data-testid="detail-internal-note"
              >
                {session.internalNote}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer — 편집(운영자) 또는 출결 체크(강사 read-only 진입). */}
      {(!readOnly || allowReadOnlySessionClick) && (
        <div className="mt-auto pt-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onEdit}
            className="w-full px-3 py-2 text-xs rounded bg-[var(--color-accent)] hover:opacity-90 text-white font-bold"
            data-testid={readOnly ? "detail-attendance-btn" : "detail-edit-btn"}
          >
            {readOnly ? "출결 체크" : "편집"}
          </button>
        </div>
      )}
    </div>
  );
}
