"use client";

import { useState } from "react";
import {
  Users,
  UserX,
  UserCheck,
  Archive,
  Replace,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  Calendar,
  GraduationCap,
  EyeOff,
  Trash2,
} from "lucide-react";

/**
 * 강사 삭제 시 담당 수업 처리 UX 재설계 mockup.
 *
 * 사용자 의문 (2026-05-23):
 *   현재 강사 삭제 = teachers row DELETE + 수업 블록의 teacherId 만 undefined.
 *   수업은 "강사 정보 없음" 상태로 남음. 강사 교체(reassign) 흐름은 없음.
 *   "강사만 바뀌고 수업 블록은 그대로 유지" 시나리오 어떻게 우아하게 다룰까?
 *
 * 진단:
 *   - 학원 운영 현실 — 강사 퇴사 시 새 강사가 같은 수업 인계 받는 경우 많음
 *   - 현재: 삭제 → orphan → 새 강사 만들기 → 수업마다 일일이 강사 재배정 (수동, 시간 소요)
 *   - 더 나은 UX: 삭제·교체·보관을 명확히 분리 + 일괄 처리
 */

export default function TeacherReplaceUxPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Header />
        <Diagnosis />
        <SectionVariants />
        <FinalRecommendation />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold mb-2">강사 삭제 + 교체 + 보관 UX</h1>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
        강사 row 삭제 시 담당 수업 처리 방식. 단순 orphan 만으로는 강사 퇴사·교체 시나리오를
        커버하기 어려움. 우아하게 분리 + 일괄 처리하는 UI/UX 비교.
      </p>
    </header>
  );
}

function Diagnosis() {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-4">현재 동작 + 학원 운영 현실</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-indigo-300" />
            <h3 className="text-[14px] font-semibold">현재 동작</h3>
          </div>
          <ul className="text-[12px] space-y-1.5 text-[var(--color-text-secondary)]">
            <li>• <code>teachers</code> row DELETE</li>
            <li>• <code>sessions.teacherId</code> → <code>undefined</code> (수업 보존)</li>
            <li>• 시간표에 "강사 정보 없음" 으로 표시</li>
            <li>• 새 강사 만들면 수업마다 일일이 재배정 필요</li>
          </ul>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <h3 className="text-[14px] font-semibold">학원 운영 현실</h3>
          </div>
          <ul className="text-[12px] space-y-1.5 text-[var(--color-text-secondary)]">
            <li>• 강사 퇴사 → 새 강사 인수인계 (수업 그대로)</li>
            <li>• 정보 보존 — 휴직·재계약 가능성</li>
            <li>• "삭제" 라벨이 무거움 — 가벼운 "보관" 도 필요</li>
            <li>• 수업별 다른 강사 배정도 가능</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function SectionVariants() {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-5">Variant A / B / C / D / E</h2>
      <div className="space-y-5">
        <VariantA />
        <VariantB />
        <VariantC />
        <VariantD />
        <VariantE />
      </div>
    </section>
  );
}

function VariantHeader({
  letter,
  title,
  tagline,
  recommended,
  pros,
  cons,
}: {
  letter: string;
  title: string;
  tagline: string;
  recommended?: boolean;
  pros: string[];
  cons: string[];
}) {
  return (
    <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 rounded-t-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-indigo-400/15 text-indigo-300 text-xs font-bold">
          {letter}
        </span>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {recommended && (
          <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Recommended
          </span>
        )}
      </div>
      <p className="text-[12px] text-[var(--color-text-muted)] mb-2">{tagline}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-[12px]">
        <ul className="space-y-1">
          {pros.map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-emerald-300/90">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <ul className="space-y-1">
          {cons.map((c) => (
            <li key={c} className="flex items-start gap-1.5 text-amber-300/80">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ===== Variant A — 현재 동작 (Orphan) ===== */
function VariantA() {
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="A"
        title="단순 삭제 + Orphan (현재 동작)"
        tagline="강사만 삭제. 수업은 '강사 정보 없음' 으로 표시"
        pros={["구현 단순", "데이터 손실 없음 (수업 보존)"]}
        cons={["수업마다 새 강사 재배정 일일이 해야 함", "'강사 정보 없음' UX 불편"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)]">
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)]/40 border border-[var(--color-border)]">
            <p className="text-[var(--color-text-muted)] uppercase tracking-wide text-[10px] font-semibold mb-1">Before</p>
            <p className="flex items-center gap-1.5 mb-1"><GraduationCap className="w-3.5 h-3.5 text-emerald-300" /> 강사_uat</p>
            <p className="text-[var(--color-text-muted)] text-[11px]">담당 수업 4개</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)]/40 border border-red-500/30">
            <p className="text-[var(--color-text-muted)] uppercase tracking-wide text-[10px] font-semibold mb-1">After 삭제</p>
            <p className="flex items-center gap-1.5 mb-1 text-zinc-400"><UserX className="w-3.5 h-3.5" /> (강사 정보 없음)</p>
            <p className="text-amber-300/80 text-[11px]">수업 4개 → 회색 표시</p>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ===== Variant B — Reassign (강사 교체) ===== */
function VariantB() {
  const [selected, setSelected] = useState<string>("teacher-new");
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="B"
        title="삭제 + 일괄 교체 (Reassign)"
        tagline="삭제 모달에서 대체 강사 선택 → 모든 수업 reassign"
        pros={["강사 퇴사 시 깔끔한 인수인계", "수업 정보 손실 없음", "한 번에 처리"]}
        cons={["대체 강사 먼저 만들어둬야", "선택 실수 시 모든 수업 영향"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)]">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <Replace className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold">강사_uat 삭제 + 수업 인계</h3>
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)] mb-3">담당 수업 4개를 인계받을 강사를 선택하세요</p>

          <div className="space-y-1.5 mb-4">
            {[
              { id: "teacher-new", name: "박코치", color: "bg-violet-400/15 text-violet-300" },
              { id: "teacher-2", name: "김선생", color: "bg-blue-400/15 text-blue-300" },
              { id: "teacher-3", name: "이선생", color: "bg-emerald-400/15 text-emerald-300" },
            ].map((t) => (
              <label
                key={t.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer ${selected === t.id ? "border-amber-400/50 bg-amber-400/5" : "border-[var(--color-border)] hover:bg-white/5"}`}
              >
                <input type="radio" checked={selected === t.id} onChange={() => setSelected(t.id)} className="accent-amber-400" />
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${t.color}`}>{t.name.charAt(0)}</span>
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>

          <div className="rounded-lg bg-amber-400/5 border border-amber-400/20 p-2.5 mb-3 text-[11px] text-amber-200/80 flex items-start gap-2">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            수업 4개가 모두 박코치 강사로 이전됩니다. 처리 후 강사_uat 는 삭제됩니다.
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm">취소</button>
            <button className="flex-1 py-2 bg-amber-400 text-black rounded-lg text-sm font-semibold">교체 + 삭제</button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ===== Variant C — Archive (보관) ===== */
function VariantC() {
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="C"
        title="보관 (Archive) — 삭제 대신 비활성화"
        tagline="강사 row 유지 + 목록에서 숨김. 휴직·재계약 가능성 보존"
        pros={["데이터 100% 보존", "재활성화 1-click", "수업 강사 정보 그대로"]}
        cons={["DB 누적 (장기간 미사용 강사 정리 필요)", "삭제 대비 의도 약간 모호"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)] space-y-4">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <Archive className="w-5 h-5 text-blue-300" />
            <h3 className="text-base font-bold">강사_uat 보관</h3>
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)] mb-3 leading-relaxed">
            강사를 목록에서 숨깁니다. 정보·담당 수업 그대로 보존되며, 언제든 복구 가능합니다.
          </p>
          <div className="rounded-lg bg-blue-400/5 border border-blue-400/20 p-3 mb-3 space-y-1.5 text-[11px]">
            <p className="flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5 text-blue-300" /> 강사 페이지에서 숨김</p>
            <p className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-emerald-300" /> 수업 4개 — 강사 정보 그대로 표시 (회색 처리)</p>
            <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-300" /> 보관 시점 기록</p>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm">취소</button>
            <button className="flex-1 py-2 bg-blue-400 text-black rounded-lg text-sm font-semibold">보관하기</button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)]/40 text-[11px] text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text-secondary)]">필터 UI</strong> — 강사 페이지 헤더에 "보관된 강사" 토글 + "복구" 액션. DB 컬럼 <code>teachers.archived_at TIMESTAMPTZ NULL</code> 추가 (migration 1건).
        </div>
      </div>
    </article>
  );
}

/* ===== Variant D — 통합 선택 (Hybrid) ===== */
function VariantD() {
  const [choice, setChoice] = useState<"orphan" | "reassign" | "archive">("reassign");
  return (
    <article className="rounded-xl border border-emerald-400/30 overflow-hidden ring-1 ring-emerald-400/20">
      <VariantHeader
        letter="D"
        title="통합 선택 모달 (Recommended)"
        tagline="삭제 모달에서 라디오 옵션 — Orphan / Reassign / Archive 중 선택"
        recommended
        pros={[
          "운영자가 상황별 선택 가능 (퇴사·재계약·교체)",
          "한 모달에서 3가지 패턴 통합",
          "각 옵션 영향 미리보기",
        ]}
        cons={[
          "선택지 늘어남 → 학습 비용 (초기)",
          "단순 삭제 케이스도 한 단계 추가",
        ]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)]">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <UserCheck className="w-5 h-5 text-emerald-300" />
            <h3 className="text-base font-bold">강사_uat 처리</h3>
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)] mb-3">담당 수업 4개를 어떻게 처리하시겠습니까?</p>

          <div className="space-y-2 mb-3">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${choice === "reassign" ? "border-amber-400/50 bg-amber-400/5" : "border-[var(--color-border)] hover:bg-white/5"}`}>
              <input type="radio" checked={choice === "reassign"} onChange={() => setChoice("reassign")} className="mt-1 accent-amber-400" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Replace className="w-3.5 h-3.5 text-amber-300" />
                  <span className="font-medium text-sm">다른 강사로 인계 (Reassign)</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">대체 강사 선택 → 수업 4개 모두 새 강사로 이전</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${choice === "archive" ? "border-blue-400/50 bg-blue-400/5" : "border-[var(--color-border)] hover:bg-white/5"}`}>
              <input type="radio" checked={choice === "archive"} onChange={() => setChoice("archive")} className="mt-1 accent-blue-400" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-blue-300" />
                  <span className="font-medium text-sm">보관 (Archive)</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">목록에서 숨김. 수업 정보 그대로 보존. 복구 가능</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${choice === "orphan" ? "border-red-500/50 bg-red-500/5" : "border-[var(--color-border)] hover:bg-white/5"}`}>
              <input type="radio" checked={choice === "orphan"} onChange={() => setChoice("orphan")} className="mt-1 accent-red-400" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-medium text-sm text-red-400">완전 삭제 (수업 강사 정보 잃음)</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">강사 row 영구 삭제. 수업 4개 → "강사 정보 없음". 복구 불가</p>
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm">취소</button>
            <button className="flex-1 py-2 bg-emerald-400 text-black rounded-lg text-sm font-semibold">진행</button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ===== Variant E — 분리된 메뉴 (강사 교체는 별개 액션) ===== */
function VariantE() {
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="E"
        title="메뉴 분리 — '강사 교체' / '보관' / '삭제' 3개 액션"
        tagline="삭제 모달에 선택지 X. 각 액션이 ⋯ 메뉴에 별도 항목"
        pros={["각 액션의 의미 명확", "선택 실수 가능성 ↓", "교체는 빈번 → quick access"]}
        cons={["⋯ 메뉴 길어짐 (3 + 기존)", "사용자가 액션 종류 학습 필요"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)]">
        <div className="ml-auto w-60 relative">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-lg overflow-hidden">
            {[
              { icon: Replace, label: "다른 강사로 인계", desc: "수업 N개 이전 + 삭제", color: "text-amber-300" },
              { icon: Archive, label: "보관", desc: "숨김 + 정보 보존", color: "text-blue-300" },
              { icon: Trash2, label: "삭제 (수업 정보 잃음)", desc: "복구 불가", color: "text-red-400" },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="flex items-start gap-2 px-3 py-2.5 hover:bg-white/5">
                <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${color}`} />
                <div className="min-w-0">
                  <div className={`text-[13px] font-medium ${color}`}>{label}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function FinalRecommendation() {
  return (
    <section className="mt-12 p-6 rounded-xl border border-emerald-400/30 bg-emerald-400/5">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-300" />
        통합 추천안 — Variant D (선택 모달) + C 별도 기능
      </h2>
      <div className="space-y-3 text-[13px] leading-relaxed">
        <p>
          <strong>핵심 결정</strong>: 강사 row 삭제 시 처리 옵션을 한 모달에서 명시적으로 선택. 기본 선택 = <strong>Reassign</strong> (가장 빈번한 시나리오).
        </p>
        <p>
          <strong>3가지 옵션</strong>:
        </p>
        <ul className="space-y-1 text-[12px] text-[var(--color-text-secondary)] list-disc pl-5">
          <li><strong>Reassign</strong> (default) — 대체 강사 선택 → 수업 일괄 이전 + 강사 삭제. 강사 퇴사·인수인계 시나리오</li>
          <li><strong>Archive</strong> — 강사 row 보존 + 목록에서 숨김. 휴직·재계약 가능. 수업 강사 정보 그대로</li>
          <li><strong>완전 삭제 (Orphan)</strong> — 강사 row 영구 삭제 + 수업 "강사 정보 없음". 가장 무거운 선택, typing confirmation 추가</li>
        </ul>

        <div className="mt-4 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20 text-[12px]">
          <strong className="text-amber-300">Phased 도입 권장</strong>:
          <ul className="mt-1.5 space-y-1 text-amber-200/90 list-decimal pl-5">
            <li>Phase 1 — Archive 만 추가 (가장 안전, DB column 1개). 기존 "삭제" 라벨을 "보관" 으로 변경. typing 그대로</li>
            <li>Phase 2 — Reassign 추가 (대체 강사 선택 UI + 일괄 sessions update API)</li>
            <li>Phase 3 — 완전 삭제는 "고급 옵션" 으로 별도 위치 (실수 방지)</li>
          </ul>
        </div>
      </div>

      <details className="mt-6 group">
        <summary className="cursor-pointer text-[12px] text-[var(--color-text-muted)] inline-flex items-center gap-1">
          <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
          Devil&apos;s Advocate — D 의 약점
        </summary>
        <div className="mt-3 p-4 rounded-lg bg-[var(--color-bg-secondary)]/40 text-[12px] text-[var(--color-text-muted)] space-y-2">
          <p><strong>1. 선택지 늘어남</strong> — 운영자가 매번 3개 옵션 고민. 빈번 케이스(reassign)가 default 라 1-click 가능.</p>
          <p><strong>2. Reassign 의 대체 강사 부재</strong> — 새 강사 먼저 만들어야 함. 모달 안에 "+ 새 강사 만들기" 단축 버튼.</p>
          <p><strong>3. 마이그레이션 비용</strong> — 기존 "삭제" 라벨/동작 변경. e2e + 사용자 학습 비용.</p>
          <p><strong>Rejected</strong> — Variant E (3개 분리 메뉴) — 메뉴 5+ 항목으로 시각 부담. 모달 안 통합이 더 깔끔.</p>
        </div>
      </details>
    </section>
  );
}
