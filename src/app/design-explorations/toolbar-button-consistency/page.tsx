"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  Info,
  Share2,
} from "lucide-react";

/**
 * design-explorations: 주간 시간표 우상단 button group 통일성 (UAT 2026-05-21).
 *
 * 사용자 보고 (이미지 #19, #20):
 *   - 템플릿 button = amber border, 큰 둥근 button (focus ring 상시 visible?)
 *   - PDF button = 텍스트 + icon, 작음
 *   - Info icon = 동그라미, 작음
 *   - Share = square outline
 *   → 4개 button 의 size / style / shape 다 다름. 통일성 X.
 *   → 템플릿 dropdown z-index 낮아 grid 아래 가려짐.
 *
 * Variants:
 *   A. Ghost Uniform     — 모두 ghost button (text only) + hover bg. 가장 quiet
 *   B. Outline Uniform   — 모두 outline border + 같은 둥근 정도
 *   C. Solid Hierarchy   — PDF (primary solid) + 나머지 ghost (Action hierarchy)
 *   D. Icon Group        — 모두 작은 square icon button (텍스트 hover tooltip)
 *
 * 사용법:
 *   PORT=3000 npm run dev
 *   http://localhost:3000/design-explorations/toolbar-button-consistency
 */

export default function ToolbarButtonConsistencyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="mb-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">
          주간 시간표 우상단 — Button Group 통일성
        </h1>
        <p className="text-sm text-slate-400">
          현재 4개 button (템플릿 / PDF / Info / Share) 의 size·style·shape 가 모두 다름. 통일 4 variant 비교.
        </p>
      </header>

      <div className="space-y-6 max-w-5xl mx-auto">
        <VariantCard
          letter="현재"
          title="Current — 통일성 없음"
          description="템플릿 = amber border focus / PDF = ghost 텍스트 / Info = ghost circle / Share = square outline. 4개 다른 스타일."
          status="problem"
        >
          <CurrentToolbar />
        </VariantCard>

        <VariantCard
          letter="A"
          title="Ghost Uniform — 모두 ghost"
          description="모든 button = 같은 ghost text + hover bg. 가장 조용. 시각 noise 최소."
        >
          <ToolbarA />
        </VariantCard>

        <VariantCard
          letter="B"
          title="Outline Uniform — 모두 outline border"
          description="모든 button = 같은 outline border + radius. 시각 grouping 명확. button 영역 명시."
        >
          <ToolbarB />
        </VariantCard>

        <VariantCard
          letter="C"
          title="Solid Hierarchy — PDF primary"
          description="PDF (가장 자주 쓰는 action) = solid amber. 나머지는 ghost. action 우선순위 표현."
          recommended
        >
          <ToolbarC />
        </VariantCard>

        <VariantCard
          letter="D"
          title="Icon Group — 모두 icon"
          description="모두 작은 square icon button + tooltip. 폭 최소. 텍스트 학습 비용 (사용자가 hover 해야 의미 알 수 있음)."
        >
          <ToolbarD />
        </VariantCard>
      </div>

      <section className="mt-8 max-w-3xl mx-auto text-sm text-slate-400">
        <h2 className="text-base font-bold text-slate-200 mb-2">결정 기준</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong className="text-slate-200">A Ghost</strong>: 조용 / 발견성 낮음
          </li>
          <li>
            <strong className="text-slate-200">B Outline</strong>: 명확 / 시각 무게 균등
          </li>
          <li>
            <strong className="text-slate-200">C Hierarchy (추천)</strong>: PDF
            primary action 강조 + 나머지 secondary. action 우선순위 시각 표현
          </li>
          <li>
            <strong className="text-slate-200">D Icon</strong>: 폭 절약 / 학습
            비용. 모바일 친화
          </li>
        </ul>
        <h2 className="text-base font-bold text-slate-200 mt-4 mb-2">
          별도 fix — 템플릿 dropdown z-index
        </h2>
        <p>
          현재 dropdown 의 z-index 가 schedule grid 의 session block (z 100+) 보다
          낮음. button group 변경과 무관하게 dropdown 의 z-index 를 grid 위로
          끌어올림 (예: z-50 → z-[1000]) 또는 portal 로 분리.
        </p>
      </section>
    </div>
  );
}

// ============================================================
// Wrapper
// ============================================================

function VariantCard({
  letter,
  title,
  description,
  status,
  recommended,
  children,
}: {
  letter: string;
  title: string;
  description: string;
  status?: "problem";
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-slate-900 rounded-lg p-4 border ${
        recommended
          ? "border-amber-500/50 border-2"
          : status === "problem"
            ? "border-rose-500/30"
            : "border-slate-800"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`px-2 py-0.5 inline-flex items-center justify-center rounded text-xs font-bold ${
            status === "problem"
              ? "bg-rose-500/30 text-rose-200"
              : "bg-amber-500 text-slate-950"
          }`}
        >
          {letter}
        </span>
        <h3 className="text-lg font-bold">{title}</h3>
        {recommended && (
          <span className="ml-auto px-1.5 py-0.5 text-[9px] rounded-full bg-amber-500 text-slate-950 font-bold">
            추천
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-4">{description}</p>
      <div className="bg-slate-950 rounded p-4 flex items-center justify-end">
        {children}
      </div>
    </div>
  );
}

// ============================================================
// CurrentToolbar — 사용자가 본 현재 상태 재현
// ============================================================

function CurrentToolbar() {
  return (
    <div className="flex items-center gap-2">
      <button className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-md text-slate-200 border-2 border-amber-500 hover:bg-slate-800">
        템플릿 <ChevronDown size={14} />
      </button>
      <button className="inline-flex items-center gap-1 px-2 py-1 text-sm text-slate-200 hover:bg-slate-800 rounded">
        <Download size={16} /> 주간 시간표 PDF 다운로드
      </button>
      <button className="w-7 h-7 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-800">
        <Info size={14} />
      </button>
      <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
        <Share2 size={14} />
      </button>
    </div>
  );
}

// ============================================================
// Variant A — Ghost Uniform
// ============================================================

function ToolbarA() {
  return (
    <div className="flex items-center gap-1">
      <DropdownGhost label="템플릿" />
      <BtnGhost icon={<Download size={14} />} label="PDF" />
      <BtnGhost icon={<Info size={14} />} label="가이드" />
      <BtnGhost icon={<Share2 size={14} />} label="공유" />
    </div>
  );
}

function BtnGhost({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded transition-colors">
      {icon}
      {label}
    </button>
  );
}

function DropdownGhost({ label }: { label: string }) {
  return (
    <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded transition-colors">
      {label}
      <ChevronDown size={12} />
    </button>
  );
}

// ============================================================
// Variant B — Outline Uniform
// ============================================================

function ToolbarB() {
  return (
    <div className="flex items-center gap-2">
      <BtnOutline icon={<ChevronDown size={12} />} label="템플릿" iconRight />
      <BtnOutline icon={<Download size={14} />} label="PDF" />
      <BtnOutline icon={<Info size={14} />} label="가이드" iconOnly />
      <BtnOutline icon={<Share2 size={14} />} label="공유" iconOnly />
    </div>
  );
}

function BtnOutline({
  icon,
  label,
  iconRight,
  iconOnly,
}: {
  icon: React.ReactNode;
  label: string;
  iconRight?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <button
      title={iconOnly ? label : undefined}
      aria-label={iconOnly ? label : undefined}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 border border-slate-700 hover:bg-slate-800 rounded-md transition-colors"
    >
      {!iconRight && icon}
      {!iconOnly && label}
      {iconRight && icon}
    </button>
  );
}

// ============================================================
// Variant C — Solid Hierarchy (PDF primary)
// ============================================================

function ToolbarC() {
  return (
    <div className="flex items-center gap-2">
      <DropdownGhost label="템플릿" />
      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition-colors">
        <Download size={14} />
        PDF
      </button>
      <BtnIconGhost icon={<Info size={14} />} label="가이드" />
      <BtnIconGhost icon={<Share2 size={14} />} label="공유" />
    </div>
  );
}

function BtnIconGhost({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      className="w-7 h-7 inline-flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded transition-colors"
    >
      {icon}
    </button>
  );
}

// ============================================================
// Variant D — Icon Group (all icons)
// ============================================================

function ToolbarD() {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg">
      <BtnIconSquare label="템플릿" hasDropdown>
        <Download size={14} className="rotate-180" />
      </BtnIconSquare>
      <BtnIconSquare label="PDF">
        <Download size={14} />
      </BtnIconSquare>
      <BtnIconSquare label="가이드">
        <Info size={14} />
      </BtnIconSquare>
      <BtnIconSquare label="공유">
        <Share2 size={14} />
      </BtnIconSquare>
    </div>
  );
}

function BtnIconSquare({
  children,
  label,
  hasDropdown,
}: {
  children: React.ReactNode;
  label: string;
  hasDropdown?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      className="w-8 h-8 inline-flex items-center justify-center rounded text-slate-300 hover:bg-slate-700 transition-colors relative"
    >
      {children}
      {hasDropdown && (
        <span className="absolute -bottom-0.5 right-0.5 text-[7px] text-slate-400">▾</span>
      )}
    </button>
  );
}
