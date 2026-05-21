"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  GripVertical,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";

/**
 * design-explorations: 일별 시간표 최종안 — A (Vertical Timeline) + C (Detail Panel) 혼합.
 *
 * Spec (사용자 결정 2026-05-21):
 *   - Layout 2:1 — 좌 timeline + 우 detail panel
 *   - 겹침: Side-by-side (모두 가시, detail panel 이 정보 부족 보완)
 *   - 자동 timeRange (데이터 기반)
 *   - 첫 진입 시 현재 시각 가까운 session 자동 선택
 *   - 출석 button 제거
 *   - 드래그·복사 affordance (GripVertical / Copy)
 *   - 현재 시각 line + "지금" pill
 *   - 빈 시간 dim + 시간대 background tint
 *   - 다음 수업 카운트다운, J/K nav (placeholder)
 *
 * 사용법:
 *   PORT=3000 npm run dev
 *   http://localhost:3000/design-explorations/daily-view-final
 */

interface MockSession {
  id: string;
  startsAt: string;
  endsAt: string;
  subject: string;
  subjectColor: string;
  teacher: string | null;
  teacherColor: string;
  students: string[];
  publicDescription?: string;
  internalNote?: string;
}

const TODAY_SESSIONS: MockSession[] = [
  {
    id: "s1",
    startsAt: "10:00",
    endsAt: "11:00",
    subject: "과학",
    subjectColor: "#F59E0B",
    teacher: "이선생",
    teacherColor: "#0891b2",
    students: ["김영수", "최민준"],
  },
  {
    id: "s2",
    startsAt: "11:00",
    endsAt: "12:00",
    subject: "사회",
    subjectColor: "#8B5CF6",
    teacher: "강사_uat",
    teacherColor: "#10b981",
    students: ["이서준", "최민준"],
    publicDescription: "5단원 마무리 — 시험 범위 점검",
  },
  {
    id: "s3",
    startsAt: "14:00",
    endsAt: "15:00",
    subject: "수학",
    subjectColor: "#EF4444",
    teacher: "김선생",
    teacherColor: "#6366f1",
    students: ["김영수", "한도윤"],
    publicDescription: "이차방정식 응용 문제",
    internalNote: "한도윤 별도 보충 필요",
  },
  {
    id: "s4",
    startsAt: "14:00",
    endsAt: "15:00",
    subject: "영어",
    subjectColor: "#3B82F6",
    teacher: "이선생",
    teacherColor: "#0891b2",
    students: ["박지수", "김지우"],
  },
  {
    id: "s5",
    startsAt: "14:00",
    endsAt: "15:00",
    subject: "코딩",
    subjectColor: "#EC4899",
    teacher: "박코치",
    teacherColor: "#7c3aed",
    students: ["홍길동", "TomLee"],
  },
  {
    id: "s6",
    startsAt: "14:00",
    endsAt: "15:00",
    subject: "사회",
    subjectColor: "#8B5CF6",
    teacher: "최쌤",
    teacherColor: "#ea580c",
    students: ["정수아", "최민준", "이서준"],
  },
  {
    id: "s7",
    startsAt: "14:00",
    endsAt: "15:00",
    subject: "미술",
    subjectColor: "#06B6D4",
    teacher: null,
    teacherColor: "#94a3b8",
    students: ["강서연", "이서준"],
  },
  {
    id: "s8",
    startsAt: "16:00",
    endsAt: "17:00",
    subject: "국어",
    subjectColor: "#14B8A6",
    teacher: "윤멘토교육",
    teacherColor: "#be185d",
    students: ["박지수"],
  },
];

const CURRENT_TIME_MIN = 14 * 60 + 30; // 14:30 mock

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function DailyViewFinalPage() {
  // 자동 timeRange — 데이터 기반 (가장 빠른 / 늦은 session 기준 ± 1시간)
  const { startHour, endHour } = useMemo(() => {
    if (TODAY_SESSIONS.length === 0) return { startHour: 9, endHour: 22 };
    const min = Math.min(...TODAY_SESSIONS.map((s) => timeToMin(s.startsAt)));
    const max = Math.max(...TODAY_SESSIONS.map((s) => timeToMin(s.endsAt)));
    return {
      startHour: Math.max(0, Math.floor(min / 60) - 1),
      endHour: Math.min(24, Math.ceil(max / 60) + 1),
    };
  }, []);

  // 현재 시각 가까운 session 자동 선택
  const initialSelected = useMemo(() => {
    const inProgress = TODAY_SESSIONS.find(
      (s) =>
        timeToMin(s.startsAt) <= CURRENT_TIME_MIN &&
        timeToMin(s.endsAt) > CURRENT_TIME_MIN,
    );
    if (inProgress) return inProgress.id;
    const next = TODAY_SESSIONS.find(
      (s) => timeToMin(s.startsAt) >= CURRENT_TIME_MIN,
    );
    return next?.id ?? TODAY_SESSIONS[0]?.id ?? null;
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const selected = TODAY_SESSIONS.find((s) => s.id === selectedId);

  // 다음 수업 카운트다운
  const nextSession = useMemo(
    () => TODAY_SESSIONS.find((s) => timeToMin(s.startsAt) > CURRENT_TIME_MIN),
    [],
  );
  const minsToNext = nextSession
    ? timeToMin(nextSession.startsAt) - CURRENT_TIME_MIN
    : null;

  // 이전/다음 navigation (J/K)
  const sortedByTime = useMemo(
    () =>
      [...TODAY_SESSIONS].sort(
        (a, b) => timeToMin(a.startsAt) - timeToMin(b.startsAt),
      ),
    [],
  );
  const currentIdx = sortedByTime.findIndex((s) => s.id === selectedId);
  const navPrev = () => {
    if (currentIdx > 0) setSelectedId(sortedByTime[currentIdx - 1].id);
  };
  const navNext = () => {
    if (currentIdx < sortedByTime.length - 1)
      setSelectedId(sortedByTime[currentIdx + 1].id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="mb-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">
          일별 시간표 — 최종안 (A + C 혼합)
        </h1>
        <p className="text-sm text-slate-400">
          좌측 timeline (시간 정밀 + 겹침 side-by-side) + 우측 detail panel
          (학생/메모/진도 풍부). 현재 시각 14:30 mock — in-progress session
          자동 선택.
        </p>
      </header>

      <div className="max-w-7xl mx-auto bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        {/* Top toolbar (mock) */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-slate-800">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-medium">2026년 5월 21일 (목)</span>
            <button className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-slate-800">
              <ChevronRight size={14} />
            </button>
            <button className="ml-2 px-2 py-0.5 text-xs rounded hover:bg-slate-800 text-slate-400">
              오늘
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>오늘 {TODAY_SESSIONS.length}개</span>
            <span className="text-slate-600">·</span>
            <span>강사 {new Set(TODAY_SESSIONS.map((s) => s.teacher).filter(Boolean)).size}명</span>
          </div>
        </div>

        {/* Main split — 2:1 */}
        <div className="grid grid-cols-3 gap-0" style={{ minHeight: 600 }}>
          {/* Timeline (2/3) */}
          <div className="col-span-2 border-r border-slate-800 p-4">
            <Timeline
              sessions={TODAY_SESSIONS}
              selectedId={selectedId}
              onSelect={setSelectedId}
              startHour={startHour}
              endHour={endHour}
            />
          </div>

          {/* Detail panel (1/3) */}
          <div className="col-span-1 p-4 bg-slate-950/40">
            <DetailPanel
              session={selected}
              minsToNext={minsToNext}
              nextSession={nextSession}
              onPrev={navPrev}
              onNext={navNext}
              hasPrev={currentIdx > 0}
              hasNext={currentIdx < sortedByTime.length - 1}
            />
          </div>
        </div>
      </div>

      {/* Annotations */}
      <section className="mt-8 max-w-7xl mx-auto grid md:grid-cols-2 gap-6 text-sm text-slate-400">
        <div>
          <h3 className="text-base font-bold text-slate-200 mb-2">
            ✦ 시각적 편안 요소
          </h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>현재 시각 amber line + "지금" pill — 한눈에 위치</li>
            <li>시간대 background subtle tint (오전·오후·저녁)</li>
            <li>빈 시간 hover 시 "+ 수업 추가" hint</li>
            <li>5-stack 겹침 = 같은 시간 5개 → 좁아지지만 detail 이 보완</li>
          </ul>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-200 mb-2">
            ✦ 일별만의 강점
          </h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>다음 수업까지 분 단위 카운트다운</li>
            <li>학생 chip 풍부 + 메모/진도 inline view</li>
            <li>이전/다음 수업 navigation (J/K 단축키)</li>
            <li>선택 = detail panel 갱신 (편집은 별도 모달)</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function Timeline({
  sessions,
  selectedId,
  onSelect,
  startHour,
  endHour,
}: {
  sessions: MockSession[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  startHour: number;
  endHour: number;
}) {
  const HOUR_HEIGHT = 64;
  const TOTAL_HEIGHT = (endHour - startHour) * HOUR_HEIGHT;

  // Overlap groups
  const groups = new Map<string, MockSession[]>();
  for (const s of sessions) {
    const key = `${s.startsAt}-${s.endsAt}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  // Time-of-day tint zones
  const zones = [
    { from: 6 * 60, to: 12 * 60, color: "rgba(251, 191, 36, 0.04)" }, // 오전 amber
    { from: 12 * 60, to: 18 * 60, color: "rgba(59, 130, 246, 0.03)" }, // 오후 blue
    { from: 18 * 60, to: 24 * 60, color: "rgba(139, 92, 246, 0.04)" }, // 저녁 violet
  ];

  return (
    <div className="flex" style={{ height: TOTAL_HEIGHT + 24 }}>
      {/* Time axis */}
      <div className="w-14 shrink-0 text-[10px] text-slate-500 relative pt-2 pr-2 text-right">
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
        className="flex-1 relative pt-2 ml-2 border-l border-slate-800"
        style={{ minWidth: 520 }}
      >
        {/* Time-of-day zone tints */}
        {zones.map((z, i) => {
          const lower = startHour * 60;
          const upper = endHour * 60;
          const fromVis = Math.max(z.from, lower);
          const toVis = Math.min(z.to, upper);
          if (fromVis >= toVis) return null;
          return (
            <div
              key={i}
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: ((fromVis - lower) / 60) * HOUR_HEIGHT + 8,
                height: ((toVis - fromVis) / 60) * HOUR_HEIGHT,
                background: z.color,
              }}
            />
          );
        })}

        {/* Hour grid lines */}
        {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-slate-800/60"
            style={{ top: i * HOUR_HEIGHT + 8 }}
          />
        ))}

        {/* Current time line */}
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none"
          style={{
            top:
              ((CURRENT_TIME_MIN - startHour * 60) / 60) * HOUR_HEIGHT + 8,
          }}
        >
          <div className="h-px bg-amber-500" />
          <span className="absolute -top-2.5 -left-1 px-1.5 py-0.5 text-[9px] rounded bg-amber-500 text-slate-950 font-bold">
            지금 14:30
          </span>
        </div>

        {/* Sessions */}
        {sessions.map((s) => {
          const groupKey = `${s.startsAt}-${s.endsAt}`;
          const group = groups.get(groupKey) ?? [s];
          const indexInGroup = group.indexOf(s);
          const widthPct = 100 / group.length;
          const startMin = timeToMin(s.startsAt) - startHour * 60;
          const duration = timeToMin(s.endsAt) - timeToMin(s.startsAt);
          const isSelected = s.id === selectedId;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="absolute rounded p-1.5 text-left text-xs group transition-shadow"
              style={{
                top: (startMin / 60) * HOUR_HEIGHT + 8,
                height: (duration / 60) * HOUR_HEIGHT - 3,
                left: `${indexInGroup * widthPct}%`,
                width: `calc(${widthPct}% - 4px)`,
                background: isSelected
                  ? `${s.subjectColor}44`
                  : `${s.subjectColor}1f`,
                borderLeft: `3px solid ${s.subjectColor}`,
                boxShadow: isSelected
                  ? `0 0 0 1.5px ${s.subjectColor}, 0 4px 12px rgba(0,0,0,0.3)`
                  : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className="font-bold truncate"
                  style={{ color: s.subjectColor }}
                >
                  {s.subject}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0">
                  <GripVertical
                    size={10}
                    className="text-slate-300 cursor-grab"
                  />
                  <Copy size={10} className="text-slate-300" />
                </div>
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {s.startsAt}
              </div>
              {group.length <= 3 && (
                <div className="text-[10px] text-slate-300 truncate mt-0.5">
                  {s.students.join(", ")}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({
  session,
  minsToNext,
  nextSession,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  session: MockSession | undefined;
  minsToNext: number | null;
  nextSession: MockSession | undefined;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center text-center text-sm text-slate-500">
        왼쪽에서 수업을 선택하세요
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Next-session countdown */}
      {minsToNext !== null && nextSession && nextSession.id !== session.id && (
        <div className="mb-3 px-3 py-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
          <Clock size={11} className="inline mr-1" /> 다음 수업{" "}
          <strong>{nextSession.subject}</strong> 까지{" "}
          <strong className="text-amber-100">{minsToNext}분</strong>
        </div>
      )}

      {/* Nav arrows */}
      <div className="flex items-center justify-between mb-3 text-[11px] text-slate-500">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={12} /> 이전
        </button>
        <span className="text-[9px] text-slate-600 uppercase tracking-wider">
          J · K
        </span>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          다음 <ChevronRight size={12} />
        </button>
      </div>

      {/* Title block */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4
            className="text-2xl font-bold leading-tight"
            style={{ color: session.subjectColor }}
          >
            {session.subject}
          </h4>
          <div className="flex gap-1 shrink-0">
            <button
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              title="드래그로 시간 이동"
            >
              <GripVertical size={14} />
            </button>
            <button
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
              title="복제"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {session.startsAt} – {session.endsAt}
        </div>
        {session.teacher ? (
          <div
            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px]"
            style={{
              background: `${session.teacherColor}22`,
              color: session.teacherColor,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: session.teacherColor }}
            />
            {session.teacher}
          </div>
        ) : (
          <div className="mt-1.5 text-[11px] text-slate-500 italic">
            강사 미배정
          </div>
        )}
      </div>

      {/* Students */}
      <div className="mb-4">
        <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1">
          <Users size={11} /> 학생 ({session.students.length}명)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {session.students.map((name) => (
            <span
              key={name}
              className="px-2 py-1 text-xs rounded-full bg-slate-800 text-slate-200"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Notes */}
      {(session.publicDescription || session.internalNote) && (
        <div className="mb-4 space-y-2">
          {session.publicDescription && (
            <div>
              <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <MessageCircle size={11} /> 공개 메모
              </div>
              <p className="text-sm text-slate-200 p-2 rounded bg-slate-800/60 leading-relaxed">
                {session.publicDescription}
              </p>
            </div>
          )}
          {session.internalNote && (
            <div>
              <div className="text-[10px] uppercase text-amber-500/70 tracking-wider mb-1.5 flex items-center gap-1">
                <MessageCircle size={11} /> 내부 메모
              </div>
              <p className="text-sm text-amber-100/90 p-2 rounded bg-amber-500/5 border border-amber-500/15 leading-relaxed">
                {session.internalNote}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer action */}
      <div className="mt-auto pt-3 border-t border-slate-800 flex gap-2">
        <button className="flex-1 px-3 py-2 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center justify-center gap-1">
          <Plus size={12} /> 메모 추가
        </button>
        <button className="px-3 py-2 text-xs rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
          편집
        </button>
      </div>
    </div>
  );
}
