"use client";

import { useState } from "react";
import { Clock, Copy, GripVertical, Users, MessageCircle } from "lucide-react";

/**
 * design-explorations: 일별 시간표 가독성 개선 4 variant 비교 (UAT 2026-05-21).
 *
 * 현재 문제 (사용자 보고):
 *   - row list 형태 — 시간 겹침 시각화 X (단순 나열)
 *   - 가로로 길고 우측 공백 큼
 *   - 강사/학생 같은 라인 → 가독성 X
 *   - weekly view 와 차별점 부족 — 일별만의 장점 X
 *
 * Variants:
 *   A. Vertical Timeline      — 시간 axis 정밀 + 겹침 side-by-side
 *   B. Teacher Columns        — 강사별 column, 동선 인지
 *   C. Timeline + Detail      — 1/3 timeline + 2/3 detail panel (split view)
 *   D. Hero + Insights        — 현재/다음 hero + chip list + 동선 통계
 *
 * 공통 요구:
 *   - 드래그, 복사 가능 (visual indicator)
 *   - 출석 기능 제거
 *   - 시각 편안 + 모던
 *   - 일별만의 가치 (detail / grouping / 동선)
 *
 * 사용법:
 *   PORT=3000 npm run dev
 *   http://localhost:3000/design-explorations/daily-view-redesign
 */

interface MockSession {
  id: string;
  startsAt: string;
  endsAt: string;
  subject: string;
  subjectColor: string;
  teacher: string;
  teacherColor: string;
  students: string[];
  note?: string;
}

// 사용자가 본 5/21 (목) 시드 데이터 — 14:00 3-stack 포함
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
    note: "진도 5단원 마무리",
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
    teacher: null as unknown as string,
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

const CURRENT_TIME_MIN = 14 * 60 + 30; // 14:30 (mock)

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function DailyViewRedesignPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="mb-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">일별 시간표 — 재설계 4 variant</h1>
        <p className="text-sm text-slate-400 mb-2">
          5/21 (목) 시드 데이터 — 14:00 5-stack 겹침 + 단일 sessions 혼재.
          드래그(<GripVertical size={12} className="inline" />), 복사(<Copy size={12} className="inline" />) affordance 포함.
        </p>
      </header>

      <div className="space-y-6 max-w-7xl mx-auto">
        <VariantSection
          letter="A"
          title="Vertical Timeline"
          description="시간축이 정밀 (분당 비례 높이). 겹침 session 들 좌우 분할. weekly day column 의 single-day 확대 버전 — 익숙 + 시각 명확."
        >
          <VariantA sessions={TODAY_SESSIONS} />
        </VariantSection>

        <VariantSection
          letter="B"
          title="Teacher Columns"
          description="강사별 column. 각 강사의 그날 동선 / 빈 시간 즉시 인지. 학원장 입장 — 강사 운영 최적화에 유리."
        >
          <VariantB sessions={TODAY_SESSIONS} />
        </VariantSection>

        <VariantSection
          letter="C"
          title="Timeline + Detail Panel"
          description="좌측 1/3 compact timeline + 우측 2/3 선택된 session detail. 학생 리스트 / 메모 / 진도 깊이 — 일별의 강점."
        >
          <VariantC sessions={TODAY_SESSIONS} />
        </VariantSection>

        <VariantSection
          letter="D"
          title="Hero + Insights"
          description="상단 현재/다음 hero 카드 + 시간대별 chip + 동선 통계 (빈 시간/이동 / 강사별 부하). 모바일 친화 + 운영 인사이트."
        >
          <VariantD sessions={TODAY_SESSIONS} />
        </VariantSection>
      </div>

      <section className="mt-10 max-w-3xl mx-auto text-sm text-slate-400">
        <h2 className="text-base font-bold text-slate-200 mb-2">결정 기준</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong className="text-slate-200">A Timeline</strong>: 시간 인지 / 겹침 시각화 최강. weekly 와 시각 일관.
          </li>
          <li>
            <strong className="text-slate-200">B Teacher Columns</strong>: 학원장의 운영 도구 — 강사 부하 / 빈 시간 직관.
          </li>
          <li>
            <strong className="text-slate-200">C Split View</strong>: detail 정보 깊이 — 학생/진도/메모 깊게 볼 때.
          </li>
          <li>
            <strong className="text-slate-200">D Hero+Insights</strong>: 운영 인사이트 + 모바일. "오늘 동선" 빠른 파악.
          </li>
          <li>혼합도 가능 (예: A + C — Timeline 클릭 시 detail panel 슬라이드)</li>
        </ul>
      </section>
    </div>
  );
}

function VariantSection({
  letter,
  title,
  description,
  children,
}: {
  letter: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 inline-flex items-center justify-center rounded bg-amber-500 text-slate-950 text-sm font-bold">
          {letter}
        </span>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">{description}</p>
      <div className="bg-slate-950 rounded border border-slate-800 p-4">{children}</div>
    </div>
  );
}

// ============================================================
// Variant A — Vertical Timeline
// ============================================================
function VariantA({ sessions }: { sessions: MockSession[] }) {
  const HOUR_HEIGHT = 64;
  const START_HOUR = 9;
  const END_HOUR = 21;
  const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  // Compute overlap groups — sessions sharing time get side-by-side
  const groups = new Map<string, MockSession[]>();
  for (const s of sessions) {
    const key = `${s.startsAt}-${s.endsAt}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  return (
    <div className="flex" style={{ height: TOTAL_HEIGHT + 32 }}>
      {/* Time axis */}
      <div className="w-14 shrink-0 border-r border-slate-800 text-[10px] text-slate-500 relative pt-3">
        {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute -translate-y-1/2"
            style={{ top: i * HOUR_HEIGHT + 12 }}
          >
            {`${START_HOUR + i}:00`.padStart(5, "0")}
          </div>
        ))}
      </div>

      {/* Sessions area */}
      <div className="flex-1 relative pt-3" style={{ minWidth: 600 }}>
        {/* Grid lines */}
        {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-slate-800"
            style={{ top: i * HOUR_HEIGHT + 12 }}
          />
        ))}
        {/* Current time line */}
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none"
          style={{
            top: ((CURRENT_TIME_MIN - START_HOUR * 60) / 60) * HOUR_HEIGHT + 12,
          }}
        >
          <div className="h-px bg-amber-500" />
          <span className="absolute -top-2 left-0 px-1.5 py-0.5 text-[9px] rounded bg-amber-500 text-slate-950 font-bold">
            지금
          </span>
        </div>

        {sessions.map((s) => {
          const groupKey = `${s.startsAt}-${s.endsAt}`;
          const group = groups.get(groupKey) ?? [s];
          const indexInGroup = group.indexOf(s);
          const widthPct = 100 / group.length;
          const startMin = timeToMin(s.startsAt) - START_HOUR * 60;
          const duration = timeToMin(s.endsAt) - timeToMin(s.startsAt);
          return (
            <div
              key={s.id}
              className="absolute rounded p-2 text-xs cursor-pointer group hover:shadow-lg transition-shadow"
              style={{
                top: (startMin / 60) * HOUR_HEIGHT + 12,
                height: (duration / 60) * HOUR_HEIGHT - 4,
                left: `${indexInGroup * widthPct}%`,
                width: `calc(${widthPct}% - 4px)`,
                background: `${s.subjectColor}22`,
                borderLeft: `3px solid ${s.subjectColor}`,
              }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-bold" style={{ color: s.subjectColor }}>
                  {s.subject}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <GripVertical
                    size={10}
                    className="text-slate-400 cursor-grab"
                  />
                  <Copy size={10} className="text-slate-400 cursor-pointer" />
                </div>
              </div>
              <div className="text-[10px] text-slate-400">
                {s.startsAt}-{s.endsAt}
              </div>
              <div className="text-[10px] text-slate-300 truncate mt-0.5">
                {s.students.join(", ")}
              </div>
              {s.teacher && (
                <div
                  className="text-[10px] mt-0.5 truncate"
                  style={{ color: s.teacherColor }}
                >
                  {s.teacher}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Variant B — Teacher Columns
// ============================================================
function VariantB({ sessions }: { sessions: MockSession[] }) {
  const teachersInOrder = Array.from(
    new Set(sessions.map((s) => s.teacher ?? "(미배정)")),
  );
  const HOUR_HEIGHT = 56;
  const START_HOUR = 9;
  const END_HOUR = 21;
  const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="flex" style={{ height: TOTAL_HEIGHT + 48 }}>
      <div className="w-12 shrink-0 border-r border-slate-800 text-[10px] text-slate-500 pt-10 relative">
        {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute -translate-y-1/2"
            style={{ top: 40 + i * HOUR_HEIGHT }}
          >
            {`${START_HOUR + i}:00`.padStart(5, "0")}
          </div>
        ))}
      </div>

      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${teachersInOrder.length}, 1fr)` }}>
        {teachersInOrder.map((teacher) => {
          const teacherSessions = sessions.filter(
            (s) => (s.teacher ?? "(미배정)") === teacher,
          );
          const teacherColor =
            teacherSessions[0]?.teacherColor ?? "#94a3b8";
          return (
            <div
              key={teacher}
              className="border-r border-slate-800 last:border-r-0 relative"
            >
              {/* Header */}
              <div
                className="text-[11px] font-semibold py-2 text-center border-b border-slate-800 sticky top-0 bg-slate-950"
                style={{ color: teacherColor }}
              >
                {teacher}
                <span className="ml-1 text-[9px] text-slate-500">
                  ({teacherSessions.length})
                </span>
              </div>
              {/* Grid lines */}
              <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-slate-800/50"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}
                {teacherSessions.map((s) => {
                  const startMin = timeToMin(s.startsAt) - START_HOUR * 60;
                  const duration = timeToMin(s.endsAt) - timeToMin(s.startsAt);
                  return (
                    <div
                      key={s.id}
                      className="absolute left-1 right-1 rounded p-1.5 cursor-pointer group hover:shadow-lg"
                      style={{
                        top: (startMin / 60) * HOUR_HEIGHT,
                        height: (duration / 60) * HOUR_HEIGHT - 4,
                        background: `${s.subjectColor}22`,
                        borderLeft: `3px solid ${s.subjectColor}`,
                      }}
                    >
                      <div className="text-[10px] font-bold" style={{ color: s.subjectColor }}>
                        {s.subject}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {s.startsAt}
                      </div>
                      <div className="text-[9px] text-slate-300 truncate">
                        {s.students.join(", ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Variant C — Timeline + Detail Panel
// ============================================================
function VariantC({ sessions }: { sessions: MockSession[] }) {
  const [selectedId, setSelectedId] = useState(sessions[2]?.id ?? null);
  const selected = sessions.find((s) => s.id === selectedId);
  const HOUR_HEIGHT = 44;
  const START_HOUR = 9;
  const END_HOUR = 21;
  const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="flex gap-4" style={{ height: TOTAL_HEIGHT + 24 }}>
      {/* Compact timeline (1/3) */}
      <div className="w-1/3 flex">
        <div className="w-12 shrink-0 border-r border-slate-800 text-[10px] text-slate-500 relative pt-2">
          {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute -translate-y-1/2"
              style={{ top: i * HOUR_HEIGHT + 8 }}
            >
              {`${START_HOUR + i}:00`.padStart(5, "0")}
            </div>
          ))}
        </div>
        <div className="flex-1 relative pt-2">
          {sessions.map((s) => {
            const startMin = timeToMin(s.startsAt) - START_HOUR * 60;
            const duration = timeToMin(s.endsAt) - timeToMin(s.startsAt);
            const isSelected = s.id === selectedId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="absolute left-0.5 right-0.5 rounded text-left transition-all"
                style={{
                  top: (startMin / 60) * HOUR_HEIGHT + 8,
                  height: (duration / 60) * HOUR_HEIGHT - 2,
                  background: isSelected
                    ? `${s.subjectColor}44`
                    : `${s.subjectColor}1a`,
                  borderLeft: `3px solid ${s.subjectColor}`,
                  outline: isSelected
                    ? `2px solid ${s.subjectColor}`
                    : undefined,
                }}
              >
                <div
                  className="px-1.5 text-[10px] font-bold truncate"
                  style={{ color: s.subjectColor }}
                >
                  {s.subject}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel (2/3) */}
      <div className="flex-1 rounded-lg bg-slate-900 border border-slate-800 p-4 overflow-y-auto">
        {selected ? (
          <>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4
                  className="text-xl font-bold mb-1"
                  style={{ color: selected.subjectColor }}
                >
                  {selected.subject}
                </h4>
                <div className="text-xs text-slate-400">
                  {selected.startsAt} – {selected.endsAt}
                  {selected.teacher && (
                    <>
                      {" · "}
                      <span style={{ color: selected.teacherColor }}>
                        {selected.teacher}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400">
                  <GripVertical size={14} />
                </button>
                <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400">
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1">
                <Users size={11} /> 학생 ({selected.students.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selected.students.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-1 text-xs rounded-full bg-slate-800 text-slate-300"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {selected.note && (
              <div>
                <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1">
                  <MessageCircle size={11} /> 메모
                </div>
                <p className="text-sm text-slate-300 p-2 rounded bg-slate-800/60">
                  {selected.note}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-500 py-12">
            왼쪽에서 수업을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Variant D — Hero + Insights
// ============================================================
function VariantD({ sessions }: { sessions: MockSession[] }) {
  // 현재 시각 기준 다음 수업
  const next = sessions.find((s) => timeToMin(s.startsAt) >= CURRENT_TIME_MIN);
  const morning = sessions.filter((s) => timeToMin(s.startsAt) < 12 * 60);
  const afternoon = sessions.filter(
    (s) =>
      timeToMin(s.startsAt) >= 12 * 60 && timeToMin(s.startsAt) < 18 * 60,
  );
  const evening = sessions.filter((s) => timeToMin(s.startsAt) >= 18 * 60);
  const teacherCounts = new Map<string, number>();
  for (const s of sessions) {
    const k = s.teacher ?? "(미배정)";
    teacherCounts.set(k, (teacherCounts.get(k) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      {/* Hero card */}
      {next && (
        <div
          className="rounded-lg p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${next.subjectColor}33 0%, ${next.subjectColor}11 100%)`,
            borderLeft: `4px solid ${next.subjectColor}`,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                <Clock size={10} className="inline mr-1" /> 다음 수업
              </div>
              <h4
                className="text-2xl font-bold mb-1"
                style={{ color: next.subjectColor }}
              >
                {next.subject}
              </h4>
              <div className="text-sm text-slate-300">
                {next.startsAt} – {next.endsAt} · {next.teacher} · {next.students.length}명
              </div>
            </div>
            <div className="flex gap-1">
              <button className="p-2 rounded hover:bg-white/5 text-slate-400">
                <GripVertical size={14} />
              </button>
              <button className="p-2 rounded hover:bg-white/5 text-slate-400">
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insight stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="오늘 수업" value={`${sessions.length}개`} />
        <Stat
          label="강사"
          value={`${teacherCounts.size}명`}
          subtitle={Array.from(teacherCounts.entries())
            .slice(0, 2)
            .map(([k, v]) => `${k} ${v}`)
            .join(" · ")}
        />
        <Stat
          label="최대 겹침"
          value={`${Math.max(
            ...Array.from(
              sessions.reduce<Map<string, number>>((acc, s) => {
                const k = s.startsAt;
                acc.set(k, (acc.get(k) ?? 0) + 1);
                return acc;
              }, new Map()).values(),
            ),
          )}-stack`}
          subtitle="14:00"
        />
      </div>

      {/* Time-of-day chips */}
      {[
        { label: "오전", items: morning },
        { label: "오후", items: afternoon },
        { label: "저녁", items: evening },
      ].map(
        ({ label, items }) =>
          items.length > 0 && (
            <div key={label}>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                {label} ({items.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => (
                  <button
                    key={s.id}
                    className="px-3 py-2 rounded-lg text-xs text-left group hover:shadow-lg transition-shadow"
                    style={{
                      background: `${s.subjectColor}22`,
                      borderLeft: `3px solid ${s.subjectColor}`,
                    }}
                  >
                    <div
                      className="font-bold"
                      style={{ color: s.subjectColor }}
                    >
                      {s.subject}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {s.startsAt}-{s.endsAt}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate max-w-[160px]">
                      {s.students.join(", ")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ),
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
      {subtitle && (
        <div className="text-[10px] text-slate-500 mt-1 truncate">{subtitle}</div>
      )}
    </div>
  );
}
