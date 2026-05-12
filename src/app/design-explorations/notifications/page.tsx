"use client";

import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info, Share2, X } from "lucide-react";

type Variant = "A" | "B" | "C" | "D";
type Level = "error" | "warning" | "success" | "info";
type Filter = "all" | Level;

interface Enhancements {
  groupByTime: boolean;     // 1. 시간 그룹화 (오늘/어제/이전)
  levelIcon: boolean;       // 2. dot → 의미 있는 lucide 아이콘
  amberBar: boolean;        // 3. unread 좌측 amber bar 강조
  headerSummary: boolean;   // 4. 헤더 "에러 2 · 경고 1" 요약 + footer 총 건수
  hoverDismiss: boolean;    // 5. 항목 hover 시 X 제거 + 시각 tooltip
  badgePulse: boolean;      // 6. 배지 pulse 애니메이션 (unread > 0)
}

const DEFAULT_ENHANCEMENTS: Enhancements = {
  groupByTime: true,
  levelIcon: true,
  amberBar: true,
  headerSummary: true,
  hoverDismiss: true,
  badgePulse: true,
};

const ENHANCEMENT_LABELS: { key: keyof Enhancements; label: string; hint: string }[] = [
  { key: "groupByTime",    label: "1. 시간 그룹화",        hint: "오늘/어제/이전 헤더로 묶기" },
  { key: "levelIcon",      label: "2. 레벨 아이콘",        hint: "dot 대신 의미 있는 아이콘" },
  { key: "amberBar",       label: "3. unread 좌측 bar",   hint: "NEW 항목 좌측에 amber 세로 막대" },
  { key: "headerSummary",  label: "4. 헤더·풋터 요약",     hint: "에러 N · 경고 N · 총 N건 표시" },
  { key: "hoverDismiss",   label: "5. 호버 X + 시각 tip",  hint: "항목 호버 시 X 노출 + 절대 시각 tooltip" },
  { key: "badgePulse",     label: "6. 배지 pulse",         hint: "unread 있을 때 배지 미세 박동" },
];

interface ToastEntry {
  id: string;
  level: Level;
  message: string;
  time: string;
  relative: string;
}

const VARIANT_NAMES: Record<Variant, string> = {
  A: "드롭다운 (Slack/GitHub)",
  B: "사이드 패널 (VS Code)",
  C: "중앙 모달",
  D: "토스트 stack 확장",
};

const MOCK_TOASTS: ToastEntry[] = [
  { id: "t1", level: "error", message: "10건의 변경이 서버 거부로 동기화 실패했습니다. 관리자에게 문의해주세요.", time: "오늘 22:10", relative: "방금" },
  { id: "t2", level: "warning", message: "3건의 오래된 변경(24시간 초과)을 동기화하지 못했습니다.", time: "오늘 22:08", relative: "2분 전" },
  { id: "t3", level: "success", message: "오프라인 동안 변경한 5건이 자동 동기화됐습니다.", time: "오늘 22:05", relative: "5분 전" },
  { id: "t4", level: "info", message: "템플릿이 저장되었습니다.", time: "오늘 21:58", relative: "12분 전" },
  { id: "t5", level: "success", message: "수업이 추가되었습니다.", time: "오늘 21:42", relative: "28분 전" },
  { id: "t6", level: "error", message: "강사 추가 실패: 이름 중복", time: "오늘 21:15", relative: "55분 전" },
  { id: "t7", level: "info", message: "공유 링크가 클립보드에 복사되었습니다.", time: "오늘 20:48", relative: "1시간 전" },
];

// NEW 라벨/배지 카운트 대상 — 에러/경고만 사용자 관심사로 추적
function isTrackable(level: Level): boolean {
  return level === "error" || level === "warning";
}

const LEVEL_STYLE: Record<Level, { dot: string; chip: string; label: string; ring: string; icon: typeof AlertCircle; iconColor: string }> = {
  error:   { dot: "bg-red-400",    chip: "bg-red-500/15 text-red-300 border-red-500/30",       label: "에러",   ring: "ring-red-500/40",   icon: AlertCircle,    iconColor: "text-red-400" },
  warning: { dot: "bg-amber-400",  chip: "bg-amber-500/15 text-amber-300 border-amber-500/30", label: "경고",   ring: "ring-amber-500/40", icon: AlertTriangle,  iconColor: "text-amber-400" },
  success: { dot: "bg-green-400",  chip: "bg-green-500/15 text-green-300 border-green-500/30", label: "성공",   ring: "ring-green-500/40", icon: CheckCircle2,   iconColor: "text-green-400" },
  info:    { dot: "bg-sky-400",    chip: "bg-sky-500/15 text-sky-300 border-sky-500/30",       label: "정보",   ring: "ring-sky-500/40",   icon: Info,           iconColor: "text-sky-400" },
};

function groupByTimeRelative(entries: ToastEntry[]): { label: string; items: ToastEntry[] }[] {
  // mock에서는 모든 항목이 "오늘"이므로 시연 위해 인덱스로 분할
  const today: ToastEntry[] = [];
  const yesterday: ToastEntry[] = [];
  const earlier: ToastEntry[] = [];
  entries.forEach((e, i) => {
    if (i < 4) today.push(e);
    else if (i < 6) yesterday.push(e);
    else earlier.push(e);
  });
  const groups: { label: string; items: ToastEntry[] }[] = [];
  if (today.length) groups.push({ label: "오늘", items: today });
  if (yesterday.length) groups.push({ label: "어제", items: yesterday });
  if (earlier.length) groups.push({ label: "이전", items: earlier });
  return groups;
}

function FilterChips({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const options: { key: Filter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "error", label: "에러" },
    { key: "warning", label: "경고" },
    { key: "success", label: "성공" },
    { key: "info", label: "정보" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
              active
                ? "bg-amber-500/20 text-amber-200 border-amber-500/50"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ToastRow({
  entry,
  compact = false,
  unread = false,
  onMarkRead,
  enhancements = DEFAULT_ENHANCEMENTS,
  onDismiss,
}: {
  entry: ToastEntry;
  compact?: boolean;
  unread?: boolean;
  onMarkRead?: () => void;
  enhancements?: Enhancements;
  onDismiss?: () => void;
}) {
  const s = LEVEL_STYLE[entry.level];
  const showNew = unread && isTrackable(entry.level);
  const Icon = s.icon;
  return (
    <div
      className={`group relative w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-800/60 rounded-md transition-colors ${
        showNew ? "bg-slate-800/30" : ""
      }`}
    >
      {/* 3. unread 좌측 amber bar */}
      {enhancements.amberBar && showNew && (
        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-amber-400" />
      )}

      <button
        type="button"
        onClick={onMarkRead}
        className="flex-1 flex items-start gap-3 text-left min-w-0"
      >
        <span className="relative mt-0.5 flex-shrink-0">
          {/* 2. dot vs level icon */}
          {enhancements.levelIcon ? (
            <Icon size={16} className={s.iconColor} strokeWidth={2.2} />
          ) : (
            <span className={`block mt-1 w-2 h-2 rounded-full ${s.dot}`} />
          )}
          {showNew && !enhancements.levelIcon && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${showNew ? "text-slate-100 font-medium" : "text-slate-300"} ${compact ? "line-clamp-2" : ""}`}>
            {entry.message}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${s.chip}`}>{s.label}</span>
            {/* 5. hover 시 절대 시각 tooltip */}
            <span
              className="text-[11px] text-slate-500"
              title={enhancements.hoverDismiss ? `${entry.time} (정확한 시각)` : undefined}
            >
              {entry.relative} · {entry.time}
            </span>
            {showNew && <span className="text-[10px] text-amber-400 font-medium">NEW</span>}
          </div>
        </div>
      </button>

      {/* 5. hover X 제거 버튼 */}
      {enhancements.hoverDismiss && onDismiss && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-200 self-center"
          aria-label="이 알림 제거"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function ToastCard({ entry, onDismiss }: { entry: ToastEntry; onDismiss?: () => void }) {
  const s = LEVEL_STYLE[entry.level];
  return (
    <div className={`relative bg-slate-800 border border-slate-700 rounded-lg p-3 ring-1 ${s.ring}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1 w-2 h-2 rounded-full ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-100 leading-snug">{entry.message}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${s.chip}`}>{s.label}</span>
            <span className="text-[11px] text-slate-500">{entry.relative} · {entry.time}</span>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-slate-500 hover:text-slate-200" aria-label="제거">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function FakeHeader({
  iconFix,
  onBellClick,
  unread,
  showBellRing,
  pulse,
}: {
  iconFix: boolean;
  onBellClick: () => void;
  unread: number;
  showBellRing?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3 bg-slate-900">
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-medium">주간 시간표</span>
        <span className="text-xs text-slate-500">5. 11. 오후 10:10 수정</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 rounded border border-amber-500/50 text-amber-300 text-sm hover:bg-amber-500/10">템플릿 ▾</button>
        <button className="px-3 py-1.5 rounded text-slate-300 text-sm hover:bg-slate-800 inline-flex items-center gap-1">⬇ 주간 시간표 PDF 다운로드</button>

        {/* Bell with unread badge */}
        <button
          type="button"
          aria-label="알림 히스토리"
          onClick={onBellClick}
          className={`relative w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ${
            showBellRing ? "ring-2 ring-amber-500/50" : ""
          }`}
        >
          <Bell size={16} strokeWidth={2} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 inline-flex">
              {pulse && (
                <span className="absolute inset-0 rounded-full bg-red-500 opacity-60 animate-ping" />
              )}
              <span className="relative min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-medium inline-flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            </span>
          )}
        </button>

        {/* InfoTrigger — fix toggle */}
        <button
          type="button"
          aria-label="PDF 출력 가이드"
          className={
            iconFix
              ? "w-8 h-8 inline-flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              : "w-6 h-6 inline-flex items-center justify-center rounded-full border border-slate-500 text-slate-500 hover:border-slate-200 hover:text-slate-200 transition-colors"
          }
        >
          <Info size={iconFix ? 16 : 14} strokeWidth={2} />
        </button>

        <button
          type="button"
          aria-label="공유 링크"
          className="w-8 h-8 inline-flex items-center justify-center border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Share2 size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function FakeGrid() {
  return (
    <div className="grid grid-cols-7 gap-px bg-slate-800 border-t border-slate-800 text-xs">
      {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
        <div key={d} className="bg-slate-900 px-3 py-2 text-center text-slate-400">{d}</div>
      ))}
      {Array.from({ length: 7 * 6 }).map((_, i) => {
        const colors = ["bg-purple-300/15", "bg-rose-300/15", "bg-amber-300/15", "bg-emerald-300/15", "bg-sky-300/15"];
        const c = i % 4 === 0 ? colors[i % colors.length] : "bg-slate-900";
        return <div key={i} className={`${c} h-16 px-2 py-1`} />;
      })}
    </div>
  );
}

function VariantA_Dropdown({
  filtered,
  filter,
  setFilter,
  onClose,
  unreadIds,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  enhancements,
}: {
  filtered: ToastEntry[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  onClose: () => void;
  unreadIds: Set<string>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  enhancements: Enhancements;
}) {
  const errorCount = filtered.filter((e) => e.level === "error").length;
  const warnCount = filtered.filter((e) => e.level === "warning").length;
  const groups = enhancements.groupByTime ? groupByTimeRelative(filtered) : null;

  return (
    <div className="absolute right-6 top-[60px] w-[420px] max-h-[480px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-200">알림</span>
          {/* 4. 헤더 요약 */}
          {enhancements.headerSummary && (errorCount + warnCount > 0) && (
            <span className="text-[11px] text-slate-500 mt-0.5">
              {errorCount > 0 && <span className="text-red-300">에러 {errorCount}</span>}
              {errorCount > 0 && warnCount > 0 && <span className="text-slate-600 mx-1">·</span>}
              {warnCount > 0 && <span className="text-amber-300">경고 {warnCount}</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onMarkAllRead} className="text-xs text-slate-400 hover:text-slate-200">모두 읽음</button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={14} /></button>
        </div>
      </div>
      <div className="px-3 py-2 border-b border-slate-800">
        <FilterChips value={filter} onChange={setFilter} />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <Bell size={28} className="text-slate-700 mb-2" strokeWidth={1.5} />
            <span className="text-sm">알림이 없습니다</span>
            <span className="text-[11px] text-slate-600 mt-1">새 알림이 발생하면 여기에 표시됩니다</span>
          </div>
        ) : groups ? (
          groups.map((g) => (
            <div key={g.label} className="mb-1">
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                {g.label}
              </div>
              {g.items.map((t) => (
                <ToastRow
                  key={t.id}
                  entry={t}
                  compact
                  unread={unreadIds.has(t.id)}
                  onMarkRead={() => onMarkRead(t.id)}
                  onDismiss={() => onDismiss(t.id)}
                  enhancements={enhancements}
                />
              ))}
            </div>
          ))
        ) : (
          filtered.map((t) => (
            <ToastRow
              key={t.id}
              entry={t}
              compact
              unread={unreadIds.has(t.id)}
              onMarkRead={() => onMarkRead(t.id)}
              onDismiss={() => onDismiss(t.id)}
              enhancements={enhancements}
            />
          ))
        )}
      </div>
      {/* 4. footer 총 건수 */}
      {enhancements.headerSummary && filtered.length > 0 && (
        <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500 text-center">
          총 {filtered.length}건 · 24시간 이내 · 최대 50개 보관
        </div>
      )}
    </div>
  );
}

function VariantB_SidePanel({ filtered, filter, setFilter, onClose }: { filtered: ToastEntry[]; filter: Filter; setFilter: (f: Filter) => void; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />
      <div className="fixed right-0 top-0 h-screen w-[400px] bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-lg font-medium">알림 히스토리</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
        </div>
        <div className="px-5 py-3 border-b border-slate-800">
          <FilterChips value={filter} onChange={setFilter} />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map((t) => <ToastCard key={t.id} entry={t} onDismiss={() => {}} />)}
        </div>
        <div className="border-t border-slate-800 px-5 py-3">
          <button className="w-full px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm text-slate-200">모두 지우기</button>
        </div>
      </div>
    </>
  );
}

function VariantC_Modal({ filtered, filter, setFilter, onClose }: { filtered: ToastEntry[]; filter: Filter; setFilter: (f: Filter) => void; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-h-[70vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center border-b border-slate-800">
          <div className="w-1 self-stretch bg-amber-500" />
          <div className="flex-1 px-5 py-4 flex items-center justify-between">
            <span className="text-lg font-medium text-slate-100">알림 히스토리</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-slate-800">
          <FilterChips value={filter} onChange={setFilter} />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((t) => <ToastRow key={t.id} entry={t} />)}
        </div>
        <div className="border-t border-slate-800 px-5 py-3 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm">모두 지우기</button>
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-sm text-slate-900 font-medium">닫기</button>
        </div>
      </div>
    </>
  );
}

function VariantD_ToastStack({ filtered, filter, setFilter, onClose }: { filtered: ToastEntry[]; filter: Filter; setFilter: (f: Filter) => void; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? filtered : filtered.slice(0, 5);
  const remaining = filtered.length - visible.length;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px]">
      <div className="mb-2 flex items-center justify-between bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-3 py-2">
        <FilterChips value={filter} onChange={setFilter} />
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 ml-2"><X size={14} /></button>
      </div>
      <div className="space-y-2">
        {visible.map((t, idx) => (
          <div
            key={t.id}
            style={{
              transform: `translateY(${idx === 0 ? 0 : 0}px) scale(${1 - idx * 0.01})`,
              opacity: idx > 3 ? 0.7 : 1,
            }}
          >
            <ToastCard entry={t} onDismiss={() => {}} />
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 w-full px-3 py-2 rounded bg-slate-800/90 backdrop-blur border border-slate-700 text-sm text-slate-300 hover:bg-slate-700"
        >
          + {remaining}개 더 보기
        </button>
      )}
    </div>
  );
}

export default function NotificationsExplorationPage() {
  const [variant, setVariant] = useState<Variant>("A");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [iconFix, setIconFix] = useState(true);
  // Initially all entries are unread (simulate fresh page load with stored history)
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set(MOCK_TOASTS.map((t) => t.id)));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [enhancements, setEnhancements] = useState<Enhancements>(DEFAULT_ENHANCEMENTS);

  const visibleToasts = useMemo(
    () => MOCK_TOASTS.filter((t) => !dismissedIds.has(t.id)),
    [dismissedIds]
  );

  const filtered = useMemo(
    () => visibleToasts.filter((t) => filter === "all" || t.level === filter),
    [filter, visibleToasts]
  );

  // 배지 카운트: 에러/경고 중 unread + 안 dismissed
  const unreadCount = useMemo(
    () => MOCK_TOASTS.filter((t) => unreadIds.has(t.id) && !dismissedIds.has(t.id) && isTrackable(t.level)).length,
    [unreadIds, dismissedIds]
  );

  const handleMarkRead = (id: string) => {
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleMarkAllRead = () => {
    setUnreadIds(new Set());
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const resetMock = () => {
    setUnreadIds(new Set(MOCK_TOASTS.map((t) => t.id)));
    setDismissedIds(new Set());
  };

  const toggleEnhancement = (k: keyof Enhancements) => {
    setEnhancements((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const enableAll = () => {
    setEnhancements({ groupByTime: true, levelIcon: true, amberBar: true, headerSummary: true, hoverDismiss: true, badgePulse: true });
  };

  const disableAll = () => setEnhancements(DEFAULT_ENHANCEMENTS);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Control bar */}
      <div className="sticky top-0 z-[60] border-b border-slate-800 bg-slate-900/95 backdrop-blur px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs uppercase tracking-wide text-slate-500">디자인 탐색</span>
          <span className="text-sm font-medium">알림 히스토리</span>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-slate-400">변형:</span>
            {(["A", "B", "C", "D"] as Variant[]).map((v) => {
              const active = variant === v;
              return (
                <button
                  key={v}
                  onClick={() => { setVariant(v); setOpen(true); }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    active
                      ? "bg-amber-500 text-slate-900"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {v} · {VARIANT_NAMES[v]}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <label className="text-xs text-slate-400 inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={iconFix}
                onChange={(e) => setIconFix(e.target.checked)}
                className="accent-amber-500"
              />
              i 아이콘 1겹 (fix)
            </label>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
          <span>
            확정 동작: <span className="text-amber-300">에러·경고만 NEW</span> · <span className="text-amber-300">항목 클릭/모두 읽음으로 라벨 제거</span> · <span className="text-amber-300">배지는 에러·경고 unread 수</span>
          </span>
          <button onClick={resetMock} className="ml-auto px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700">
            mock 초기화
          </button>
        </div>

        {/* 디자인 보강 옵션 (variant A에만 적용) */}
        <div className="mt-3 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-400 font-medium">디자인 보강 옵션 (variant A)</span>
            <button onClick={enableAll} className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/50 hover:bg-amber-500/30">모두 켜기</button>
            <button onClick={disableAll} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700">모두 끄기</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ENHANCEMENT_LABELS.map((opt) => {
              const active = enhancements[opt.key];
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleEnhancement(opt.key)}
                  className={`text-left px-2.5 py-1.5 rounded border transition-colors ${
                    active
                      ? "bg-amber-500/15 border-amber-500/50"
                      : "bg-slate-800 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-sm border ${active ? "bg-amber-400 border-amber-400" : "border-slate-500"} inline-flex items-center justify-center`}>
                      {active && <span className="text-slate-900 text-[8px] font-bold leading-none">✓</span>}
                    </span>
                    <span className={`text-[11px] font-medium ${active ? "text-amber-200" : "text-slate-300"}`}>{opt.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 pl-4.5">{opt.hint}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fake schedule background */}
      <div className="relative">
        <div className="px-6 pt-3 text-sm text-slate-400">테스트학원</div>
        <FakeHeader
          iconFix={iconFix}
          unread={unreadCount}
          showBellRing={open && variant === "A"}
          pulse={enhancements.badgePulse && unreadCount > 0}
          onBellClick={() => setOpen(!open)}
        />
        <div className="p-6">
          <FakeGrid />
        </div>

        {/* Variants */}
        {variant === "A" && open && (
          <VariantA_Dropdown
            filtered={filtered}
            filter={filter}
            setFilter={setFilter}
            onClose={() => setOpen(false)}
            unreadIds={unreadIds}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDismiss={handleDismiss}
            enhancements={enhancements}
          />
        )}
        {variant === "B" && open && (
          <VariantB_SidePanel filtered={filtered} filter={filter} setFilter={setFilter} onClose={() => setOpen(false)} />
        )}
        {variant === "C" && open && (
          <VariantC_Modal filtered={filtered} filter={filter} setFilter={setFilter} onClose={() => setOpen(false)} />
        )}
        {variant === "D" && open && (
          <VariantD_ToastStack filtered={filtered} filter={filter} setFilter={setFilter} onClose={() => setOpen(false)} />
        )}
      </div>
    </div>
  );
}
