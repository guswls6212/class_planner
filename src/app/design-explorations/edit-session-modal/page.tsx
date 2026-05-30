"use client";

/**
 * Edit Session Modal — Design Exploration: 수업 편집 모달 redesign mockup.
 * 사용자 시각 검증용 정적 페이지. production 흐름과 분리.
 *
 * 의존성:
 *   - 자체 inline state 만 (실제 hook/api 미연결)
 *   - non-goal: 실제 session edit (production 은 `/schedule/_components/EditSessionModal.tsx`)
 *
 * 결정 history:
 *   - Mockup 페이지 — 신규 mockup 은 internal-dashboard 의무 (CLAUDE.md § Mockup-in-Internal-Dashboard).
 *   - 본 페이지는 legacy 잔여 — production deploy 사이트 (class-planner.info365.studio) 비공개 라우트.
 *   - ADR-002 (2026-05-28): 응집 UI mockup, 분리 needs-review (mockup 자체 응집).
 *
 * Sniff test: UI mockup 한 도메인 (edit session redesign). 분리 후보: 없음 (mockup 응집).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  GraduationCap,
  X,
  ChevronDown,
  AlertCircle,
  Check,
  Trash2,
  Search,
} from "lucide-react";

/**
 * design-explorations: EditSessionModal 재설계 4 variants 비교.
 *
 * 사용자 요청:
 * 1) 헤더 inline edit — 요일/시간 chip 클릭 → popover로 편집 (현재는 read-only 축약)
 * 2) 과목 위치 — 헤더 chip vs body 맨 위
 * 3) 학생/강사 — body 그대로 (대상자 많음)
 * 4) Validation 통일 — 학생 0명 + 저장 → 세션 삭제 사고. 필수 미충족 시 저장 막아야.
 * 5) 데스크탑/모바일 양쪽 고려.
 *
 * Variant A — 최소 변경 (헤더에 요일·시간 chip만, 과목·강사·학생은 body)
 * Variant B — 헤더에 과목·요일·시간 3-chip, 강사·학생만 body (과목 popover dropdown)
 * Variant C — 헤더 메타(요일·시간) + body 최상단 sticky meta(과목·강사) + 학생 picker
 * Variant D — 헤더 4-chip(과목·요일·시간·강사 N명), 학생만 body (가장 minimal body)
 *
 * Validation:
 *   V1 — 저장 disabled + helper text ("학생 1명 이상 선택 필요")
 *   V2 — 저장 enabled, 클릭 시 inline error (빨간 border + 오류 메시지)
 *   V3 — 저장 enabled, 클릭 시 toast 띄움
 */

type Variant = "A" | "B" | "C" | "D";
type ValidationMode = "V1-disabled" | "V2-inline" | "V3-toast";
type Viewport = "desktop" | "mobile";

const VARIANT_NAMES: Record<Variant, string> = {
  A: "헤더 chip 2개 (요일·시간) — 과목/강사/학생은 body. 최소 변경",
  B: "헤더 chip 3개 (과목·요일·시간) — 강사/학생만 body",
  C: "헤더 메타(요일·시간) + body sticky 상단(과목·강사) + 학생 picker",
  D: "헤더 chip 4개 (과목·요일·시간·강사 요약) — 학생만 body (가장 minimal)",
};

const VALIDATION_DESCRIPTIONS: Record<ValidationMode, string> = {
  "V1-disabled": "저장 버튼 disabled — 필수 미충족 시 클릭 자체 안 됨. 옆에 helper text",
  "V2-inline": "저장 enabled — 클릭 시 빈 필드에 빨간 border + 오류 메시지",
  "V3-toast": "저장 enabled — 클릭 시 toast로 안내",
};

// 강사 mock — subjectIds 포함해 "이 과목 담당" 그룹화 시뮬
const MOCK_TEACHERS = [
  { id: "t1", name: "김선생", color: "bg-emerald-400", subjectIds: ["sub1"] }, // 고등수학 담당
  { id: "t2", name: "김학성", color: "bg-violet-400", subjectIds: ["sub2", "sub4"] },
  { id: "t3", name: "김민철", color: "bg-rose-400", subjectIds: ["sub3"] },
  { id: "t4", name: "김진성", color: "bg-emerald-500", subjectIds: [] },
  { id: "t5", name: "박선생", color: "bg-pink-400", subjectIds: ["sub3", "sub4"] },
  { id: "t6", name: "이선생", color: "bg-amber-400", subjectIds: ["sub2"] },
];

// 학생 100명 mock — 검색 시뮬 (실제 EditSessionModal의 학생 picker는 검색 input + filtered list)
const COLORS = ["bg-rose-300", "bg-amber-300", "bg-violet-300", "bg-emerald-300", "bg-sky-300", "bg-pink-300", "bg-teal-300", "bg-indigo-300"];
const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권"];
const GIVEN_NAMES = ["민준", "서연", "지호", "예린", "유진", "도현", "수아", "지우", "하윤", "시우", "은서", "지안", "주원", "지원", "다은", "건우", "예준", "서윤", "하준", "지유"];

const MOCK_STUDENTS = Array.from({ length: 100 }, (_, i) => {
  const surname = SURNAMES[i % SURNAMES.length];
  const given = GIVEN_NAMES[Math.floor(i / SURNAMES.length) % GIVEN_NAMES.length];
  return {
    id: `s${i + 1}`,
    name: `${surname}${given}`,
    color: COLORS[i % COLORS.length],
    grade: i % 6 === 0 ? "중1" : i % 6 === 1 ? "중2" : i % 6 === 2 ? "중3" : i % 6 === 3 ? "고1" : i % 6 === 4 ? "고2" : "고3",
  };
});

const MOCK_SUBJECTS = [
  { id: "sub1", name: "고등수학", color: "text-violet-300", bg: "bg-violet-500/20", hex: "#a78bfa" },
  { id: "sub2", name: "중등수학", color: "text-rose-300", bg: "bg-rose-500/20", hex: "#fb7185" },
  { id: "sub3", name: "고등영어", color: "text-amber-300", bg: "bg-amber-500/20", hex: "#fbbf24" },
  { id: "sub4", name: "중등영어", color: "text-emerald-300", bg: "bg-emerald-500/20", hex: "#34d399" },
];

// 실제 EditSessionModal의 PRESET_COLORS와 동일 패턴 — 12 swatches.
const SUBJECT_SWATCHES = [
  "#a78bfa", "#fb7185", "#fbbf24", "#34d399",
  "#60a5fa", "#f472b6", "#22d3ee", "#a3e635",
  "#fb923c", "#c084fc", "#2dd4bf", "#fde047",
];

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

// ─────────────────────────────────────────────────────────────────────────────
// Popovers (chip 클릭 시 floating)
// ─────────────────────────────────────────────────────────────────────────────

// 캘린더 variant 4종 — 사용자가 본인 브라우저로 직접 비교 후 선택.
// 모두 weekday(월=0~일=6)를 반환. 다른 주/달의 날짜 선택해도 weekday만 추출.
type CalendarVariant = "v1-grid" | "v2-week" | "v3-month" | "v4-two-week";

// mock 기준 날짜 — 2026년 5월 11일(월요일)이 이번 주 시작
const MOCK_WEEK_START = new Date(2026, 4, 11); // month=4 → 5월

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

function getWeekdayFromDate(d: Date): number {
  // JS getDay(): 일=0, 월=1, …, 토=6 → 우리 컨벤션 월=0, …, 일=6
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatDateShort(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatDateChip(weekday: number): string {
  const d = addDays(MOCK_WEEK_START, weekday);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[weekday]})`;
}

// ──── Variant 1: 7-grid (기존, 가장 단순) ────────────────────────────
function CalendarV1Grid({ value, onChange, onClose }: { value: number; onChange: (n: number) => void; onClose: () => void }) {
  return (
    <div className="absolute top-full mt-2 left-0 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 w-[280px]">
      <div className="text-[11px] text-slate-400 mb-2">요일 선택 (V1: 7-grid, 가장 단순)</div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label, idx) => {
          const active = idx === value;
          return (
            <button
              key={idx}
              onClick={() => { onChange(idx); onClose(); }}
              className={`h-9 rounded text-sm font-medium ${
                active ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──── Variant 2: 이번 주 (요일 + 날짜 표시) ────────────────────────
function CalendarV2Week({ value, onChange, onClose }: { value: number; onChange: (n: number) => void; onClose: () => void }) {
  const today = new Date(2026, 4, 12); // mock today = 5월 12일 (화)
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  return (
    <div className="absolute top-full mt-2 left-0 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 w-[320px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-slate-400">이번 주 (V2: 요일 + 날짜)</div>
        <div className="text-[10px] text-slate-500">2026.05.11 — 17</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label, idx) => {
          const d = addDays(MOCK_WEEK_START, idx);
          const active = idx === value;
          const todayMark = isToday(d);
          return (
            <button
              key={idx}
              onClick={() => { onChange(idx); onClose(); }}
              className={`h-14 rounded flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span className="text-[10px] opacity-80">{label}</span>
              <span className={`text-base font-bold ${todayMark && !active ? "text-amber-300" : ""}`}>
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-slate-500">오늘은 amber 강조</div>
    </div>
  );
}

// ──── Variant 3: 1달 캘린더 (월 navigation) ───────────────────────
function CalendarV3Month({ value, onChange, onClose }: { value: number; onChange: (n: number) => void; onClose: () => void }) {
  const [viewMonth, setViewMonth] = useState(new Date(2026, 4, 1)); // 5월
  const today = new Date(2026, 4, 12); // mock today = 5월 12일 (화)

  // 선택된 날짜 = mock 이번 주의 weekday 위치 (이번 주 외 다른 주는 무관)
  const selectedDate = addDays(MOCK_WEEK_START, value);

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();

  // 1일이 무슨 요일인지
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const firstWeekday = getWeekdayFromDate(firstDay); // 우리 컨벤션 (월=0)
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

  // grid cells — 앞 padding + 1~daysInMonth + 뒤 padding (총 42셀 = 6 rows × 7 cols)
  const cells: { date: Date | null; label: number | null }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, label: null });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day), label: day });
  }
  while (cells.length < 42) cells.push({ date: null, label: null });

  const navMonth = (delta: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  return (
    <div className="absolute top-full mt-2 left-0 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 w-[320px]">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navMonth(-1)} className="w-6 h-6 rounded text-slate-400 hover:bg-slate-800">‹</button>
        <div className="text-sm font-medium text-slate-200">
          {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
        </div>
        <button onClick={() => navMonth(1)} className="w-6 h-6 rounded text-slate-400 hover:bg-slate-800">›</button>
      </div>
      <div className="text-[10px] text-slate-500 mb-1 text-center">V3: 1달 캘린더 (다른 달 navigation 가능)</div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((label) => (
          <div key={label} className="text-[10px] text-slate-500 text-center py-1">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, idx) => {
          if (!cell.date) return <div key={idx} className="h-8" />;
          const selected = isSelected(cell.date);
          const todayMark = isToday(cell.date);
          let cls = "text-slate-300 hover:bg-slate-800";
          if (selected) {
            cls = "bg-amber-500 text-slate-900 font-bold"; // 선택된 날짜 = 진한 amber
          } else if (todayMark) {
            cls = "ring-1 ring-amber-400 text-amber-300 hover:bg-slate-800"; // 오늘 = ring으로 옅게 구분
          }
          return (
            <button
              key={idx}
              onClick={() => {
                onChange(getWeekdayFromDate(cell.date!));
                onClose();
              }}
              className={`h-8 rounded text-xs transition-colors ${cls}`}
            >
              {cell.label}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-slate-500">
        선택된 날짜 = 진한 amber · 오늘 = amber ring · 다른 날짜 클릭 시 그 weekday로 적용
      </div>
    </div>
  );
}

// ──── Variant 4: 2주 (이번주 + 다음주) ──────────────────────────────
function CalendarV4TwoWeek({ value, onChange, onClose }: { value: number; onChange: (n: number) => void; onClose: () => void }) {
  const today = new Date(2026, 4, 12);
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  return (
    <div className="absolute top-full mt-2 left-0 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 w-[320px]">
      <div className="text-[11px] text-slate-400 mb-2">2주 (V4: 이번주 + 다음주)</div>
      {[0, 1].map((row) => {
        const weekStart = addDays(MOCK_WEEK_START, row * 7);
        return (
          <div key={row} className="mb-1.5">
            <div className="text-[10px] text-slate-500 mb-0.5">
              {row === 0 ? "이번 주" : "다음 주"} · {formatDateShort(weekStart)} —{" "}
              {formatDateShort(addDays(weekStart, 6))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((label, idx) => {
                const d = addDays(weekStart, idx);
                const active = idx === value;
                const todayMark = isToday(d);
                return (
                  <button
                    key={idx}
                    onClick={() => { onChange(idx); onClose(); }}
                    className={`h-12 rounded flex flex-col items-center justify-center gap-0.5 transition-colors ${
                      active
                        ? "bg-amber-500 text-slate-900"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-[9px] opacity-80">{label}</span>
                    <span className={`text-sm font-bold ${todayMark && !active ? "text-amber-300" : ""}`}>
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekdayPopover({ value, onChange, onClose, variant }: {
  value: number;
  onChange: (n: number) => void;
  onClose: () => void;
  variant: CalendarVariant;
}) {
  if (variant === "v2-week") return <CalendarV2Week value={value} onChange={onChange} onClose={onClose} />;
  if (variant === "v3-month") return <CalendarV3Month value={value} onChange={onChange} onClose={onClose} />;
  if (variant === "v4-two-week") return <CalendarV4TwoWeek value={value} onChange={onChange} onClose={onClose} />;
  return <CalendarV1Grid value={value} onChange={onChange} onClose={onClose} />;
}

function TimePopover({ start, end, onChange, onClose }: { start: string; end: string; onChange: (s: string, e: string) => void; onClose: () => void }) {
  const [s, setS] = useState(start);
  const [e, setE] = useState(end);
  return (
    <div className="absolute top-full mt-2 left-0 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 w-[280px]">
      <div className="text-[11px] text-slate-400 mb-2">수업 시간</div>
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={s}
          onChange={(ev) => setS(ev.target.value)}
          className="flex-1 bg-slate-800 text-slate-200 rounded px-2 py-1 text-sm border border-slate-700"
        />
        <span className="text-slate-500">—</span>
        <input
          type="time"
          value={e}
          onChange={(ev) => setE(ev.target.value)}
          className="flex-1 bg-slate-800 text-slate-200 rounded px-2 py-1 text-sm border border-slate-700"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1">취소</button>
        <button
          onClick={() => {
            onChange(s, e);
            onClose();
          }}
          className="text-xs bg-amber-500 text-slate-900 rounded px-3 py-1 font-semibold"
        >
          적용
        </button>
      </div>
    </div>
  );
}

// 색 선택 패널 — 실제 EditSessionModal의 colorPanel(line 232) 패턴 모방.
// tinted IconButton (현재 색 dot) + 클릭 시 swatch grid popover.
function ColorPanel({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="과목 색상 변경"
        className="w-8 h-8 rounded-md inline-flex items-center justify-center transition-colors hover:opacity-80"
        style={{ backgroundColor: `${value}26` }}
      >
        <span
          className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20"
          style={{ backgroundColor: value }}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-30 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl" style={{ minWidth: 220 }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5 px-0.5">
              과목 대표색 (텍스트 · 강조)
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {SUBJECT_SWATCHES.map((c) => {
                const active = c.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onChange(c);
                      setOpen(false);
                    }}
                    title={c}
                    className={`w-7 h-7 rounded-full transition-all ${
                      active ? "ring-2 ring-amber-400 scale-110" : "ring-1 ring-slate-700 hover:ring-slate-500"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
            <div className="mt-2.5 text-[10px] text-slate-500">
              현재 미리보기 색은 저장 시에만 persist (취소 시 원복)
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SubjectPopover({ value, onChange, onClose }: { value: string; onChange: (id: string) => void; onClose: () => void }) {
  return (
    <div className="absolute top-full mt-2 left-0 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 w-[220px]">
      <div className="text-[11px] text-slate-400 px-2 pt-1 pb-2">과목 선택</div>
      <div className="flex flex-col gap-1">
        {MOCK_SUBJECTS.map((sub) => {
          const active = sub.id === value;
          return (
            <button
              key={sub.id}
              onClick={() => {
                onChange(sub.id);
                onClose();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                active ? "bg-amber-500/15 text-amber-200" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${sub.bg.replace("/20", "")}`} />
              <span className="flex-1">{sub.name}</span>
              {active && <Check size={14} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chips (헤더용)
// ─────────────────────────────────────────────────────────────────────────────

interface ChipProps {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  invalid?: boolean;
}
function Chip({ icon, label, onClick, active, invalid }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
        invalid
          ? "bg-red-500/15 text-red-300 border-red-500/40"
          : active
            ? "bg-amber-500/20 text-amber-200 border-amber-500/50"
            : "bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal body parts
// ─────────────────────────────────────────────────────────────────────────────

function SubjectBlock({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: string }) {
  const sub = MOCK_SUBJECTS.find((s) => s.id === value) ?? MOCK_SUBJECTS[0];
  return (
    <div>
      <label className="text-[11px] text-slate-400 mb-1.5 block">과목 <span className="text-red-400">*</span></label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm appearance-none border ${error ? "border-red-500/50" : "border-slate-700"}`}
        >
          {MOCK_SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// 강사 picker — 실제 TeacherPillPicker 모방: 현재 과목 담당 / 기타 그룹화
function TeacherBlock({
  selectedIds,
  onToggle,
  subjectId,
}: {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  subjectId: string;
}) {
  const subjectName = MOCK_SUBJECTS.find((s) => s.id === subjectId)?.name ?? "";
  const primary = MOCK_TEACHERS.filter((t) => t.subjectIds.includes(subjectId));
  const others = MOCK_TEACHERS.filter((t) => !t.subjectIds.includes(subjectId));

  const renderChip = (t: typeof MOCK_TEACHERS[number]) => {
    const active = selectedIds.has(t.id);
    const subjectsLabel = t.subjectIds
      .map((id) => MOCK_SUBJECTS.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    // 동명이인 부제 — 실제는 TeacherChip 컴포넌트의 hover element가 처리. mockup은 title로 시뮬.
    const tooltip = subjectsLabel ? `${t.name} (담당: ${subjectsLabel})` : `${t.name}`;
    return (
      <button
        key={t.id}
        onClick={() => onToggle(t.id)}
        title={tooltip}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] border transition-colors ${
          active
            ? "bg-violet-500/15 text-violet-200 border-violet-500/50"
            : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${t.color}`} />
        {t.name}
      </button>
    );
  };

  // 강사가 많아도 학생 영역 공간을 보호하기 위해 max-h + scroll. 보통 6-12명 시
  // 자연 fit. 30명+ 학원이면 scroll로 처리.
  return (
    <div className="flex-shrink-0">
      <label className="text-[11px] text-slate-400 block mb-1.5">강사</label>
      <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
        {primary.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <span className="text-slate-300">{subjectName} 담당</span>
              <span className="px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px]">{primary.length}명</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{primary.map(renderChip)}</div>
          </div>
        )}
        <div>
          <div className="text-[10px] text-slate-500 mb-1.5">기타 강사</div>
          <div className="flex flex-wrap gap-1.5">{others.map(renderChip)}</div>
        </div>
      </div>
    </div>
  );
}

// 학생 picker — 실제 EditSessionModal 모방:
// (1) 선택된 학생 chips 위에 노출
// (2) 검색 input
// (3) 미선택 학생 list (스크롤). 검색어 있으면 필터.
// 100명 mock으로 검색 동작 시뮬.
function StudentBlock({
  selectedIds,
  onToggle,
  error,
  flexible,
}: {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  error?: string;
  /** true: 외부 flex 컨테이너 안에서 남은 높이 채우기 (C variant). false: 고정 max-h. */
  flexible?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedStudents = MOCK_STUDENTS.filter((s) => selectedIds.has(s.id));
  const unselected = MOCK_STUDENTS.filter((s) => !selectedIds.has(s.id));
  const filtered = searchTerm.trim()
    ? unselected.filter((s) => s.name.includes(searchTerm.trim()))
    : unselected;

  return (
    <div className={flexible ? "flex flex-col flex-1 min-h-0" : ""}>
      <label className="text-[11px] text-slate-400 mb-1.5 block flex-shrink-0">
        학생 <span className="text-red-400">*</span>{" "}
        <span className="text-slate-500">(최소 1명, 전체 {MOCK_STUDENTS.length}명)</span>
      </label>
      <div className={`rounded-lg border ${flexible ? "flex flex-col flex-1 min-h-0 overflow-hidden" : ""} ${error ? "border-red-500/50 bg-red-500/5" : "border-slate-700 bg-slate-800/40"}`}>
        {/* 선택된 학생 chips — flex-shrink-0으로 절대 가려지지 않음 */}
        {selectedStudents.length > 0 && (
          <div className="p-2 border-b border-slate-700/60 flex-shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {selectedStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onToggle(s.id)}
                  title={`${s.grade} ${s.name}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] bg-amber-500/15 text-amber-200 border border-amber-500/50"
                >
                                    {s.name}
                  <X size={11} className="opacity-60 hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 검색 input */}
        <div className="p-2 border-b border-slate-700/60 flex items-center gap-2 flex-shrink-0">
          <Search size={13} className="text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={selectedStudents.length === 0 ? "학생 검색 또는 새 이름 입력…" : "추가 학생 검색…"}
            className="flex-1 bg-transparent text-[12px] text-slate-200 placeholder:text-slate-500 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* 미선택 학생 list — flexible 시 부모 flex 컨테이너의 남은 공간 채움, 아니면 고정 max-h */}
        <div className={`p-2 overflow-y-auto ${flexible ? "flex-1 min-h-0" : "max-h-[180px]"}`}>
          <div className="text-[10px] text-slate-500 mb-1.5 px-1">
            {searchTerm.trim()
              ? `검색 결과 (${filtered.length})`
              : `미선택 학생 (${unselected.length})`}
          </div>
          {filtered.length === 0 ? (
            <div className="text-[11px] text-slate-500 text-center py-3">
              {searchTerm.trim() ? (
                <>
                  검색 결과 없음.
                  <button className="ml-1 text-amber-300 hover:text-amber-200 underline">
                    + &lsquo;{searchTerm.trim()}&rsquo; 새 학생으로 추가
                  </button>
                </>
              ) : (
                "더 추가할 학생이 없습니다"
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.slice(0, 30).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onToggle(s.id)}
                  title={`${s.grade} ${s.name}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-slate-300 hover:bg-slate-800 text-left"
                >
                  <span className="flex-1">{s.name}</span>
                  <span className="text-[10px] text-slate-500">{s.grade}</span>
                </button>
              ))}
              {filtered.length > 30 && (
                <div className="text-[10px] text-slate-500 text-center py-1">
                  ... {filtered.length - 30}명 더. 검색으로 좁혀주세요.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal mockup (single variant)
// ─────────────────────────────────────────────────────────────────────────────

interface ModalState {
  weekday: number;
  startsAt: string;
  endsAt: string;
  subjectId: string;
  /** 과목 미리보기 색. 저장 시에만 실제 과목 색으로 persist (mockup 시뮬). */
  previewColor: string;
  teacherIds: Set<string>;
  studentIds: Set<string>;
}

function durationLabel(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 && m > 0 ? `${h}시간 ${m}분` : h > 0 ? `${h}시간` : `${m}분`;
}

function teacherSummary(ids: Set<string>): string {
  const list = MOCK_TEACHERS.filter((t) => ids.has(t.id));
  if (list.length === 0) return "강사 미배정";
  if (list.length === 1) return list[0].name;
  return `${list[0].name} 외 ${list.length - 1}명`;
}

function ModalMockup({
  variant,
  validation,
  viewport,
  state,
  setState,
  showInlineErrors,
  setShowInlineErrors,
  setToastMessage,
  calendarVariant,
}: {
  variant: Variant;
  validation: ValidationMode;
  viewport: Viewport;
  state: ModalState;
  setState: React.Dispatch<React.SetStateAction<ModalState>>;
  showInlineErrors: boolean;
  setShowInlineErrors: (b: boolean) => void;
  setToastMessage: (msg: string | null) => void;
  calendarVariant: CalendarVariant;
}) {
  const [openPopover, setOpenPopover] = useState<"weekday" | "time" | "subject" | null>(null);

  const subject = MOCK_SUBJECTS.find((s) => s.id === state.subjectId) ?? MOCK_SUBJECTS[0];

  // Validation
  const studentCount = state.studentIds.size;
  const isValid = studentCount >= 1 && !!state.subjectId;
  const saveDisabled = validation === "V1-disabled" && !isValid;
  const studentError =
    (validation === "V2-inline" && showInlineErrors && studentCount === 0)
      ? "학생을 1명 이상 선택해주세요."
      : undefined;

  const handleSave = () => {
    if (!isValid) {
      if (validation === "V2-inline") setShowInlineErrors(true);
      else if (validation === "V3-toast") {
        setToastMessage("학생을 1명 이상 선택해주세요.");
        setTimeout(() => setToastMessage(null), 3000);
      }
      return;
    }
    setShowInlineErrors(false);
    setToastMessage("저장됨 (mockup)");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const modalWidth = viewport === "mobile" ? "w-[360px]" : "w-[480px]";

  // Header chips per variant
  // 헤더 chip label — "5월 15일 (목)" 식 (mock week 기준)
  const weekdayChip = (
    <div className="relative inline-block">
      <Chip
        icon={<CalendarIcon size={14} />}
        label={formatDateChip(state.weekday)}
        onClick={() => setOpenPopover(openPopover === "weekday" ? null : "weekday")}
        active={openPopover === "weekday"}
      />
      {openPopover === "weekday" && (
        <WeekdayPopover
          value={state.weekday}
          onChange={(n) => setState((s) => ({ ...s, weekday: n }))}
          onClose={() => setOpenPopover(null)}
          variant={calendarVariant}
        />
      )}
    </div>
  );
  const timeChip = (
    <div className="relative inline-block">
      <Chip
        icon={<Clock size={14} />}
        label={`${state.startsAt}–${state.endsAt} · ${durationLabel(state.startsAt, state.endsAt)}`}
        onClick={() => setOpenPopover(openPopover === "time" ? null : "time")}
        active={openPopover === "time"}
      />
      {openPopover === "time" && (
        <TimePopover
          start={state.startsAt}
          end={state.endsAt}
          onChange={(s, e) => setState((p) => ({ ...p, startsAt: s, endsAt: e }))}
          onClose={() => setOpenPopover(null)}
        />
      )}
    </div>
  );
  const subjectChip = (
    <div className="relative inline-block">
      <Chip
        label={subject.name}
        onClick={() => setOpenPopover(openPopover === "subject" ? null : "subject")}
        active={openPopover === "subject"}
      />
      {openPopover === "subject" && (
        <SubjectPopover
          value={state.subjectId}
          onChange={(id) => {
            const sub = MOCK_SUBJECTS.find((s) => s.id === id);
            setState((p) => ({ ...p, subjectId: id, previewColor: sub?.hex ?? p.previewColor }));
          }}
          onClose={() => setOpenPopover(null)}
        />
      )}
    </div>
  );
  const teacherChip = (
    <Chip icon={<GraduationCap size={14} />} label={teacherSummary(state.teacherIds)} />
  );

  // Header row composition by variant
  let headerChips: React.ReactNode;
  if (variant === "A") headerChips = <>{weekdayChip}{timeChip}</>;
  else if (variant === "B") headerChips = <>{subjectChip}{weekdayChip}{timeChip}</>;
  else if (variant === "C") headerChips = <>{weekdayChip}{timeChip}</>;
  else headerChips = <>{subjectChip}{weekdayChip}{timeChip}{teacherChip}</>;

  // Body composition
  const renderBody = () => {
    if (variant === "A") {
      return (
        <>
          <SubjectBlock value={state.subjectId} onChange={(id) => {
            const sub = MOCK_SUBJECTS.find((s) => s.id === id);
            setState((p) => ({ ...p, subjectId: id, previewColor: sub?.hex ?? p.previewColor }));
          }} />
          <TeacherBlock subjectId={state.subjectId} selectedIds={state.teacherIds} onToggle={(id) => setState((p) => ({ ...p, teacherIds: toggleSet(p.teacherIds, id) }))} />
          <StudentBlock
            selectedIds={state.studentIds}
            onToggle={(id) => setState((p) => ({ ...p, studentIds: toggleSet(p.studentIds, id) }))}
            error={studentError}
          />
        </>
      );
    }
    if (variant === "B") {
      return (
        <>
          <TeacherBlock subjectId={state.subjectId} selectedIds={state.teacherIds} onToggle={(id) => setState((p) => ({ ...p, teacherIds: toggleSet(p.teacherIds, id) }))} />
          <StudentBlock
            selectedIds={state.studentIds}
            onToggle={(id) => setState((p) => ({ ...p, studentIds: toggleSet(p.studentIds, id) }))}
            error={studentError}
          />
        </>
      );
    }
    if (variant === "C") {
      // flexbox column 구조 — sticky 안 씀.
      // 과목/강사는 고정 위치, 학생 영역만 자체 scroll. 학생 영역 안에서
      // selected chip + 검색은 항상 보임, list만 scroll.
      // 실제 구현 시 modal body의 max-h-[400px] 위치는 minWidth 0/flex column
      // overflow-hidden 으로 학생 list가 정확히 남은 공간 scroll.
      return (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <SubjectBlock value={state.subjectId} onChange={(id) => {
            const sub = MOCK_SUBJECTS.find((s) => s.id === id);
            setState((p) => ({ ...p, subjectId: id, previewColor: sub?.hex ?? p.previewColor }));
          }} />
          <TeacherBlock subjectId={state.subjectId} selectedIds={state.teacherIds} onToggle={(id) => setState((p) => ({ ...p, teacherIds: toggleSet(p.teacherIds, id) }))} />
          <StudentBlock
            selectedIds={state.studentIds}
            onToggle={(id) => setState((p) => ({ ...p, studentIds: toggleSet(p.studentIds, id) }))}
            error={studentError}
            flexible
          />
        </div>
      );
    }
    // D: body has only students
    return (
      <StudentBlock
        selectedIds={state.studentIds}
        onToggle={(id) => setState((p) => ({ ...p, studentIds: toggleSet(p.studentIds, id) }))}
        error={studentError}
      />
    );
  };

  // Save button helper text (V1)
  const saveHelper = validation === "V1-disabled" && !isValid ? "학생 1명 이상 선택 필요" : null;

  return (
    <div className={`${modalWidth} bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl`}>
      {/* Modal header */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-100 truncate">{subject.name}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">수업 편집</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ColorPanel
              value={state.previewColor}
              onChange={(c) => setState((p) => ({ ...p, previewColor: c }))}
            />
            <button className="w-8 h-8 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 inline-flex items-center justify-center" title="삭제">
              <Trash2 size={16} />
            </button>
            <button className="w-8 h-8 rounded-md text-slate-400 hover:bg-slate-800 inline-flex items-center justify-center" title="닫기">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Header chip row — variant 별 */}
        <div className={`mt-3 flex ${viewport === "mobile" ? "flex-wrap" : "flex-wrap"} items-center gap-1.5`}>
          {headerChips}
        </div>
      </div>

      {/* Modal body — C variant는 flex column(자체 scroll 없음, 학생 list만 scroll),
          나머지는 body 자체 scroll. 학생 picker가 핵심이므로 height를 넉넉히 (560px)
          잡아 학생 list가 3~4명 보이게. 모바일 viewport에서는 70vh로 자동 줄어듬. */}
      <div
        className={
          variant === "C"
            ? "px-5 py-4 h-[560px] max-h-[70vh] flex flex-col overflow-hidden"
            : "px-5 py-4 space-y-4 max-h-[560px] overflow-y-auto"
        }
      >
        {renderBody()}
      </div>

      {/* Modal footer */}
      <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">
          {saveHelper && (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <AlertCircle size={12} /> {saveHelper}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-700 px-4 py-1.5 text-[13px] text-slate-300 hover:bg-slate-800">취소</button>
          <button
            onClick={handleSave}
            disabled={saveDisabled}
            className={`rounded-lg px-5 py-1.5 text-[13px] font-semibold transition-colors ${
              saveDisabled
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-amber-500 text-slate-900 hover:bg-amber-400"
            }`}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function toggleSet<T>(s: Set<T>, x: T): Set<T> {
  const next = new Set(s);
  if (next.has(x)) next.delete(x);
  else next.add(x);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function EditSessionModalExplorationPage() {
  const [variant, setVariant] = useState<Variant>("C");
  const [validation, setValidation] = useState<ValidationMode>("V1-disabled");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [studentMode, setStudentMode] = useState<"none" | "one" | "three">("one");
  const [calendarVariant, setCalendarVariant] = useState<CalendarVariant>("v3-month");

  const [showInlineErrors, setShowInlineErrors] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const initialState = useMemo<ModalState>(
    () => ({
      weekday: 3,
      startsAt: "11:00",
      endsAt: "12:00",
      subjectId: "sub1",
      previewColor: MOCK_SUBJECTS[0].hex,
      teacherIds: new Set(["t1"]),
      studentIds:
        studentMode === "none"
          ? new Set()
          : studentMode === "one"
            ? new Set(["s1"])
            : new Set(["s1", "s2", "s3"]),
    }),
    [studentMode],
  );

  const [state, setState] = useState<ModalState>(initialState);
  // 학생 모드 바뀌면 초기값으로 reset
  useEffect(() => {
    setState(initialState);
    setShowInlineErrors(false);
    setToastMessage(null);
  }, [initialState]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Control bar */}
      <div className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs uppercase tracking-wide text-slate-500">디자인 탐색</span>
          <span className="text-sm font-medium">EditSessionModal 재설계</span>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-slate-400">변형:</span>
            {(["A", "B", "C", "D"] as Variant[]).map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  variant === v ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title={VARIANT_NAMES[v]}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-slate-400">화면:</span>
            {(["desktop", "mobile"] as Viewport[]).map((vp) => (
              <button
                key={vp}
                onClick={() => setViewport(vp)}
                className={`px-2.5 py-1 rounded text-xs ${
                  viewport === vp ? "bg-amber-500/20 text-amber-200 border border-amber-500/50" : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {vp === "desktop" ? "데스크탑" : "모바일 (375)"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-slate-400">학생:</span>
            {(["none", "one", "three"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setStudentMode(m)}
                className={`px-2 py-0.5 rounded text-xs ${
                  studentMode === m ? "bg-amber-500/20 text-amber-200 border border-amber-500/50" : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {m === "none" ? "0명" : m === "one" ? "1명" : "3명"}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">검증:</span>
            {(["V1-disabled", "V2-inline", "V3-toast"] as ValidationMode[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setValidation(v);
                  setShowInlineErrors(false);
                  setToastMessage(null);
                }}
                className={`px-2 py-0.5 rounded text-xs ${
                  validation === v ? "bg-amber-500/20 text-amber-200 border border-amber-500/50" : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
                title={VALIDATION_DESCRIPTIONS[v]}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar variant 토글 — 헤더 날짜 chip 클릭 popover 4가지 */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">캘린더:</span>
          {([
            { key: "v1-grid", label: "V1 · 7-grid", desc: "단순 요일만 (현재 mockup)" },
            { key: "v2-week", label: "V2 · 이번주", desc: "이번 주 7일 + 날짜 + 오늘 강조" },
            { key: "v3-month", label: "V3 · 1달", desc: "월별 grid + 이전/다음 달 navigation" },
            { key: "v4-two-week", label: "V4 · 2주", desc: "이번주 + 다음주 2 row" },
          ] as { key: CalendarVariant; label: string; desc: string }[]).map((c) => (
            <button
              key={c.key}
              onClick={() => setCalendarVariant(c.key)}
              className={`px-2 py-0.5 rounded text-xs ${
                calendarVariant === c.key ? "bg-amber-500/20 text-amber-200 border border-amber-500/50" : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
              title={c.desc}
            >
              {c.label}
            </button>
          ))}
          <span className="text-[10px] text-slate-500 ml-2">헤더 날짜 chip 클릭 → popover 형태 비교</span>
        </div>

        <div className="mt-2 text-[11px] text-slate-500">
          <strong className="text-amber-300">{variant}</strong> · {VARIANT_NAMES[variant]}
          {" · "}
          <strong className="text-amber-300">{validation}</strong> · {VALIDATION_DESCRIPTIONS[validation]}
          {" · 캘린더: "}<strong className="text-amber-300">{calendarVariant}</strong>
        </div>
      </div>

      {/* Main mockup area */}
      <div className="p-6 flex flex-col items-center gap-4 relative">
        <ModalMockup
          variant={variant}
          validation={validation}
          viewport={viewport}
          state={state}
          setState={setState}
          showInlineErrors={showInlineErrors}
          setShowInlineErrors={setShowInlineErrors}
          setToastMessage={setToastMessage}
          calendarVariant={calendarVariant}
        />

        {toastMessage && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 shadow-xl">
            {toastMessage}
          </div>
        )}

        <div className="max-w-[640px] text-[11px] text-slate-400 bg-slate-900/40 rounded-lg p-4 border border-slate-800 space-y-2 mt-6">
          <p className="font-medium text-slate-300">사용 가이드</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>상단: 변형 A/B/C/D + 데스크탑/모바일 + 학생 수(0/1/3) + 검증 V1/V2/V3 토글</li>
            <li>헤더 chip(요일·시간·과목·강사) 클릭 → popover로 inline 편집</li>
            <li>학생 수 0명 + 저장 클릭 → 검증 모드별 동작 확인</li>
            <li>각 variant의 body 구성·헤더 chip 수가 다름 — 사용자 결정용</li>
          </ul>
          <p className="font-medium text-slate-300 mt-3">변형 차이</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="text-left py-1.5 pr-3">변형</th>
                <th className="text-left py-1.5 pr-3">헤더 chip</th>
                <th className="text-left py-1.5">body</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/60">
                <td className="py-1.5 pr-3 text-amber-300">A</td>
                <td className="py-1.5 pr-3">요일 · 시간</td>
                <td className="py-1.5">과목 → 강사 → 학생</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-1.5 pr-3 text-amber-300">B</td>
                <td className="py-1.5 pr-3">과목 · 요일 · 시간</td>
                <td className="py-1.5">강사 → 학생</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-1.5 pr-3 text-amber-300">C</td>
                <td className="py-1.5 pr-3">요일 · 시간</td>
                <td className="py-1.5">[sticky] 과목 · 강사 / 학생 (스크롤)</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-amber-300">D</td>
                <td className="py-1.5 pr-3">과목 · 요일 · 시간 · 강사 N명</td>
                <td className="py-1.5">학생만 (가장 minimal)</td>
              </tr>
            </tbody>
          </table>
          <p className="font-medium text-slate-300 mt-3">검증 차이</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><span className="text-amber-300">V1-disabled</span> — 가장 안전. 사용자에게 "왜 안 눌리지?" 혼란 가능성 → helper text로 보완.</li>
            <li><span className="text-amber-300">V2-inline</span> — 사용자가 적극 클릭하고 어디가 빠졌는지 알 수 있음. 클릭 1회 추가.</li>
            <li><span className="text-amber-300">V3-toast</span> — class-planner의 다른 곳과 일관(토스트 친숙). 다만 toast가 사라지면 어디가 빠진지 모름.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
