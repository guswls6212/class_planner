"use client";

import { useState } from "react";
import {
  Crown,
  Shield,
  GraduationCap,
  Copy,
  RefreshCw,
  XCircle,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Info,
  UserPlus,
  ChevronDown,
  Link2,
  Tag,
  Trash2,
} from "lucide-react";

/**
 * 팀 멤버 초대 UX 재설계 mockup.
 *
 * 사용자 의문 (2026-05-23):
 *   1. 관리자 초대 발급 시 멤버 목록에 표시되지 않아 추적 불가
 *   2. 링크 복사 quick action 버튼 + ... 메뉴 안에도 링크 복사 (중복)
 *   3. "재발송" / "초대 취소" 라벨 의미가 직관적이지 않음
 *
 * 진단 (코드 검증):
 *   - settings/page.tsx:651-669 — 멤버 목록 = ownerMember + teachers.map. admin invite (teacher_id=null) 는 어디에도 안 보임
 *   - settings/page.tsx:264-274 — 링크 복사 (quick + menu) 동일 동작
 *   - settings/page.tsx:290-296 — 재발송 = 새 invite 발급. 기존 토큰 그대로 살아있음
 *   - api/invites/[id]/route.ts — 초대 취소 = DELETE invite_tokens row
 *
 * 사용자의 mental model 과 다른 지점:
 *   - "재발송" 은 이메일 알림 의미인데 실제론 메일 발송 기능 없음 (이메일 인프라 자체가 미구현)
 *   - 같은 강사에 active token 누적 가능 (현재 코드 — race condition + 보안 우려)
 */

export default function TeamInviteRedesignPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Header />
        <ProblemDiagnosis />
        <SectionA_AdminTracking />
        <SectionB_MenuCleanup />
        <SectionC_Labels />
        <FinalRecommendation />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold mb-2">팀 멤버 초대 UX 재설계</h1>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
        2026-05-23 사용자 피드백 기반 visual companion. 코드 변경 X (mockup only).
        각 Variant 카드의 trade-off 확인 후, 채택할 조합을 알려주세요.
      </p>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
        <Info className="w-3.5 h-3.5" /> 실제 적용 대상 — <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">/settings</code>의 팀 섹션 + <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">InviteModal</code>
      </div>
    </header>
  );
}

function ProblemDiagnosis() {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-4">현재 동작 진단</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DiagnosisCard
          number="1"
          icon={<AlertTriangle className="w-4 h-4" />}
          title="관리자 초대 추적 불가"
          severity="high"
          body={
            <>
              <p className="text-[13px] mb-2">
                관리자 초대 발급 시 <code className="text-[11px] px-1 rounded bg-black/30">invite_tokens</code> row 만 생성. 멤버 목록은 <code className="text-[11px] px-1 rounded bg-black/30">teachers</code> 테이블 기반이라 admin invite는 화면 어디에도 안 보임.
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                → 누구에게 초대 보냈는지 추적 0. 같은 사람 중복 초대 발급 가능.
              </p>
            </>
          }
        />
        <DiagnosisCard
          number="2"
          icon={<Copy className="w-4 h-4" />}
          title="링크 복사 중복"
          severity="medium"
          body={
            <>
              <p className="text-[13px] mb-2">
                각 row에 <span className="text-amber-300">[링크 복사]</span> quick action + <span className="text-[var(--color-text-muted)]">⋯</span> 메뉴 안의 [링크 복사] 둘 다 같은 함수 호출.
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                → consistency vs 중복. 사용자 시선 분산.
              </p>
            </>
          }
        />
        <DiagnosisCard
          number="3"
          icon={<RefreshCw className="w-4 h-4" />}
          title="라벨 의미 mismatch"
          severity="medium"
          body={
            <>
              <p className="text-[13px] mb-2">
                <strong>재발송</strong> → 이메일 재발송 같지만 실제론 InviteModal 다시 열어 <em>새 토큰 발급</em>. 이메일 기능 자체 없음.
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                → 기존 토큰 살아있는 채로 새 토큰 누적 가능 (보안/UX 둘 다 문제).
              </p>
            </>
          }
        />
      </div>
    </section>
  );
}

function DiagnosisCard({
  number,
  icon,
  title,
  body,
  severity,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  severity: "high" | "medium";
}) {
  const dotColor = severity === "high" ? "bg-red-500/80" : "bg-amber-400/80";
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${dotColor}`}>
          {number}
        </span>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
        <h3 className="text-[14px] font-semibold">{title}</h3>
      </div>
      <div>{body}</div>
    </div>
  );
}

/* =====================================================================
 * Section A — 관리자 초대 추적 (Variant A/B/C)
 * ===================================================================== */

function SectionA_AdminTracking() {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-1">관리자 초대 추적 — Variant A / B / C</h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        admin invite를 어떻게 멤버 목록에서 추적 가능하게 할지.
      </p>
      <div className="space-y-5">
        <VariantA />
        <VariantB />
        <VariantC />
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

function VariantA() {
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="A"
        title="별도 섹션 분리"
        tagline="강사 / 관리자 / 대기 중 — 3개 섹션으로 분류"
        pros={["분류 명확", "역할별 권한 한눈에"]}
        cons={["스크롤 길어짐", "section 3개로 시각적 분산"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)] space-y-4">
        {/* 원장 */}
        <PreviewSection icon={<Crown className="w-3.5 h-3.5 text-amber-300" />} label="원장 (본인)">
          <MemberRow name="HYUNJIN LEE" email="project90.challenge@gmail.com" status="owner" />
        </PreviewSection>

        {/* 관리자 (admin) */}
        <PreviewSection icon={<Shield className="w-3.5 h-3.5 text-blue-300" />} label="관리자 0명 · 대기 1건">
          <AdminPendingRow alias="박원장님" expiresIn="D-1" tokenId="token-abc" />
        </PreviewSection>

        {/* 강사 (member) */}
        <PreviewSection icon={<GraduationCap className="w-3.5 h-3.5 text-emerald-300" />} label="강사 6명">
          <MemberRow name="김선생" status="invite_pending" expiresIn="D-1" />
          <MemberRow name="이선생" status="invite_pending" expiresIn="D-7" />
          <MemberRow name="박코치" status="invite_pending" expiresIn="D-1" />
          <MemberRow name="최쌤" status="none" />
        </PreviewSection>
      </div>
    </article>
  );
}

function VariantB() {
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="B"
        title="통합 목록 + admin placeholder"
        tagline="강사 목록 안에 admin invite를 익명 row로 삽입"
        pros={["한 화면 view", "스크롤 짧음"]}
        cons={["익명 row 식별 어려움", "admin/member 시각 분리 약함"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)] space-y-2">
        <MemberRow name="HYUNJIN LEE" email="project90.challenge@gmail.com" status="owner" />
        {/* admin invite placeholder — 이름 없이 */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-primary)] border border-dashed border-blue-400/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-400/15 text-blue-300 text-sm font-bold flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-[var(--color-text-muted)] italic">미지정 관리자</span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-400/10 text-blue-300 opacity-50">
                  <Shield className="w-3 h-3" /> 초대 대기 · D-1
                </span>
              </div>
              <p className="text-[12px] text-[var(--color-text-muted)] truncate mt-0.5">
                token-abc123 (수락 시 가입자 이름으로 자동 변경)
              </p>
            </div>
          </div>
          <QuickActions status="invite_pending" />
        </div>
        <MemberRow name="김선생" status="invite_pending" expiresIn="D-1" />
        <MemberRow name="이선생" status="invite_pending" expiresIn="D-7" />
        <MemberRow name="박코치" status="invite_pending" expiresIn="D-1" />
      </div>
    </article>
  );
}

function VariantC() {
  return (
    <article className="rounded-xl border border-emerald-400/30 overflow-hidden ring-1 ring-emerald-400/20">
      <VariantHeader
        letter="C"
        title="별칭 입력 + 통합 목록"
        tagline="invite 발급 시 별칭 (memo) 입력 → 강사 row 같은 형태로 통합 표시"
        recommended
        pros={["통합 view 유지", "추적 100% 가능", "원장이 직접 라벨링 → 메모 효과", "DB 스키마 변경 최소 (invite_tokens.invitee_label 컬럼 1개)"]}
        cons={["InviteModal 입력 항목 1개 추가", "스키마 마이그레이션 1건"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)] space-y-4">
        <div className="p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/20 text-[12px] text-emerald-200/90">
          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>핵심 아이디어</strong> — 관리자 초대 발급 시 모달에 "이 사람 별칭" 입력 필드. 강사와 동일하게 멤버 목록에 표시 (chip은 admin 파랑). 수락 시 별칭은 가입자 본인 이름으로 자동 교체 (또는 별칭 보존 옵션).
            </div>
          </div>
        </div>

        {/* invite modal preview */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 p-4">
          <p className="text-[11px] text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">InviteModal — 관리자 선택 시</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5 text-[var(--color-text-muted)]">이 사람 별칭 <span className="text-amber-300">*</span></label>
              <input
                disabled
                value="박원장님"
                className="w-full px-3 py-2 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm"
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">메모용. 수락 시 가입자 실명으로 자동 교체됩니다.</p>
            </div>
            <button disabled className="w-full px-4 py-2 rounded bg-[var(--color-accent)] text-black font-semibold text-sm">
              링크 생성 + 복사
            </button>
          </div>
        </div>

        {/* result list */}
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--color-text-muted)] mb-1 uppercase tracking-wide">발급 후 멤버 목록</p>
          <MemberRow name="HYUNJIN LEE" email="project90.challenge@gmail.com" status="owner" />
          {/* admin invite with alias */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-primary)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-400/15 text-blue-300 text-sm font-bold flex-shrink-0">박</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">박원장님</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-400/10 text-blue-300 opacity-50">
                    <Shield className="w-3 h-3" /> 초대 대기 · D-1
                  </span>
                </div>
                <p className="text-[12px] text-[var(--color-text-muted)] truncate mt-0.5">별칭 · 수락 후 실명으로 교체</p>
              </div>
            </div>
            <QuickActions status="invite_pending" />
          </div>
          <MemberRow name="김선생" status="invite_pending" expiresIn="D-1" />
          <MemberRow name="박코치" status="invite_pending" expiresIn="D-1" />
        </div>
      </div>
    </article>
  );
}

function PreviewSection({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MemberRow({
  name,
  email,
  status,
  expiresIn,
}: {
  name: string;
  email?: string;
  status: "owner" | "active" | "invite_pending" | "none" | "invite_expired";
  expiresIn?: string;
}) {
  const initial = name.charAt(0);
  const colorMap = {
    owner: { bg: "bg-amber-400/15", text: "text-amber-300" },
    active: { bg: "bg-emerald-400/15", text: "text-emerald-300" },
    invite_pending: { bg: "bg-emerald-400/15", text: "text-emerald-300" },
    invite_expired: { bg: "bg-zinc-500/15", text: "text-zinc-400" },
    none: { bg: "bg-zinc-500/15", text: "text-zinc-400" },
  };
  const colors = colorMap[status];

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-primary)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${colors.bg} ${colors.text} text-sm font-bold flex-shrink-0`}>
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{name}</span>
            <StatusPill status={status} expiresIn={expiresIn} />
            {status === "owner" && <span className="text-[11px] text-[var(--color-text-muted)]">본인</span>}
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)] truncate mt-0.5">
            {email ?? "이메일 미입력"}
          </p>
        </div>
      </div>
      <QuickActions status={status} />
    </div>
  );
}

function StatusPill({ status, expiresIn }: { status: string; expiresIn?: string }) {
  const map: Record<string, { Icon: typeof Crown; bg: string; text: string; label: string; dimmed?: boolean }> = {
    owner: { Icon: Crown, bg: "bg-amber-400/15", text: "text-amber-300", label: "원장" },
    active: { Icon: GraduationCap, bg: "bg-emerald-400/15", text: "text-emerald-300", label: "가입됨" },
    invite_pending: { Icon: GraduationCap, bg: "bg-emerald-400/10", text: "text-emerald-300", label: `초대 대기 · ${expiresIn ?? "D-?"}`, dimmed: true },
    invite_expired: { Icon: GraduationCap, bg: "bg-zinc-500/15", text: "text-zinc-400", label: "초대 만료", dimmed: true },
    none: { Icon: GraduationCap, bg: "bg-emerald-400/10", text: "text-emerald-300", label: "미초대", dimmed: true },
  };
  const cfg = map[status];
  if (!cfg) return null;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.dimmed ? "opacity-50" : ""}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function QuickActions({ status }: { status: string }) {
  if (status === "owner" || status === "active") return null;
  if (status === "none") {
    return (
      <button className="px-3 py-1.5 rounded text-[12px] font-semibold bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
        초대 보내기
      </button>
    );
  }
  if (status === "invite_expired") {
    return (
      <button className="px-3 py-1.5 rounded text-[12px] font-semibold bg-amber-400/15 text-amber-300">
        재초대
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button className="px-3 py-1.5 rounded text-[12px] font-semibold bg-amber-400/15 text-amber-300">
        링크 복사
      </button>
      <button className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]">
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
  );
}

function AdminPendingRow({ alias, expiresIn }: { alias: string; expiresIn: string; tokenId: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-primary)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-400/15 text-blue-300 text-sm font-bold flex-shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{alias}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-400/10 text-blue-300 opacity-50">
              <Shield className="w-3 h-3" /> 초대 대기 · {expiresIn}
            </span>
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)] truncate mt-0.5">관리자 권한 초대</p>
        </div>
      </div>
      <QuickActions status="invite_pending" />
    </div>
  );
}

/* =====================================================================
 * Section B — 메뉴 정리 (Option 1/2/3)
 * ===================================================================== */

function SectionB_MenuCleanup() {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-1">⋯ 메뉴 정리 — Option 1 / 2 / 3</h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        링크 복사 quick action 버튼이 따로 있을 때 ⋯ 메뉴를 어떻게 정리할지.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MenuOption1 />
        <MenuOption2 />
        <MenuOption3 />
      </div>
    </section>
  );
}

function MenuOption1() {
  return (
    <div className="rounded-xl border border-emerald-400/30 overflow-hidden ring-1 ring-emerald-400/20">
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-indigo-400/15 text-indigo-300 text-[11px] font-bold">1</span>
          <h3 className="text-[14px] font-semibold">중복 제거 (Recommended)</h3>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)]">quick action 에 있는 항목을 메뉴에서 제거</p>
      </div>
      <div className="p-4 bg-[var(--color-bg-primary)]">
        <FakeRow alias="박코치" />
        <div className="ml-auto w-44 -mt-2 relative">
          <DropdownMenu items={[
            { label: "새 링크 발급", desc: "기존 만료 + 새 토큰", icon: <RefreshCw className="w-3.5 h-3.5" /> },
            { label: "초대 취소", desc: "링크 무효화", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true },
          ]} />
        </div>
        <div className="mt-3 text-[11px] text-[var(--color-text-muted)] space-y-1">
          <p>✓ 메뉴 항목 3 → 2</p>
          <p>✓ 사용자 인지 부하 ↓</p>
          <p>× 메뉴 열어야만 보이는 액션 (재발송) 의 존재감 낮음</p>
        </div>
      </div>
    </div>
  );
}

function MenuOption2() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-indigo-400/15 text-indigo-300 text-[11px] font-bold">2</span>
          <h3 className="text-[14px] font-semibold">quick action 약화 + 메뉴 유지</h3>
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)]">consistency 우선, 모든 액션 메뉴 안에서 확인 가능</p>
      </div>
      <div className="p-4 bg-[var(--color-bg-primary)]">
        <FakeRow alias="박코치" quickActionVariant="ghost" />
        <div className="ml-auto w-44 -mt-2 relative">
          <DropdownMenu items={[
            { label: "링크 복사", desc: "클립보드", icon: <Copy className="w-3.5 h-3.5" /> },
            { label: "새 링크 발급", desc: "기존 만료 + 새 토큰", icon: <RefreshCw className="w-3.5 h-3.5" /> },
            { label: "초대 취소", desc: "링크 무효화", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true },
          ]} />
        </div>
        <div className="mt-3 text-[11px] text-[var(--color-text-muted)] space-y-1">
          <p>✓ 액션 일관성 (메뉴 안에서 다 검색 가능)</p>
          <p>× 여전히 중복 (quick + 메뉴 둘 다 링크 복사)</p>
        </div>
      </div>
    </div>
  );
}

function MenuOption3() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-indigo-400/15 text-indigo-300 text-[11px] font-bold">3</span>
          <h3 className="text-[14px] font-semibold">인라인 설명 메뉴</h3>
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)]">메뉴 안에 라벨 + 1줄 설명 + 색상 가이드</p>
      </div>
      <div className="p-4 bg-[var(--color-bg-primary)]">
        <FakeRow alias="박코치" />
        <div className="ml-auto w-60 -mt-2 relative">
          <DropdownMenu
            wide
            items={[
              { label: "새 링크 발급", desc: "기존 링크는 즉시 만료", icon: <RefreshCw className="w-3.5 h-3.5" /> },
              { label: "초대 취소", desc: "링크 무효화 (다시 못 씀)", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true },
            ]}
          />
        </div>
        <div className="mt-3 text-[11px] text-[var(--color-text-muted)] space-y-1">
          <p>✓ 신규 사용자 학습 비용 ↓</p>
          <p>✓ Option 1 + 메뉴 안 1줄 설명</p>
          <p>× 메뉴 폭 60 → 200px+ 필요</p>
        </div>
      </div>
    </div>
  );
}

function FakeRow({ alias, quickActionVariant }: { alias: string; quickActionVariant?: "ghost" | "default" }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]/40">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-400/15 text-violet-300 text-sm font-bold flex-shrink-0">
          {alias.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{alias}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-400/10 text-emerald-300 opacity-50">
              <GraduationCap className="w-3 h-3" /> 초대 대기 · D-1
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          className={`px-3 py-1.5 rounded text-[12px] font-semibold ${quickActionVariant === "ghost" ? "bg-transparent border border-[var(--color-border)] text-[var(--color-text-muted)]" : "bg-amber-400/15 text-amber-300"}`}
        >
          링크 복사
        </button>
        <button className="p-1.5 rounded text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function DropdownMenu({
  items,
  wide,
}: {
  items: { label: string; desc?: string; icon: React.ReactNode; danger?: boolean }[];
  wide?: boolean;
}) {
  return (
    <div className={`absolute right-0 mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-lg overflow-hidden ${wide ? "min-w-[220px]" : "min-w-[160px]"}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-start gap-2 px-3 py-2.5 hover:bg-white/5 ${item.danger ? "text-red-400" : "text-[var(--color-text-primary)]"}`}
        >
          <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
          <div className="min-w-0">
            <div className="text-[13px] font-medium">{item.label}</div>
            {item.desc && <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{item.desc}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
 * Section C — 라벨 명확화
 * ===================================================================== */

function SectionC_Labels() {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-1">라벨 명확화</h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        현재 라벨이 실제 동작과 어긋남. 추천 라벨 + 의미 정리.
      </p>
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-secondary)]/40 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">현재 라벨</th>
              <th className="px-4 py-3 text-left font-semibold">실제 동작</th>
              <th className="px-4 py-3 text-left font-semibold">권장 라벨</th>
              <th className="px-4 py-3 text-left font-semibold">권장 동작</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            <LabelRow
              current="링크 복사"
              now="기존 토큰을 URL로 클립보드 복사"
              proposed="링크 복사"
              proposedDesc="동일 (의미 명확)"
              ok
            />
            <LabelRow
              current="재발송"
              now="새 invite 발급. 기존 토큰 그대로 살아있음. 이메일 발송 X"
              proposed="새 링크 발급"
              proposedDesc="기존 토큰 자동 만료 + 새 토큰 발급 (덮어쓰기)"
              warn
            />
            <LabelRow
              current="재초대 (만료 시)"
              now="재발송과 동일 (새 invite 발급)"
              proposed="새 링크 발급"
              proposedDesc="만료/대기 무관, 라벨 통일"
              warn
            />
            <LabelRow
              current="초대 취소"
              now="invite_tokens DELETE → 링크 무효화"
              proposed="초대 취소"
              proposedDesc="동일"
              ok
            />
            <LabelRow
              current="(없음)"
              now="—"
              proposed="이메일 알림 보내기 (Phase 2)"
              proposedDesc="이메일 인프라 도입 시. 현재 미구현"
              future
            />
          </tbody>
        </table>
      </div>
      <div className="mt-4 p-4 rounded-lg bg-amber-400/5 border border-amber-400/20 text-[12px] text-amber-200/90">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>중요한 spec 결정</strong> — 현재 "재발송" 은 기존 토큰을 살려두는데, 토큰이 누적될수록 보안 위험 (옛 링크가 살아있음). <em>새 링크 발급 = 기존 자동 만료</em> 로 바꾸는 게 정공법. spec 확정 필요.
          </div>
        </div>
      </div>
    </section>
  );
}

function LabelRow({
  current,
  now,
  proposed,
  proposedDesc,
  ok,
  warn,
  future,
}: {
  current: string;
  now: string;
  proposed: string;
  proposedDesc: string;
  ok?: boolean;
  warn?: boolean;
  future?: boolean;
}) {
  const Indicator = ok ? CheckCircle2 : warn ? AlertTriangle : Info;
  const indicatorColor = ok ? "text-emerald-300" : warn ? "text-amber-300" : "text-zinc-400";
  return (
    <tr className="text-[13px]">
      <td className="px-4 py-3 font-medium">{current}</td>
      <td className="px-4 py-3 text-[var(--color-text-muted)]">{now}</td>
      <td className="px-4 py-3 font-medium">
        <span className="inline-flex items-center gap-1.5">
          <Indicator className={`w-3.5 h-3.5 ${indicatorColor}`} />
          {proposed}
        </span>
      </td>
      <td className="px-4 py-3 text-[var(--color-text-muted)]">
        {future ? <span className="italic">{proposedDesc}</span> : proposedDesc}
      </td>
    </tr>
  );
}

/* =====================================================================
 * Final Recommendation
 * ===================================================================== */

function FinalRecommendation() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <section className="mt-12 p-6 rounded-xl border border-emerald-400/30 bg-emerald-400/5">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-300" />
        통합 추천안 — C + 1 + "새 링크 발급"
      </h2>
      <div className="space-y-3 text-[13px] text-[var(--color-text-primary)]/90 leading-relaxed">
        <p>
          <strong>관리자 추적</strong>: <span className="text-emerald-300">Variant C</span> — InviteModal에 "별칭" 1줄 입력 추가, 강사 row 형식으로 통합 표시. invite_tokens 테이블에 <code className="text-[11px] px-1 rounded bg-black/30">invitee_label</code> 컬럼 1개 추가 (NULL 허용).
        </p>
        <p>
          <strong>⋯ 메뉴</strong>: <span className="text-emerald-300">Option 1</span> — 메뉴에서 "링크 복사" 제거, "새 링크 발급" + "초대 취소" 2개만. (인라인 설명은 추후 Phase 2에서 Option 3로 진화)
        </p>
        <p>
          <strong>라벨</strong>: <span className="text-emerald-300">"재발송" → "새 링크 발급"</span>. 동작도 <em>기존 토큰 자동 만료 + 새 토큰 발급</em> 으로 정정 (토큰 누적 방지).
        </p>
      </div>

      <div className="mt-5 p-4 rounded-lg bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)]">
        <p className="text-[12px] font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-wide">구현 영향 범위</p>
        <ul className="space-y-1.5 text-[12px] text-[var(--color-text-muted)]">
          <li className="flex items-start gap-2">
            <span className="text-emerald-300 flex-shrink-0">DB</span>
            <code className="text-[11px]">invite_tokens.invitee_label TEXT NULL</code> 컬럼 추가 (migration 1건)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-300 flex-shrink-0">API</span>
            <code className="text-[11px]">POST /api/invites</code> body에 <code className="text-[11px]">label</code>, <code className="text-[11px]">GET /api/invites</code> 응답에 <code className="text-[11px]">label</code> 포함. 새 링크 발급 시 <code className="text-[11px]">DELETE</code> + <code className="text-[11px]">POST</code> transactional
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-300 flex-shrink-0">UI</span>
            <code className="text-[11px]">InviteModal</code> 별칭 입력 추가, <code className="text-[11px]">settings/page.tsx</code> admin invite row 렌더링, <code className="text-[11px]">getMenuItems</code> 단순화, <code className="text-[11px]">TeacherStatusPill</code> admin 변형 추가
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-300 flex-shrink-0">test</span>
            invite 발급/취소/새 링크 발급 시나리오 + admin invite 표시 e2e
          </li>
        </ul>
      </div>

      <button
        onClick={() => setConfirmed(!confirmed)}
        className={`mt-5 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
          confirmed
            ? "bg-emerald-400 text-black"
            : "bg-[var(--color-accent)] text-black hover:opacity-90"
        }`}
      >
        {confirmed ? "✓ 확정 — 사용자에게 알려주세요" : "이 조합 채택 (mockup)"}
      </button>
      {confirmed && (
        <p className="mt-3 text-[12px] text-emerald-300">
          채택 시 사용자에게 알려주시면 PR 분기 (DB migration + API + UI + test).
        </p>
      )}

      <details className="mt-6 group">
        <summary className="cursor-pointer text-[12px] text-[var(--color-text-muted)] inline-flex items-center gap-1">
          <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
          Devil's Advocate — 이 추천안의 약점
        </summary>
        <div className="mt-3 p-4 rounded-lg bg-[var(--color-bg-secondary)]/40 text-[12px] text-[var(--color-text-muted)] space-y-2">
          <p>
            <strong>1. 별칭 입력 = 모달 input 1개 추가</strong> — 사용자 친화성 ↓. invite 발급 1회 더 클릭. 대안: 별칭 optional, 비우면 "관리자 #1" 자동 라벨.
          </p>
          <p>
            <strong>2. "새 링크 발급" 시 기존 자동 만료</strong> — 이미 발송한 링크가 무효화되어 confused 사용자 가능. 별도 confirm 모달 필요할 수도.
          </p>
          <p>
            <strong>3. invite_tokens 1행이 멤버 row가 됨</strong> — 같은 사람을 두 번 초대 (실수로) 시 row 중복. unique constraint 추가 또는 모달에서 detect.
          </p>
          <p>
            <strong>Rejected alternative</strong> — 별도 <code>admin_invites</code> 테이블 — 데이터 모델 분기 복잡. 기각.
          </p>
        </div>
      </details>
    </section>
  );
}
