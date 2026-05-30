"use client";

import { useState } from "react";

/**
 * design-explorations: 같은 요일·같은 시간대 lane 사이에 끼워넣기 UX 4 variants.
 *
 * 사용자 보고 (2026-05-13): 5번 학생 12:00-13:00 세션을 화요일 10:00-11:00 lane
 * 1번과 2번 사이로 드래그 → preview 부터 1번과 5번이 같은 칸에 겹침 → drop
 * 결과: 1번이 5번 뒤에 stack (UI엔 5번만 보임). 알고리즘 결함과 별개로 사용자
 * 의도("두 lane 사이"라는 정밀 위치)를 명확히 표현할 UX 가 필요.
 *
 * Variant A — Drop Indicator Line
 *   드래그 중 cursor 근처 lane 경계가 두꺼운 색상 라인으로 highlight. drop 시
 *   그 경계에 새 lane 삽입, 모든 후속 lane shift. Linear/Notion DB row insert.
 *
 * Variant B — Auto-spread on Drag (추천)
 *   드래그 시작 시 같은 요일의 모든 lane 사이 gap 부드럽게 expand → hit area
 *   자동 확보. drop 후 gap 원래대로. 평소엔 compact 유지. Apple Photos rearrange.
 *
 * Variant D — Magnetic Snap + Floating Hint
 *   cursor 가장 가까운 lane boundary 가 magnetic 하게 snap + DragOverlay 옆에
 *   "1번과 2번 사이 (lane 2)" 텍스트. Apple Calendar / Fantastical.
 *
 * Variant E — Edge Hover Slot
 *   lane 사이 호버하면 placeholder lane (semi-transparent ghost) 펼쳐짐. drop
 *   시 그 자리에 정착. macOS Finder column resize hint 와 유사.
 *
 * Phase toggle:
 *   initial — 드래그 전 (Image 1과 동일한 5개 세션)
 *   dragging — 사용자가 5번을 1번/2번 사이로 드래그 중
 *   dropped — 5번 끼워넣기 완료
 */

type Variant = "A" | "B" | "D" | "E";
type Phase = "initial" | "dragging" | "dropped";

const VARIANT_NAMES: Record<Variant, string> = {
  A: "A · Drop Indicator Line — lane 경계 highlight",
  B: "B · Auto-spread on Drag — drag 시 자동 gap 확장 (추천)",
  D: "D · Magnetic Snap + Floating Hint — cursor 가까운 경계로 스냅",
  E: "E · Edge Hover Slot — 사이 호버 시 placeholder lane",
};

const VARIANT_DESC: Record<Variant, { pros: string; cons: string; refs: string }> = {
  A: {
    pros: "가장 명확한 visual feedback. 평소 layout 변형 없이 compact 유지. drop 위치 = 라인 위치.",
    cons: "lane 경계 hit area 가 좁아 정밀도 필요. 모바일 터치 사용 시 hit miss 가능.",
    refs: "Linear (issue reorder), Notion (database row insert), Figma (layer reorder).",
  },
  B: {
    pros: "평소엔 compact, 드래그 시에만 hit area 확보. 자연스러운 motion. 사용자가 끼워넣기 의도를 갖는 순간(drag 시작) 자동으로 가이드.",
    cons: "spread 애니메이션이 강하면 column 폭이 늘었다 줄었다 — 시각적 들썩임. 4+ lane 시 가로 스크롤 압력 ↑.",
    refs: "Apple Photos (사진 rearrange), Trello card move 일부, iOS 홈 화면 앱 재배치.",
  },
  D: {
    pros: "정밀도 + 의도 명확화 둘 다. snap 으로 사용자가 hit area 신경 안 써도 됨. floating label 이 'lane 2 와 3 사이' 명시.",
    cons: "floating label 디자인 부담. snap 임계값 튜닝 필요(너무 끈끈하면 자유도 ↓, 너무 약하면 의미 없음).",
    refs: "Apple Calendar (이벤트 drag), Fantastical, Things 3 (할일 정렬).",
  },
  E: {
    pros: "직관적 — placeholder 가 \"여기 들어옴\" 을 직접 보여줌. 시각적 anchor 명확.",
    cons: "hover 영역 정의 까다로움. placeholder 노출 시점 트리거(거리 임계값) 디자인 부담. 결정 미루는 사용자에겐 placeholder 가 계속 떠 있어 산만.",
    refs: "macOS Finder (column resize hint), 일부 칸반 보드 (Jira), Notion (block insert).",
  },
};

const PHASE_NAMES: Record<Phase, string> = {
  initial: "1. 초기 (드래그 전)",
  dragging: "2. 드래그 중 (5번을 1번/2번 사이로)",
  dropped: "3. 드롭 완료",
};

const SESSIONS_BASE = [
  { id: "1", subject: "고등수학", student: "1번", color: "violet", time: "10:00-11:00" },
  { id: "2", subject: "중등수학", student: "2번", color: "rose", time: "10:00-11:00" },
  { id: "3", subject: "고등국어", student: "3번", color: "sky", time: "10:00-11:00" },
  { id: "4", subject: "중등영어", student: "4번", color: "emerald", time: "10:00-11:00" },
];
const SESSION_5 = { id: "5", subject: "고등영어", student: "5번", color: "amber", time: "12:00-13:00" };

const COLOR_BG: Record<string, string> = {
  violet: "bg-violet-200/80 border-violet-300/50",
  rose: "bg-rose-200/80 border-rose-300/50",
  sky: "bg-sky-200/80 border-sky-300/50",
  emerald: "bg-emerald-200/80 border-emerald-300/50",
  amber: "bg-amber-200/90 border-amber-300/60",
};
const COLOR_TEXT: Record<string, string> = {
  violet: "text-violet-900",
  rose: "text-rose-900",
  sky: "text-sky-900",
  emerald: "text-emerald-900",
  amber: "text-amber-900",
};

function SessionBlock({
  subject,
  student,
  time,
  color,
  className = "",
}: {
  subject: string;
  student: string;
  time: string;
  color: string;
  className?: string;
}) {
  return (
    <div
      className={`${COLOR_BG[color]} ${COLOR_TEXT[color]} border rounded-lg px-3 py-2 shadow-sm text-[12px] font-medium select-none ${className}`}
    >
      <div className="font-bold">{subject}</div>
      <div className="opacity-80">{time}</div>
      <div className="opacity-80">{student}</div>
    </div>
  );
}

// ── Variant A — Drop Indicator Line ────────────────────────────────────────
function VariantA({ phase }: { phase: Phase }) {
  if (phase === "initial") {
    return <Layout5Sessions />;
  }
  if (phase === "dragging") {
    return (
      <div className="relative">
        <div className="grid grid-cols-[60px_repeat(4,160px)] gap-x-2 items-start">
          <div className="text-[11px] text-gray-400 pt-2">10:00</div>
          <SessionBlock {...SESSIONS_BASE[0]} />
          {/* 1번-2번 사이 highlight line */}
          <div className="relative">
            <div className="absolute -left-2 top-0 bottom-0 w-1.5 rounded-full bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.6)] animate-pulse" />
            <SessionBlock {...SESSIONS_BASE[1]} />
          </div>
          <SessionBlock {...SESSIONS_BASE[2]} />
          <SessionBlock {...SESSIONS_BASE[3]} />
        </div>
        {/* DragOverlay (floating cursor near boundary) */}
        <div className="absolute top-12 left-[260px] z-10 rotate-1 opacity-90 pointer-events-none">
          <SessionBlock {...SESSION_5} time="10:00-11:00" className="shadow-2xl" />
        </div>
      </div>
    );
  }
  // dropped
  return (
    <div className="grid grid-cols-[60px_repeat(5,160px)] gap-x-2 items-start">
      <div className="text-[11px] text-gray-400 pt-2">10:00</div>
      <SessionBlock {...SESSIONS_BASE[0]} />
      <SessionBlock {...SESSION_5} time="10:00-11:00" />
      <SessionBlock {...SESSIONS_BASE[1]} />
      <SessionBlock {...SESSIONS_BASE[2]} />
      <SessionBlock {...SESSIONS_BASE[3]} />
    </div>
  );
}

// ── Variant B — Auto-spread on Drag ────────────────────────────────────────
function VariantB({ phase }: { phase: Phase }) {
  if (phase === "initial") return <Layout5Sessions />;
  if (phase === "dragging") {
    return (
      <div className="relative">
        <div className="grid grid-cols-[60px_repeat(4,160px)] gap-x-7 items-start transition-all duration-300">
          <div className="text-[11px] text-gray-400 pt-2">10:00</div>
          <SessionBlock {...SESSIONS_BASE[0]} />
          <SessionBlock {...SESSIONS_BASE[1]} />
          <SessionBlock {...SESSIONS_BASE[2]} />
          <SessionBlock {...SESSIONS_BASE[3]} />
        </div>
        {/* 끼워넣기 자리 ghost (1번-2번 사이) — gap 영역에 dashed slot */}
        <div className="absolute top-0 left-[244px] w-[30px] h-[68px] rounded-md border-2 border-dashed border-amber-400/70 bg-amber-400/10" />
        {/* DragOverlay */}
        <div className="absolute top-12 left-[260px] z-10 rotate-1 opacity-90 pointer-events-none">
          <SessionBlock {...SESSION_5} time="10:00-11:00" className="shadow-2xl" />
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[60px_repeat(5,160px)] gap-x-2 items-start transition-all duration-300">
      <div className="text-[11px] text-gray-400 pt-2">10:00</div>
      <SessionBlock {...SESSIONS_BASE[0]} />
      <SessionBlock {...SESSION_5} time="10:00-11:00" />
      <SessionBlock {...SESSIONS_BASE[1]} />
      <SessionBlock {...SESSIONS_BASE[2]} />
      <SessionBlock {...SESSIONS_BASE[3]} />
    </div>
  );
}

// ── Variant D — Magnetic Snap + Floating Hint ──────────────────────────────
function VariantD({ phase }: { phase: Phase }) {
  if (phase === "initial") return <Layout5Sessions />;
  if (phase === "dragging") {
    return (
      <div className="relative">
        <div className="grid grid-cols-[60px_repeat(4,160px)] gap-x-2 items-start">
          <div className="text-[11px] text-gray-400 pt-2">10:00</div>
          <SessionBlock {...SESSIONS_BASE[0]} />
          {/* 가까운 경계만 살짝 빛남 (magnetic) */}
          <div className="relative">
            <div className="absolute -left-2.5 top-0 bottom-0 w-0.5 rounded bg-cyan-400/80 shadow-[0_0_8px_1px_rgba(34,211,238,0.5)]" />
            <SessionBlock {...SESSIONS_BASE[1]} />
          </div>
          <SessionBlock {...SESSIONS_BASE[2]} />
          <SessionBlock {...SESSIONS_BASE[3]} />
        </div>
        {/* Floating overlay + label */}
        <div className="absolute top-12 left-[260px] z-10 rotate-1 opacity-95 pointer-events-none">
          <SessionBlock {...SESSION_5} time="10:00-11:00" className="shadow-2xl" />
          <div className="mt-1.5 text-[10px] font-semibold text-cyan-300 bg-slate-900/90 border border-cyan-400/40 rounded px-2 py-1 inline-block">
            ↳ 1번과 2번 사이 (lane 2)
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[60px_repeat(5,160px)] gap-x-2 items-start">
      <div className="text-[11px] text-gray-400 pt-2">10:00</div>
      <SessionBlock {...SESSIONS_BASE[0]} />
      <SessionBlock {...SESSION_5} time="10:00-11:00" />
      <SessionBlock {...SESSIONS_BASE[1]} />
      <SessionBlock {...SESSIONS_BASE[2]} />
      <SessionBlock {...SESSIONS_BASE[3]} />
    </div>
  );
}

// ── Variant E — Edge Hover Slot ────────────────────────────────────────────
function VariantE({ phase }: { phase: Phase }) {
  if (phase === "initial") return <Layout5Sessions />;
  if (phase === "dragging") {
    return (
      <div className="relative">
        <div className="grid grid-cols-[60px_160px_160px_160px_160px_160px] gap-x-2 items-start">
          <div className="text-[11px] text-gray-400 pt-2">10:00</div>
          <SessionBlock {...SESSIONS_BASE[0]} />
          {/* Placeholder slot (호버 시 펼쳐짐) — semi-transparent */}
          <div className="rounded-lg border-2 border-dashed border-amber-400/60 bg-amber-200/15 h-[68px] flex items-center justify-center text-[11px] text-amber-300/90 font-medium">
            여기에 삽입
          </div>
          <SessionBlock {...SESSIONS_BASE[1]} />
          <SessionBlock {...SESSIONS_BASE[2]} />
          <SessionBlock {...SESSIONS_BASE[3]} />
        </div>
        {/* DragOverlay */}
        <div className="absolute top-12 left-[260px] z-10 rotate-1 opacity-90 pointer-events-none">
          <SessionBlock {...SESSION_5} time="10:00-11:00" className="shadow-2xl" />
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[60px_repeat(5,160px)] gap-x-2 items-start">
      <div className="text-[11px] text-gray-400 pt-2">10:00</div>
      <SessionBlock {...SESSIONS_BASE[0]} />
      <SessionBlock {...SESSION_5} time="10:00-11:00" />
      <SessionBlock {...SESSIONS_BASE[1]} />
      <SessionBlock {...SESSIONS_BASE[2]} />
      <SessionBlock {...SESSIONS_BASE[3]} />
    </div>
  );
}

function Layout5Sessions() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[60px_repeat(4,160px)] gap-x-2 items-start">
        <div className="text-[11px] text-gray-400 pt-2">10:00</div>
        <SessionBlock {...SESSIONS_BASE[0]} />
        <SessionBlock {...SESSIONS_BASE[1]} />
        <SessionBlock {...SESSIONS_BASE[2]} />
        <SessionBlock {...SESSIONS_BASE[3]} />
      </div>
      <div className="grid grid-cols-[60px_160px] gap-x-2 items-start">
        <div className="text-[11px] text-gray-400 pt-2">12:00</div>
        <SessionBlock {...SESSION_5} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function LaneInsertExplorations() {
  const [variant, setVariant] = useState<Variant>("B");
  const [phase, setPhase] = useState<Phase>("dragging");
  const variants: Variant[] = ["A", "B", "D", "E"];
  const phases: Phase[] = ["initial", "dragging", "dropped"];

  const Variant = (
    { A: VariantA, B: VariantB, D: VariantD, E: VariantE } as const
  )[variant];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Lane Insert UX — 4 Variants</h1>
          <p className="text-[13px] text-slate-400">
            사용자 보고 (2026-05-13): 같은 요일·같은 시간대 lane 사이에 끼워넣기 의도 표현 부재.
            현재는 lane stack 버그까지 발생. 4가지 변형 비교 후 선호 1~2개 선택해주세요.
          </p>
        </header>

        {/* Variant tabs */}
        <div className="flex flex-wrap gap-2 mb-3">
          {variants.map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={`px-3 py-2 rounded-md text-[12px] font-semibold transition-colors ${
                variant === v
                  ? "bg-amber-400 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {VARIANT_NAMES[v]}
            </button>
          ))}
        </div>

        {/* Phase tabs */}
        <div className="flex gap-2 mb-5">
          {phases.map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
                phase === p
                  ? "bg-slate-200 text-slate-900"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"
              }`}
            >
              {PHASE_NAMES[p]}
            </button>
          ))}
        </div>

        {/* Mockup canvas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 min-h-[280px]">
          <div className="text-[11px] text-slate-500 mb-3">화 (12일)</div>
          <Variant phase={phase} />
        </div>

        {/* Pros/cons */}
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-4">
            <div className="text-[11px] font-bold text-emerald-300 uppercase mb-1.5">
              장점
            </div>
            <div className="text-[13px] text-slate-300 leading-relaxed">
              {VARIANT_DESC[variant].pros}
            </div>
          </div>
          <div className="bg-rose-950/30 border border-rose-800/40 rounded-lg p-4">
            <div className="text-[11px] font-bold text-rose-300 uppercase mb-1.5">
              단점
            </div>
            <div className="text-[13px] text-slate-300 leading-relaxed">
              {VARIANT_DESC[variant].cons}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-6">
          <div className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">
            업계 참고
          </div>
          <div className="text-[13px] text-slate-300">{VARIANT_DESC[variant].refs}</div>
        </div>

        {/* Selection guide */}
        <div className="bg-amber-950/20 border border-amber-700/40 rounded-lg p-4 text-[13px] text-slate-300 leading-relaxed">
          <div className="text-[11px] font-bold text-amber-300 uppercase mb-2">
            결정 가이드
          </div>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              <strong>B (Auto-spread)</strong> 가 평소 compact + drag 시 hit area 확보의 균형이 가장 좋음 — 기본 추천.
            </li>
            <li>
              <strong>D (Magnetic Snap + Hint)</strong> 와 조합해도 좋음 (B 의 expanded gap 영역에 D 의 floating label 노출).
            </li>
            <li>
              <strong>A</strong> 는 가장 compact 하지만 보드 가로 4+ lane 시 hit area 가 1px 수준이 됨.
            </li>
            <li>
              <strong>E</strong> 는 placeholder 가 가장 직관적이지만 결정 미루는 사용자에겐 산만함이 단점.
            </li>
            <li>
              참고: 현재 lane stack 버그(같은 yPosition 두 세션 stack)는 UX 와 무관하게 algorithm fix 필요. UX 선택 후 fix 진행.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
