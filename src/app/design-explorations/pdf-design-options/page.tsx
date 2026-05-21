"use client";

import { useState } from "react";
import { ChevronDown, Download, FileText, Settings, Users } from "lucide-react";

/**
 * design-explorations: PDF 디자인 통일 + 강사별 toggle 위치 비교 (UAT 2026-05-21).
 *
 * Section 1 — D 옵션 (강사별 페이지) toggle 위치 4 variant
 * Section 2 — weekly + PDF 디자인 통일 매트릭스 3 옵션
 *
 * 사용법:
 *   http://localhost:3000/design-explorations/pdf-design-options
 */

const SUBJECT = {
  수학: "#EF4444",
  영어: "#3B82F6",
  코딩: "#EC4899",
  사회: "#8B5CF6",
} as const;

const TEACHER = {
  김선생: "#6366f1",
  이선생: "#0891b2",
  박코치: "#7c3aed",
} as const;

export default function PdfDesignOptionsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">
          PDF 디자인 옵션 — 강사별 toggle + 디자인 통일 매트릭스
        </h1>
        <p className="text-sm text-slate-400">
          Section 1: D 강사별 인쇄 toggle 위치 4 variant.
          Section 2: weekly + PDF 디자인 통일 시나리오 3 옵션.
        </p>
      </header>

      {/* Section 1 — Teacher toggle position */}
      <section className="mb-12 max-w-7xl mx-auto">
        <h2 className="text-xl font-bold mb-1">
          Section 1 — 강사별 인쇄 toggle 위치 (4 variant)
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          "강사별 페이지로 분리" 옵션을 사용자에게 어떻게 노출할지.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <TogglePosA />
          <TogglePosB />
          <TogglePosC />
          <TogglePosD />
        </div>
      </section>

      {/* Section 2 — Unification matrix */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-xl font-bold mb-1">
          Section 2 — weekly + PDF 디자인 통일 시나리오
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          현재: weekly = light pastel, daily = dark theme. PDF 도 light pastel. 통일 방향 3 옵션.
        </p>

        <div className="space-y-6">
          <UnificationOption1 />
          <UnificationOption2 />
          <UnificationOption3 />
        </div>

        <div className="mt-6 max-w-3xl text-sm text-slate-400">
          <h3 className="text-base font-bold text-slate-200 mb-2">결정 기준</h3>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong className="text-slate-200">Option 1</strong>: weekly + PDF
              모두 dark. 화면-인쇄 완전 일치. 잉크 낭비 큼
            </li>
            <li>
              <strong className="text-slate-200">Option 2 (권장)</strong>: 화면
              통일 + 인쇄 분리. UX 일관 + 잉크 친화
            </li>
            <li>
              <strong className="text-slate-200">Option 3</strong>: PDF 만 미니멀
              monochrome. 인쇄 최적화 극단
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Section 1 — Teacher toggle position variants
// ============================================================

function TogglePosA() {
  // a1. PDF button 옆 inline switch
  const [on, setOn] = useState(false);
  return (
    <Card
      letter="A1"
      title="Button 옆 Inline Switch"
      pros={["1-step 인지", "기본 + 자주 사용 케이스 친화"]}
      cons={["button 영역 폭 늘어남"]}
    >
      <div className="flex items-center gap-2 p-3 rounded bg-slate-800 border border-slate-700">
        <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600">
          <Download size={12} /> 일별 시간표 PDF
        </button>
        <label className="inline-flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => setOn(e.target.checked)}
            className="w-3 h-3"
          />
          강사별
        </label>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        OFF: 7요일 grid 1page · ON: 강사 6명 → 6 pages
      </p>
    </Card>
  );
}

function TogglePosB() {
  // a2. Modal — PDF 클릭 시 옵션 modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"all" | "teacher">("all");
  return (
    <Card
      letter="A2"
      title="Modal — 옵션 선택"
      pros={["옵션 더 추가하기 좋음 (시간 범위 / 필터 / 페이지 사이즈 등)"]}
      cons={["2-step 추가 클릭", "modal 열기 cognitive cost"]}
    >
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600"
        >
          <Download size={12} /> 일별 시간표 PDF
        </button>
        {open && (
          <div className="absolute top-full mt-1 left-0 z-10 w-64 p-3 rounded bg-slate-800 border border-slate-700 shadow-xl">
            <div className="text-[11px] font-semibold mb-2 text-slate-300">
              인쇄 옵션
            </div>
            <label className="flex items-center gap-2 py-1 text-xs cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === "all"}
                onChange={() => setMode("all")}
              />
              전체 (1 page)
            </label>
            <label className="flex items-center gap-2 py-1 text-xs cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === "teacher"}
                onChange={() => setMode("teacher")}
              />
              강사별 페이지 분리 (6 pages)
            </label>
            <button className="mt-2 w-full px-2 py-1 text-xs rounded bg-amber-500 text-slate-950 font-bold">
              PDF 생성
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function TogglePosC() {
  // a3. settings — global preference
  return (
    <Card
      letter="A3"
      title="Settings Global Preference"
      pros={["반복 사용자 친화 (한번 설정 후 매번 적용)"]}
      cons={["설정 위치 학습 비용", "1회성 다른 mode 인쇄 시 번거로움"]}
    >
      <div className="p-3 rounded bg-slate-800 border border-slate-700 text-[11px]">
        <div className="flex items-center gap-1 mb-2 text-slate-300 font-semibold">
          <Settings size={11} /> 설정 → 인쇄 기본값
        </div>
        <label className="flex items-center justify-between py-1 text-xs text-slate-300">
          <span>강사별 페이지 분리</span>
          <input type="checkbox" />
        </label>
        <label className="flex items-center justify-between py-1 text-xs text-slate-300">
          <span>학생 명단 페이지 포함</span>
          <input type="checkbox" />
        </label>
        <label className="flex items-center justify-between py-1 text-xs text-slate-300">
          <span>내부 메모 포함</span>
          <input type="checkbox" />
        </label>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        한 번 설정 → 모든 PDF 다운로드 시 적용
      </p>
    </Card>
  );
}

function TogglePosD() {
  // a4. dropdown menu
  const [open, setOpen] = useState(false);
  return (
    <Card
      letter="A4"
      title="Dropdown Menu — 명시적 선택"
      pros={["명확한 선택지", "옵션 늘어나기 좋음"]}
      cons={["1-step 추가 클릭", "default 명확 필요"]}
    >
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600"
        >
          <Download size={12} /> PDF <ChevronDown size={11} />
        </button>
        {open && (
          <div className="absolute top-full mt-1 left-0 z-10 w-56 rounded bg-slate-800 border border-slate-700 shadow-xl py-1">
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 inline-flex items-center gap-1.5">
              <FileText size={11} /> 전체 (1 page)
            </button>
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 inline-flex items-center gap-1.5">
              <Users size={11} /> 강사별 (6 pages)
            </button>
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 inline-flex items-center gap-1.5">
              <Users size={11} /> 학생별 (10 pages)
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// Section 2 — Unification matrix
// ============================================================

function UnificationOption1() {
  // Option 1 — 모두 dark
  return (
    <Card
      letter="O1"
      title="모두 Dark — 화면 + PDF 완전 일치"
      pros={[
        "weekly · daily · PDF 모두 같은 디자인 토큰",
        "사용자 멘탈 모델 1개",
      ]}
      cons={[
        "PDF 인쇄 시 잉크 낭비 큼 (검은 배경)",
        "흑백 인쇄 시 가독성 X",
      ]}
    >
      <div className="grid grid-cols-3 gap-3">
        <Preview label="Weekly (screen)" theme="dark" />
        <Preview label="Daily (screen)" theme="dark" />
        <Preview label="PDF (print)" theme="dark" />
      </div>
    </Card>
  );
}

function UnificationOption2() {
  // Option 2 — 화면 통일 + 인쇄 분리 (권장)
  return (
    <Card
      letter="O2"
      title="화면 통일 + PDF 분리 (권장)"
      pros={[
        "화면(weekly+daily) 일관 dark theme",
        "PDF 는 인쇄 친화 light pastel 유지",
        "잉크 친화 + 흑백 인쇄 안전",
      ]}
      cons={[
        "사용자 멘탈 모델 2개 (화면/인쇄)",
        "PDF preview vs 실제 화면 시각 다름",
      ]}
      recommended
    >
      <div className="grid grid-cols-3 gap-3">
        <Preview label="Weekly (screen)" theme="dark" />
        <Preview label="Daily (screen)" theme="dark" />
        <Preview label="PDF (print)" theme="light" />
      </div>
    </Card>
  );
}

function UnificationOption3() {
  // Option 3 — PDF mono
  return (
    <Card
      letter="O3"
      title="PDF 미니멀 Monochrome — 인쇄 최적화 극단"
      pros={[
        "잉크 사용 최소",
        "흑백 인쇄 완벽",
        "정보 밀도 극대",
      ]}
      cons={[
        "색상 정보 손실 (subject 구분 약함)",
        "사용자 디자인 톤 일관성 X",
      ]}
    >
      <div className="grid grid-cols-3 gap-3">
        <Preview label="Weekly (screen)" theme="dark" />
        <Preview label="Daily (screen)" theme="dark" />
        <Preview label="PDF (print)" theme="mono" />
      </div>
    </Card>
  );
}

// ============================================================
// Mini preview
// ============================================================

function Preview({
  label,
  theme,
}: {
  label: string;
  theme: "dark" | "light" | "mono";
}) {
  const isDark = theme === "dark";
  const isLight = theme === "light";
  return (
    <div className="flex flex-col">
      <div className="text-[10px] text-slate-400 mb-1">{label}</div>
      <div
        className="aspect-[1.41/1] rounded p-2 overflow-hidden text-[7px]"
        style={{
          background: isDark
            ? "#020617"
            : isLight
              ? "#ffffff"
              : "#ffffff",
          color: isDark
            ? "#e2e8f0"
            : isLight
              ? "#1e293b"
              : "#000000",
        }}
      >
        <div
          className="flex items-center justify-between mb-1 pb-0.5 border-b"
          style={{
            borderColor: isDark ? "#334155" : "#e2e8f0",
          }}
        >
          <span className="font-bold">시간표</span>
          <span style={{ color: isDark ? "#64748b" : "#94a3b8" }}>5/21</span>
        </div>
        <div className="grid grid-cols-3 gap-px">
          <Block subject="수학" theme={theme} />
          <Block subject="영어" theme={theme} />
          <Block subject="코딩" theme={theme} />
        </div>
      </div>
    </div>
  );
}

function Block({
  subject,
  theme,
}: {
  subject: keyof typeof SUBJECT;
  theme: "dark" | "light" | "mono";
}) {
  const color = SUBJECT[subject];
  if (theme === "dark") {
    return (
      <div
        className="rounded p-1 text-[6.5px]"
        style={{
          background: `${color}1f`,
          borderLeft: `2px solid ${color}`,
        }}
      >
        <div className="font-bold" style={{ color }}>
          {subject}
        </div>
        <div style={{ color: "#94a3b8" }}>09:00</div>
      </div>
    );
  }
  if (theme === "light") {
    // Light pastel — tintFromHex(0.8) emulation
    return (
      <div
        className="rounded p-1 text-[6.5px]"
        style={{
          background: `${color}33`,
          borderLeft: `2px solid ${color}`,
          color: "#1e293b",
        }}
      >
        <div className="font-bold">{subject}</div>
        <div style={{ color: "#64748b" }}>09:00</div>
      </div>
    );
  }
  // mono
  return (
    <div
      className="rounded p-1 text-[6.5px]"
      style={{
        background: "#f1f5f9",
        borderLeft: "2px solid #000",
        color: "#000",
      }}
    >
      <div className="font-bold">{subject}</div>
      <div style={{ color: "#525252" }}>09:00</div>
    </div>
  );
}

// ============================================================
// Card wrapper
// ============================================================

function Card({
  letter,
  title,
  pros,
  cons,
  recommended,
  children,
}: {
  letter: string;
  title: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-slate-900 rounded-lg p-4 ${
        recommended
          ? "border-2 border-amber-500/50"
          : "border border-slate-800"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 inline-flex items-center justify-center rounded bg-amber-500 text-slate-950 text-[10px] font-bold">
          {letter}
        </span>
        <h3 className="font-bold">{title}</h3>
        {recommended && (
          <span className="ml-auto px-1.5 py-0.5 text-[9px] rounded-full bg-amber-500 text-slate-950 font-bold">
            추천
          </span>
        )}
      </div>
      <div className="mb-3">{children}</div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div className="text-emerald-400 font-semibold mb-0.5">👍 장점</div>
          <ul className="text-slate-400 space-y-0.5">
            {pros.map((p, i) => (
              <li key={i}>· {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-rose-400 font-semibold mb-0.5">👎 단점</div>
          <ul className="text-slate-400 space-y-0.5">
            {cons.map((c, i) => (
              <li key={i}>· {c}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
