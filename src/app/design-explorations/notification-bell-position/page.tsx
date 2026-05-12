"use client";

import { useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";

// design-explorations: Sidebar 안에서 NotificationBell 위치 4가지 변형 비교.
// 사용자가 본인 브라우저로 직접 expand/collapse + variant 토글 + 배지 카운트 변경
// 후 결정. 기존 dev/prod 코드 영향 X (라우트 분리, production middleware 차단).

type Variant = "A" | "B" | "C" | "D";

const VARIANT_DESCRIPTIONS: Record<Variant, string> = {
  A: "학원 박스 안 우측 inline (한 줄에 학원 이름 + 종)",
  B: "Academy 박스 위 별도 row (sidebar 최상단 우측)",
  C: "Academy 박스 아래 별도 row (학원 → 알림 → nav)",
  D: "Sidebar 최상단 우상단 floating (학원 박스 외부, absolute)",
};

type BellMode = "sm" | "md" | "nav";

function MockBell({ unread = 2, mode = "md" }: { unread?: number; mode?: BellMode }) {
  // sm = TopBar compact, md = Sidebar expanded inline, nav = Sidebar collapsed (nav menu와 동등)
  const dim = mode === "sm" ? "w-7 h-7" : mode === "md" ? "w-9 h-9" : "w-10 h-10";
  const iconSize = mode === "sm" ? 14 : mode === "md" ? 18 : 22;
  return (
    <button
      type="button"
      aria-label={unread > 0 ? `알림 ${unread}개` : "알림"}
      className={`${dim} relative inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors`}
    >
      <Bell size={iconSize} strokeWidth={1.5} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold inline-flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

interface SidebarMockupProps {
  variant: Variant;
  expanded: boolean;
  unread: number;
}

function SidebarMockup({ variant, expanded, unread }: SidebarMockupProps) {
  const width = expanded ? "w-52" : "w-14";
  const align = expanded ? "items-start" : "items-center";

  // Academy 박스 — 실제 Sidebar.tsx의 activeAcademy switcher 모방
  // Expanded 시 w-full로 부모(flex-1) 채워서 학원 이름 박스가 sidebar 거의 전 너비 차지
  const academyBox = (
    <button
      type="button"
      className={`flex items-center rounded-lg transition-colors hover:opacity-80 ${
        expanded ? "w-full px-3 py-2 gap-2 text-sm font-semibold" : "w-9 h-9 justify-center text-xs font-bold"
      }`}
      style={{
        backgroundColor: "color-mix(in srgb, #fbbf24 25%, transparent)",
        color: "#fbbf24",
      }}
    >
      {expanded ? "테스트학원" : "테"}
    </button>
  );

  return (
    <aside
      className={`relative flex flex-col gap-1 py-4 bg-slate-950 border-r border-slate-800 transition-[width] duration-200 ${width} ${align}`}
      style={{ minHeight: 600 }}
    >
      {/* Variant D: floating bell at top-right corner (outside academy box) */}
      {variant === "D" && (
        <div className={`absolute ${expanded ? "right-2 top-2" : "right-0 -top-1"} z-10`}>
          <MockBell unread={unread} mode="sm" />
        </div>
      )}

      {/* Variant B: separate row ABOVE academy box */}
      {variant === "B" && (
        <div className={`${expanded ? "w-full px-2" : ""} flex justify-end mb-1`}>
          <MockBell unread={unread} mode="sm" />
        </div>
      )}

      {/* Academy switcher area */}
      <div className={`relative mb-4 ${expanded ? "w-full px-2" : ""}`}>
        {variant === "A" ? (
          // Inline: academy box + bell in one row (Expanded) / stack (Collapsed)
          // Expanded: 학원 박스가 flex-1 min-w-0로 거의 전 너비 차지 + 종 옆에 md size
          // Collapsed: 학원 이니셜 (w-9 h-9) 위, 종 (nav size = w-10 h-10) 아래
          <div className={`flex items-center ${expanded ? "gap-1.5" : "flex-col gap-1"}`}>
            <div className={expanded ? "flex-1 min-w-0" : ""}>{academyBox}</div>
            <MockBell unread={unread} mode={expanded ? "md" : "nav"} />
          </div>
        ) : (
          academyBox
        )}
      </div>

      {/* Variant C: separate row BELOW academy box */}
      {variant === "C" && (
        <div className={`${expanded ? "w-full px-2" : ""} flex ${expanded ? "justify-end" : "justify-center"} mb-2`}>
          <MockBell unread={unread} mode="sm" />
        </div>
      )}

      {/* Nav items — 실제 Sidebar.tsx의 visibleTopItems 모방 */}
      <div className={`flex flex-col gap-1 ${expanded ? "w-full px-2" : ""}`}>
        {[
          { href: "/schedule", icon: CalendarDays, label: "시간표", active: true },
          { href: "/students", icon: Users, label: "학생" },
          { href: "/subjects", icon: BookOpen, label: "과목" },
          { href: "/teachers", icon: GraduationCap, label: "강사" },
          { href: "/settings", icon: Settings, label: "설정" },
        ].map((item) => (
          <div
            key={item.href}
            className={`flex items-center h-10 rounded-md ${
              expanded ? "w-full px-3 gap-3" : "justify-center w-10"
            } ${
              item.active
                ? "bg-amber-400 text-slate-900"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <item.icon size={22} strokeWidth={1.5} className="flex-shrink-0" />
            {expanded && <span className="text-sm font-medium">{item.label}</span>}
          </div>
        ))}
      </div>

      {/* Bottom: toggle */}
      <div className="mt-auto flex flex-col gap-1">
        <div className="flex items-center justify-center w-7 h-7 rounded text-slate-500">
          {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </div>
      </div>
    </aside>
  );
}

export default function NotificationBellPositionPage() {
  const [variant, setVariant] = useState<Variant>("A");
  const [expanded, setExpanded] = useState(true);
  const [unread, setUnread] = useState(2);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Control bar */}
      <div className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs uppercase tracking-wide text-slate-500">디자인 탐색</span>
          <span className="text-sm font-medium">Sidebar 종 위치</span>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-slate-400">변형:</span>
            {(["A", "B", "C", "D"] as Variant[]).map((v) => {
              const active = variant === v;
              return (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    active ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                  title={VARIANT_DESCRIPTIONS[v]}
                >
                  {v}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-slate-400">상태:</span>
            <button
              onClick={() => setExpanded(true)}
              className={`px-2.5 py-1 rounded text-xs ${
                expanded ? "bg-amber-500/20 text-amber-200 border border-amber-500/50" : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              Expanded (w-52)
            </button>
            <button
              onClick={() => setExpanded(false)}
              className={`px-2.5 py-1 rounded text-xs ${
                !expanded ? "bg-amber-500/20 text-amber-200 border border-amber-500/50" : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              Collapsed (w-14)
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400">unread:</span>
            {[0, 2, 5, 12].map((n) => (
              <button
                key={n}
                onClick={() => setUnread(n)}
                className={`px-2 py-0.5 rounded text-xs ${
                  unread === n ? "bg-amber-500/20 text-amber-200 border border-amber-500/50" : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">{variant} · {VARIANT_DESCRIPTIONS[variant]}</div>
      </div>

      {/* 4 variants side-by-side preview */}
      <div className="p-6">
        <h2 className="text-sm font-medium text-slate-300 mb-3">선택 변형 (대형)</h2>
        <div className="flex gap-6 mb-10">
          <SidebarMockup variant={variant} expanded={expanded} unread={unread} />
          <div className="flex-1 bg-slate-900/40 rounded-lg p-4 border border-slate-800 text-xs text-slate-500">
            <p className="font-medium text-slate-300 mb-2">미리 보기 가이드</p>
            <ul className="space-y-1.5">
              <li>• 상단 토글: 변형 A/B/C/D + Expanded/Collapsed + unread 카운트</li>
              <li>• 좌측은 선택된 변형 (실제 sidebar와 동일 width). 본문은 시뮬용.</li>
              <li>• 하단에 4개 동시 비교 (Expanded·Collapsed 모두).</li>
              <li>• unread=0이면 배지 안 보임. unread=12면 "9+".</li>
            </ul>

            <p className="font-medium text-slate-300 mt-4 mb-2">변형 차이</p>
            <ul className="space-y-1.5">
              <li><span className="text-amber-300 font-medium">A</span> — 학원 박스 안 우측 (한 줄). Expanded에선 학원 이름 옆, Collapsed에선 학원 이니셜 아래.</li>
              <li><span className="text-amber-300 font-medium">B</span> — Academy 박스 <em>위</em> 별도 row. 최상단 우측 정렬.</li>
              <li><span className="text-amber-300 font-medium">C</span> — Academy 박스 <em>아래</em> 별도 row. 학원 → 알림 → nav 순.</li>
              <li><span className="text-amber-300 font-medium">D</span> — Academy 박스 <em>외부</em> floating (top-right corner). absolute 위치라 collapse 시 sidebar 영역 벗어남.</li>
            </ul>
          </div>
        </div>

        <h2 className="text-sm font-medium text-slate-300 mb-3">4개 변형 동시 비교 (Expanded)</h2>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {(["A", "B", "C", "D"] as Variant[]).map((v) => (
            <div key={v} className="flex flex-col">
              <div className="text-[11px] text-amber-300 font-medium mb-1">변형 {v}</div>
              <div className="text-[10px] text-slate-500 mb-2 h-8">{VARIANT_DESCRIPTIONS[v]}</div>
              <SidebarMockup variant={v} expanded={true} unread={unread} />
            </div>
          ))}
        </div>

        <h2 className="text-sm font-medium text-slate-300 mb-3">4개 변형 동시 비교 (Collapsed)</h2>
        <div className="grid grid-cols-4 gap-4">
          {(["A", "B", "C", "D"] as Variant[]).map((v) => (
            <div key={v} className="flex flex-col">
              <div className="text-[11px] text-amber-300 font-medium mb-1">변형 {v}</div>
              <SidebarMockup variant={v} expanded={false} unread={unread} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
