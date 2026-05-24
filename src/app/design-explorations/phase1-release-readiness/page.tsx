"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Database,
  Eye,
  ExternalLink,
  FileText,
  FlaskConical,
  GitBranch,
  Info,
  Layout,
  ListChecks,
  Lock,
  Package,
  Rocket,
  Search,
  Send,
  Shield,
  Sparkles,
  Target,
  Timer,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Phase 1 Production Release Readiness
 *
 * 2026-05-24 작성. 친구 학원 운영자(와이프 공동 운영) 선공개 =
 * dev → main 머지 + Lightsail production deploy.
 *
 * 본 페이지는 monetization-strategy 의 ⑨ Phase1Readiness 섹션을
 * Phase 1 한정 SSOT 로 분리·확장한 것. 3-bucket 정리:
 *   ① 이미 구현 (13 영역, 코어 충분)
 *   ② 아직 부족 (Top 10, 친구 선공개 전 채울 항목)
 *   ③ 미래 Phase 에 분류돼 있었지만 사실 Phase 1 에 이미 구현된 것 (3개)
 *
 * Goal: Phase 1 = production 출시. UAT 전면 수정 + production-grade
 * 테스트 통과 후 main 머지.
 */
export default function Phase1ReleaseReadinessPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-14">
        <Header />
        <ExecutiveSummary />
        <ImplementedFeatures />
        <MissingFeatures />
        <AlreadyImplementedFutureFeatures />
        <ReleaseRoadmap />
        <UATPhase1Guide />
        <ProductionTestGuide />
        <Footer />
      </div>
    </main>
  );
}

/* ───────────────── Header ───────────────── */

function Header() {
  return (
    <header>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">
            Phase 1 Production Release Readiness
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
            친구 학원 운영자 선공개 전 — 이미 구현 vs 부족 vs 미래에서 이미
            구현 + UAT/Production 테스트 가이드
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
        <Info className="w-3.5 h-3.5 flex-shrink-0" /> 2026-05-24 작성 · SSOT
        for Phase 1 release planning ·{" "}
        <Link
          href="/design-explorations/monetization-strategy"
          className="underline hover:text-[var(--color-text-primary)]"
        >
          monetization-strategy
        </Link>
        의 ⑨ Phase1Readiness 확장판
      </div>
    </header>
  );
}

/* ───────────────── Executive Summary ───────────────── */

function ExecutiveSummary() {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="emerald"
          count={13}
          label="이미 구현"
          sub="코어 충분 · 친구 시연 가능"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5" />}
          tone="amber"
          count={10}
          label="아직 부족"
          sub="선공개 전 1-2주 작업"
        />
        <SummaryCard
          icon={<Sparkles className="w-5 h-5" />}
          tone="violet"
          count={3}
          label="미래에서 이미 구현"
          sub="Phase 2 분류였지만 Phase 1 완료"
        />
      </div>
      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-[var(--color-text-primary)]">한 줄 결론:</strong>{" "}
        Phase 1 코어는 13 영역 완성 (mockup이 누락한 권한 시스템 + 데이터 복구
        UI 포함). 부족한 건 acquisition/feedback 인프라 (피드백 채널 / SEO /
        Sentry / Analytics 등 — 모두 낮은 effort). production-grade 테스트
        인프라 (`npm run test:release` + UAT Phase 1 mode) 통과 후 dev → main
        머지 = 친구 선공개.
      </div>
    </section>
  );
}

function SummaryCard({
  icon,
  tone,
  count,
  label,
  sub,
}: {
  icon: React.ReactNode;
  tone: "emerald" | "amber" | "violet";
  count: number;
  label: string;
  sub: string;
}) {
  const toneMap = {
    emerald: {
      border: "border-emerald-500/30 bg-emerald-500/5",
      iconBg: "bg-emerald-500/15 text-emerald-400",
      count: "text-emerald-300",
    },
    amber: {
      border: "border-amber-500/30 bg-amber-500/5",
      iconBg: "bg-amber-500/15 text-amber-400",
      count: "text-amber-300",
    },
    violet: {
      border: "border-violet-500/30 bg-violet-500/5",
      iconBg: "bg-violet-500/15 text-violet-400",
      count: "text-violet-300",
    },
  } as const;
  const t = toneMap[tone];
  return (
    <div className={`rounded-xl border p-5 ${t.border}`}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.iconBg}`}
        >
          {icon}
        </div>
        <div className={`text-3xl font-bold ${t.count}`}>{count}</div>
      </div>
      <div className="font-semibold text-sm mb-0.5">{label}</div>
      <div className="text-[11px] text-[var(--color-text-muted)]">{sub}</div>
    </div>
  );
}

/* ───────────────── 1. 이미 구현 (13 영역) ───────────────── */

const IMPLEMENTED: Array<{
  name: string;
  where: string;
  quality: "complete" | "partial";
  note: string;
}> = [
  {
    name: "시간표 작성 + 드래그앤드롭",
    where: "/schedule (src/app/schedule)",
    quality: "complete",
    note: "Local-first 0ms 조작. yPosition 정수 reorder + lane 자동 확장",
  },
  {
    name: "학생 / 강사 / 과목 CRUD",
    where: "/students /teachers /subjects",
    quality: "complete",
    note: "활성/보관 + 검색 + 입력 검증 (학생/강사 6, 과목 12, 학원 30자)",
  },
  {
    name: "출결 관리",
    where: "AttendanceSheet (schedule 내부)",
    quality: "partial",
    note: "API + UI 완성. SessionCard + ScheduleDailyView 에서 호출. 단 별도 메뉴 없음 — 발견성 낮음",
  },
  {
    name: "PDF 인쇄",
    where: "PDFDownloadButton + PdfDownloadSection",
    quality: "complete",
    note: "학원 운영자 핵심 가치. /schedule 에서 직접 출력",
  },
  {
    name: "학부모 share (token + access-code)",
    where: "/share/[token] + /api/share-tokens",
    quality: "complete",
    note: "6자리 access-code + 만료. /api/share/code 로 권한 검증",
  },
  {
    name: "학원 멤버 / 강사 초대",
    where: "/invite/[token] + /api/invites/accept",
    quality: "complete",
    note: "이번 세션 16 PR 사이클 + #460 (joined_at ack) 로 UX 다듬어짐",
  },
  {
    name: "데이터 백업 + 복구 UI (자동 스냅샷)",
    where: "DataHistorySection + /api/data-snapshots/[id]/restore",
    quality: "complete",
    note: "설정 페이지 노출. owner/admin gate. 스냅샷 리스트 + 학생/과목/수업 count + 복원/삭제 모달. mockup이 'UI 미연결' 이라 했지만 사실 연결됨 (PR 이전 작업)",
  },
  {
    name: "강사 보관 (archived_at)",
    where: "/teachers + /api/teachers/[id]/archive",
    quality: "partial",
    note: "PR #449/450 완성. vocabulary 사용자 결정 후 단어 통일 예정 (보관/휴지통/아카이브)",
  },
  {
    name: "PWA manifest (standalone)",
    where: "src/app/manifest.ts",
    quality: "complete",
    note: "name/short_name/icons/theme_color 완비. push 알림은 미구현 (Phase 2 모바일 push)",
  },
  {
    name: "Server-side error log",
    where: "/api/logs/client + omni-radar 연동",
    quality: "complete",
    note: "사용자 console error 가 server 로 전송. omni-radar :8888 대시보드 + jsonl 로그",
  },
  {
    name: "OAuth 로그인 (Google 단일)",
    where: "Supabase Auth + /login",
    quality: "partial",
    note: "Google provider만 active (signInWithOAuth). 카카오 버튼은 disabled='준비 중' placeholder. mockup이 'Google/Kakao 완성'이라 했지만 사실 Google만. 익명-First + 로그인 시 마이그",
  },
  {
    name: "다중 academy (학원 무제한)",
    where: "academies + academy_members + Sidebar",
    quality: "complete",
    note: "PR #462 Slack/Linear/Notion 패턴 — 무제한. ADR-023. active_academy 사전 set (PR #456)",
  },
  {
    name: "권한 시스템 (owner / admin / member)",
    where: "lib/auth/permissions.ts + MemberContext",
    quality: "complete",
    note: "3-tier role + canManage 정책. PR #460-462 multi-academy + invite role 통합. mockup이 'Phase 2 - 강사별 권한 세분'으로 분류했지만 사실 Phase 1에 구현됨",
  },
];

function ImplementedFeatures() {
  return (
    <section>
      <SectionHeader icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}>
        ① 이미 구현 (13 영역) — 코어 충분
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        실제 소스 코드 grep + 컴포넌트 확인 결과. mockup의 12 영역 중 7번 (데이터
        백업) UI 상태 + 11번 (OAuth) 단일/이중 표기 수정 + 13번 권한 시스템 신규
        추가.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {IMPLEMENTED.map((i) => (
          <ImplementedRow key={i.name} {...i} />
        ))}
      </div>
    </section>
  );
}

function ImplementedRow({
  name,
  where,
  quality,
  note,
}: {
  name: string;
  where: string;
  quality: "complete" | "partial";
  note: string;
}) {
  const badgeClass =
    quality === "partial"
      ? "bg-amber-500/20 text-amber-300"
      : "bg-emerald-500/20 text-emerald-300";
  const badgeLabel = quality === "partial" ? "부분" : "완성";
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        <span className="text-[12px] font-medium">{name}</span>
        <span
          className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-medium ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>
      <div className="text-[10px] text-[var(--color-text-muted)] font-mono mb-1 leading-snug break-all">
        {where}
      </div>
      <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
        {note}
      </div>
    </div>
  );
}

/* ───────────────── 2. 아직 부족 (Top 10) ───────────────── */

const MISSING: Array<{
  rank: number;
  title: string;
  reason: string;
  effort: string;
  example: string;
  icon: React.ReactNode;
}> = [
  {
    rank: 1,
    title: "In-app 피드백 채널",
    reason:
      "친구 학원 운영자 직접 피드백 받기 — 가장 큰 빈틈. Sidebar 하단 버튼 + 모달 + Supabase 테이블",
    effort: "낮음 (1-2일)",
    example:
      'Sidebar 하단 "피드백 보내기" 버튼 → 모달 (제목 + 본문 + screenshot 옵션) → POST /api/feedback → feedback 테이블 (academy_id + user_id + body + created_at). admin 페이지에서 확인',
    icon: <Send className="w-4 h-4" />,
  },
  {
    rank: 2,
    title: "랜딩 페이지 (/about) 콘텐츠 깊이",
    reason:
      "page.tsx 는 wrapper 12 lines, 실제 콘텐츠는 AboutPageLayout 132 lines. mockup이 'empty placeholder' 라 했지만 basic content 는 있음 — SEO + conversion 약함이 진짜 문제",
    effort: "중 (2-3일)",
    example:
      "히어로 + 핵심 가치 3개 (시간표 속도 / PDF / 학부모 share) + 데모 영상 + try-it-now (익명 모드 진입) + 가격 안내 (Phase 1 = 무료) + FAQ",
    icon: <Layout className="w-4 h-4" />,
  },
  {
    rank: 3,
    title: "Production 머지 (dev → main 19 PR)",
    reason:
      "친구 선공개 = production deploy 필수. 현재 dev 만 최신 (#444~#462 누적). main 미반영",
    effort: "낮음 (사용자 결정 + CI ~30분)",
    example:
      "Stage E 체크리스트 통과 후 dev → main PR 일괄. Lightsail 자동 deploy (deploy.yml).",
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    rank: 4,
    title: "익명 사용자 추적 + 활성도 measurement",
    reason:
      'Phase 1 KPI "WAU 100+ 학원" 측정 도구 부재. 친구한테 노출 후 며칠 활성인지도 모름',
    effort: "낮음 (1일, Plausible 또는 Vercel Analytics — anonymous, GDPR-safe)",
    example:
      "app/layout.tsx 에 <PlausibleProvider domain='class-planner.info365.studio' /> 추가. PII 없음. 페이지뷰 + 핵심 conversion event (학원 생성 / 첫 세션 추가 / PDF 다운로드)",
    icon: <Eye className="w-4 h-4" />,
  },
  {
    rank: 5,
    title: "학원 운영자 Onboarding 흐름 보강",
    reason:
      "첫 진입 후 어떤 액션부터 시작할지 안내 미흡. 현재 onboarding/page.tsx 있지만 wizard 형태 약함",
    effort: "중 (3-4일)",
    example:
      "4-step wizard — 학원 정보 → 강사 1명 → 학생 3명 → 시간표 1개. '5분 안에 완성' 약속. skip 가능",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    rank: 6,
    title: "출결 / 데이터 복구 UI 발견성",
    reason:
      "둘 다 backend + UI 있음 (Phase 1 완료). 단 출결은 Sidebar 메뉴 X, 데이터 복구는 settings 깊숙이",
    effort: "낮음 (1일)",
    example:
      "출결: Sidebar 별도 메뉴 또는 schedule 내 명시 버튼 ('출결 확인'). 데이터 복구: settings 페이지 상단 강조 + 첫 진입 시 toast '실수 방지를 위한 자동 백업 활성' 안내",
    icon: <Search className="w-4 h-4" />,
  },
  {
    rank: 7,
    title: "SEO 메타 + Open Graph + 구조화 데이터",
    reason:
      "현재 title/desc 만. '학원 시간표' 검색 시 노출 거의 불가. Phase 1 organic 유입 핵심",
    effort: "낮음 (1일)",
    example:
      "next-seo + sitemap.xml + robots.txt + JSON-LD (Organization, SoftwareApplication). og:image (학원 시간표 미리보기 + 로고)",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    rank: 8,
    title: "에러 모니터링 (Sentry / Vercel)",
    reason:
      "omni-radar 는 개발용 (localhost). production 운영 중 사용자 에러 추적 필요. 친구가 사고 발생 시 디버깅 자료 없음",
    effort: "낮음 (반나절)",
    example:
      "Sentry free tier (5K errors/월) — 학원 100곳 production 충분. @sentry/nextjs install + sentry.client.config.ts + GitHub secret SENTRY_DSN",
    icon: <Bell className="w-4 h-4" />,
  },
  {
    rank: 9,
    title: "도메인 단축 URL + QR 코드 + 시작 가이드 PDF",
    reason:
      "class-planner.info365.studio 운영 중. 친구에게 URL/QR 어떻게 전달할지 미정",
    effort: "낮음 (반나절)",
    example:
      "QR 코드 (qr-code-generator) + 시작 가이드 PDF 1장 (로그인 → 학원 생성 → 첫 시간표 → PDF 출력 → 학부모 share) — Notion/Figma 한 페이지",
    icon: <Package className="w-4 h-4" />,
  },
  {
    rank: 10,
    title: "데모 데이터 시드",
    reason:
      "첫 진입 시 빈 화면 → 어떻게 사용할지 모름. 친구도 빈 학원에서 시작하면 좋은 인상 약함",
    effort: "낮음 (1일)",
    example:
      "'데모 학원 둘러보기' 버튼 → 학생 10명 + 강사 3명 + 과목 5개 + 시간표 30개 미리 채워진 sample academy (read-only 또는 fork 가능)",
    icon: <Boxes className="w-4 h-4" />,
  },
];

function MissingFeatures() {
  return (
    <section>
      <SectionHeader icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}>
        ② 아직 부족 — 친구 선공개 전 채울 항목 (Top 10)
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        ranking = 친구 선공개 가치 기준 (acquisition + feedback 우선). rank
        1~4는 production deploy 전 필수, rank 5~10은 친구 피드백 받으며 점진
        보강 가능.
      </p>
      <div className="space-y-2.5">
        {MISSING.map((m) => (
          <MissingRow key={m.rank} {...m} />
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-emerald-300">최소 권장 (1-2주 작업):</strong>{" "}
        rank 1 (피드백 채널) + rank 4 (analytics) + rank 8 (Sentry) + rank 9
        (QR 가이드) — 4개만 채워도 친구 선공개 + 피드백 수집 + 사고 시
        디버깅 자료 확보. rank 2 (about) + rank 5 (onboarding) + rank 7 (SEO) +
        rank 10 (데모 시드) 은 친구 피드백 받으며 1-2주 내 보강. rank 3 (PR
        머지) + rank 6 (발견성) 은 Stage B-D 완료 후.
      </div>
    </section>
  );
}

function MissingRow({
  rank,
  title,
  reason,
  effort,
  example,
  icon,
}: {
  rank: number;
  title: string;
  reason: string;
  effort: string;
  example: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 grid grid-cols-[36px_1fr] gap-3">
      <div className="flex items-start justify-center pt-0.5">
        <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 text-[12px] font-semibold flex items-center justify-center">
          {rank}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-amber-300 flex-shrink-0">{icon}</span>
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-[9px] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
            {effort}
          </span>
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed mb-1">
          <strong className="text-amber-300">이유:</strong> {reason}
        </p>
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          <strong className="text-emerald-300">구현 안:</strong> {example}
        </p>
      </div>
    </div>
  );
}

/* ───────────────── 3. 미래 Phase 에서 이미 구현된 것 (3개) ───────────────── */

const ALREADY_IMPLEMENTED_FUTURE: Array<{
  title: string;
  mockupClassified: string;
  actualImpl: string;
  whatRemains: string;
  evidence: string;
  icon: React.ReactNode;
}> = [
  {
    title: "데이터 복구 UI (자동 백업 + 시점 복원)",
    mockupClassified:
      "monetization-strategy ⑤b SafetyNetSection currentImpl='UI 미구현' + Phase 2 actions '데이터 복구 UI 구현 — 자동 백업 (Free 7일·Premium 90일) + 시점 복원 모달'",
    actualImpl:
      "Phase 1 완료. DataHistorySection (328 lines) 가 settings 페이지 라인 1306-1307 에서 noexport. owner/admin gate. 스냅샷 list + 학생/과목/수업 count Stat + 복원 confirmation 모달 + 삭제 confirmation 모달 + restoreSnapshot 호출",
    whatRemains:
      "freemium gating 만 미구현 — Free 7일/1회·Premium 90일/무제한 한도. 정책 결정만 필요 (Phase 2 결정 사항)",
    evidence:
      "src/components/organisms/DataHistorySection.tsx + src/app/settings/page.tsx:1307 + /api/data-snapshots/[id]/restore (route + lib/snapshots/restoreSnapshot)",
    icon: <Database className="w-5 h-5" />,
  },
  {
    title: "권한 시스템 (owner / admin / member 3-tier)",
    mockupClassified:
      "monetization-strategy ⑦ PhaseTimeline Phase 2 actions 'Premium feature 2차: 강사 무제한 초대 + 강사별 권한 세분'",
    actualImpl:
      "Phase 1 완료. AcademyRole = 'owner' | 'admin' | 'member' 정의 (lib/auth/permissions.ts). MemberContext 가 role 추적 + canManage 정책 (owner | admin → 학원 멤버 관리 가능). PR #460-462 multi-academy + invite role 통합으로 owner/admin/member 흐름 완성",
    whatRemains:
      "더 세밀한 권한 (예: 강사가 자기 수업만 보고 다른 강사 시간표 못 봄, 학생 정보 read-only 강사) 은 Phase 2 작업. 현재는 member도 학원 전체 데이터 조회 가능 (편집은 canManage 기반 gate)",
    evidence:
      "src/lib/auth/permissions.ts (AcademyRole type + VALID_ROLES) + src/contexts/MemberContext.tsx (line 226 canManage 정책)",
    icon: <Lock className="w-5 h-5" />,
  },
  {
    title: "강사 무제한 초대 (현재 모두 무제한)",
    mockupClassified:
      "monetization-strategy ⑦ PhaseTimeline Phase 2 actions 'Premium feature 2차: 강사 무제한 초대' (Free 한도 → Premium 무제한 freemium 패턴 암시)",
    actualImpl:
      "Phase 1 완료. PR #462 multi-academy unlimited (Slack/Linear/Notion 패턴, ADR-023). 학원 자체도 무제한, 학원 내 강사 초대도 현재 무제한 (limit code path 없음)",
    whatRemains:
      "freemium 도입 시 Free tier 에 limit 적용 (예: 강사 3명 / 학생 30명 / 학원 1개). 현재는 모두 무료 + 무제한이라 friction 없음. Phase 2 ARR 시드 단계에서 정책 결정",
    evidence:
      "src/app/api/academies + /api/invites + ADR-019 supersede + ADR-023 (Slack/Linear/Notion 패턴)",
    icon: <Users className="w-5 h-5" />,
  },
];

function AlreadyImplementedFutureFeatures() {
  return (
    <section>
      <SectionHeader icon={<Sparkles className="w-5 h-5 text-violet-400" />}>
        ③ 미래 Phase 에서 이미 구현된 것 (3개) — mockup 재분류 필요
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        monetization-strategy mockup 이 Phase 2 작업으로 분류했지만 실제 소스
        코드 검증 결과 Phase 1 에 이미 구현됨. 남은 건 freemium gating 또는
        세밀화 — 정책 결정 (Phase 2) 만 필요.
      </p>
      <div className="space-y-4">
        {ALREADY_IMPLEMENTED_FUTURE.map((f) => (
          <FutureRow key={f.title} {...f} />
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-violet-300">의미:</strong>{" "}
        Phase 2 ARR 시드 단계의 절반 (UI 구현) 이 이미 끝남. Phase 2 진입 시
        결정해야 할 건{" "}
        <strong className="text-amber-300">freemium 한도 정책</strong> (Free 7일
        vs Premium 90일, 강사 무제한 vs 3명 limit 등) — 코드보다 비즈니스 결정
        영역. Phase 1 → Phase 2 전환 marginal cost 낮음.
      </div>
    </section>
  );
}

function FutureRow({
  title,
  mockupClassified,
  actualImpl,
  whatRemains,
  evidence,
  icon,
}: {
  title: string;
  mockupClassified: string;
  actualImpl: string;
  whatRemains: string;
  evidence: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="space-y-2.5 text-[11px] leading-relaxed">
        <Row label="mockup 분류" tone="muted">
          {mockupClassified}
        </Row>
        <Row label="실제 구현" tone="emerald">
          {actualImpl}
        </Row>
        <Row label="남은 작업" tone="amber">
          {whatRemains}
        </Row>
        <Row label="코드 위치" tone="muted">
          <code className="text-[10px] font-mono break-all">{evidence}</code>
        </Row>
      </div>
    </div>
  );
}

/* ───────────────── 4. Release Roadmap (Stage A-E) ───────────────── */

const ROADMAP: Array<{
  stage: string;
  title: string;
  duration: string;
  actions: string[];
  blockedBy?: string;
  status: "in-progress" | "pending";
}> = [
  {
    stage: "A",
    title: "Phase 1 readiness 페이지 신설",
    duration: "1-2시간",
    status: "in-progress",
    actions: [
      "본 페이지 (/design-explorations/phase1-release-readiness) 작성",
      "3-bucket SSOT (이미 구현 13 / 부족 10 / 미래에서 이미 구현 3)",
      "Stage A-E roadmap + UAT Phase 1 가이드 + production-grade 테스트 방법",
    ],
  },
  {
    stage: "B",
    title: "monetization-strategy fact 5곳 수정",
    duration: "30분",
    status: "pending",
    blockedBy: "Stage A",
    actions: [
      "OAuth 항목: 'Google/Kakao' → 'Google 단일, 카카오 준비 중'",
      "데이터 백업 항목: 'UI 미연결' → 'UI 연결됨 (설정 페이지)'",
      "신규 항목 13: 권한 시스템 (owner/admin/member)",
      "PR 카운트: 16 → 19 (또는 dynamic wording)",
      "SafetyNetSection currentImpl + PhaseTimeline Phase 2 actions wording 분리 (freemium gating 적용으로)",
      "기존 Phase1Readiness 섹션 → 신규 페이지 cross-link 으로 축소",
    ],
  },
  {
    stage: "D",
    title: "Production-grade 테스트 인프라",
    duration: "2-3시간",
    status: "pending",
    blockedBy: "Stage A",
    actions: [
      "package.json: test:release (next build + next start + Playwright e2e), start:test, test:smoke-prod 추가",
      "start-server-and-test 패키지 도입 (zombie process 방지)",
      "@prod-smoke Playwright tag 신설 — health + login + 학원 생성 + 시간표 추가 + PDF 출력 + share",
      "Service Worker production 활성 검증 (next-pwa or manual sw.ts, ADR-007)",
      "env validation (NEXT_PUBLIC_SUPABASE_URL 등 필수 키 누락 시 build fail)",
      "RLS 정책 production 검증 스크립트 (SUPABASE_SERVICE_ROLE_KEY 누출 없음)",
    ],
  },
  {
    stage: "C",
    title: "UAT Phase 1 Production Readiness Mode 신설",
    duration: "2-3시간 (Claude) + 240분 (사용자 실행)",
    status: "pending",
    blockedBy: "Stage A, D",
    actions: [
      "tests/manual/uat-checklist.md 에 'Phase 1 Production Readiness' 모드 추가",
      "P0 시나리오 — Phase 1 13 구현 전수 + 권한 흐름 + 데이터 복구 + multi-academy + production build",
      "owner/admin/member 3계정 + 학부모 incognito view (기존 UAT 모델 재활용)",
      "production build 결과를 UAT 환경에서 직접 검증 (npm run start 가 아닌 next start 모드)",
      "체크리스트 결과를 tests/manual/runs/<DATE>-<COMMIT>-phase1-prod.md 에 commit",
    ],
  },
  {
    stage: "E",
    title: "Release 체크리스트 + dev→main PR",
    duration: "1일",
    status: "pending",
    blockedBy: "Stage A, B, C, D",
    actions: [
      "Top 10 rank 1 (피드백 채널) + rank 4 (analytics) + rank 8 (Sentry) + rank 9 (QR 가이드) 구현 — 친구 선공개 최소",
      "dev → main PR 작성 (19 PR 일괄, dynamic wording 으로 PR 카운트 stale 회피)",
      "UAT Phase 1 Release Mode 통과 + 결과 commit",
      "npm run test:release 통과",
      "Sentry / Plausible secret GitHub + Lightsail env 등록",
      "dev → main 머지 → deploy.yml 자동 deploy",
      "post-deploy smoke (production URL 에서 critical path 5개)",
      "친구한테 QR + 시작 가이드 PDF 전달 + 30-day 피드백 channel 활성",
    ],
  },
];

function ReleaseRoadmap() {
  return (
    <section>
      <SectionHeader icon={<ListChecks className="w-5 h-5 text-indigo-400" />}>
        ④ Production Release Roadmap (Stage A-E)
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        Critical Path: A → B → D (병렬) → C → E. Stage A-D = Claude 6-9시간
        작업. Stage C 사용자 UAT 240분 + Stage E 1일. 총 1.5-2일 walking
        distance.
      </p>
      <ol className="space-y-3">
        {ROADMAP.map((r) => (
          <RoadmapRow key={r.stage} {...r} />
        ))}
      </ol>
    </section>
  );
}

function RoadmapRow({
  stage,
  title,
  duration,
  actions,
  blockedBy,
  status,
}: {
  stage: string;
  title: string;
  duration: string;
  actions: string[];
  blockedBy?: string;
  status: "in-progress" | "pending";
}) {
  const statusIcon =
    status === "in-progress" ? (
      <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
    ) : (
      <Circle className="w-4 h-4 text-[var(--color-text-muted)]" />
    );
  const statusLabel = status === "in-progress" ? "진행 중" : "대기";
  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-5">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="font-semibold text-base flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono flex items-center justify-center">
            {stage}
          </span>
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
            {statusLabel}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)]">
            {duration}
          </span>
        </div>
      </div>
      {blockedBy && (
        <div className="text-[10px] text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
          <Lock className="w-3 h-3" /> blocked by: {blockedBy}
        </div>
      )}
      <ul className="space-y-1.5">
        {actions.map((a, ai) => (
          <li
            key={ai}
            className="flex items-start gap-2 text-[12px] text-[var(--color-text-secondary)] leading-relaxed"
          >
            <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
            {a}
          </li>
        ))}
      </ul>
    </li>
  );
}

/* ───────────────── 5. UAT Phase 1 가이드 ───────────────── */

function UATPhase1Guide() {
  const scenarios = [
    {
      group: "owner 시점 — Phase 1 구현 13 영역 전수",
      items: [
        "로그인 (Google OAuth) + 익명 → 로그인 마이그 (학생 등 entity 누락 없음)",
        "학원 생성 + 멤버 초대 (admin/member 각 1명)",
        "학생/강사/과목 CRUD (활성 + 보관/복구)",
        "시간표 작성 (드래그앤드롭 + lane 자동 확장)",
        "출결 입력 (AttendanceSheet) + 누적",
        "PDF 출력 (인쇄 확인까지)",
        "학부모 share 생성 (token + 6자리 access-code + 만료)",
        "데이터 백업 → 의도적 학생 50명 삭제 → DataHistorySection 에서 복원 → 학생 복귀 확인",
        "다중 academy — 학원 2개 생성 → switch → data isolation 확인 (PR #462 검증)",
        "강사 보관 → /teachers 보관함 → 복구 → 수업 reassign 흐름",
        "PWA install (standalone) + offline 진입 → cached page 표시",
      ],
    },
    {
      group: "권한 흐름 — admin / member 시점",
      items: [
        "admin: 학원 멤버 관리 가능 (invite + 권한 변경) — canManage 정책",
        "admin: 데이터 복구 UI 노출 (settings DataHistorySection)",
        "member: 학원 멤버 관리 차단 — UI 자체 hidden 또는 disabled",
        "member: 데이터 복구 UI 차단 (DataHistorySection 컴포넌트 내부 gate)",
        "member: 시간표 view + 편집 가능 — 단 멤버 관리 + 학원 삭제 X",
      ],
    },
    {
      group: "학생 / 학부모 incognito view",
      items: [
        "share token URL 익명 진입 → 시간표 view (학생 본인 또는 학부모)",
        "6자리 access-code 입력 → 인증 후 access (틀린 코드 + 만료 모두 검증)",
      ],
    },
    {
      group: "Production build 동작",
      items: [
        "npm run test:release 통과 (next build → next start → Playwright @prod-smoke)",
        "Service Worker 활성 (production mode 에서만)",
        "robots.txt + sitemap.xml 노출",
        "Sentry 에러 capture (의도적 throw 로 검증)",
        "Plausible/Vercel Analytics pageview event 도착",
      ],
    },
  ];
  return (
    <section>
      <SectionHeader icon={<FlaskConical className="w-5 h-5 text-sky-400" />}>
        ⑤ UAT Phase 1 Production Readiness Mode (240분, 3계정)
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        기존 Smoke (10-15분) + Release (180분) 와 별도. 친구 선공개 전 1회 실행
        — Phase 1 코어 13 영역 + 권한 + 데이터 복구 + multi-academy + production
        build 동작 전수 검증. 결과는 tests/manual/runs/&lt;DATE&gt;-&lt;COMMIT&gt;-phase1-prod.md commit.
      </p>
      <div className="space-y-3">
        {scenarios.map((s) => (
          <div
            key={s.group}
            className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4"
          >
            <h3 className="font-semibold text-sm mb-2 text-sky-300">
              {s.group}
            </h3>
            <ul className="space-y-1.5">
              {s.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[11px] text-[var(--color-text-secondary)] leading-relaxed"
                >
                  <Circle className="w-2.5 h-2.5 text-sky-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-amber-300">왜 production build 검증이
        중요한가:</strong>{" "}
        npm run dev 는 development mode (HMR, no SW, no minification). production
        deploy 후 발생하는 사고 (SW 캐시 오작동, env 미적용, code splitting
        chunk 누락) 는 dev 에서 안 보임. test:release 가 production build 를
        로컬에서 실행 + Playwright 가 자동 회귀 — 친구한테 노출 전 마지막 가드.
      </div>
    </section>
  );
}

/* ───────────────── 6. Production-grade 테스트 가이드 ───────────────── */

function ProductionTestGuide() {
  return (
    <section>
      <SectionHeader icon={<Wrench className="w-5 h-5 text-rose-400" />}>
        ⑥ Production-grade 테스트 방법 (npm run test:release + Smoke)
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        development 와 production 차이를 검증하는 인프라. Stage D 에서 도입.
      </p>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-rose-400" /> package.json 신규 scripts
        </h3>
        <pre className="text-[11px] font-mono bg-[var(--color-bg-tertiary)] rounded-lg p-3 overflow-x-auto leading-relaxed">
{`{
  "scripts": {
    "test:release": "start-server-and-test start:test http://localhost:3000 test:e2e",
    "start:test": "NODE_ENV=production next build && NODE_ENV=production next start -p 3000",
    "test:e2e": "playwright test",
    "test:smoke-prod": "playwright test --grep '@prod-smoke' --project=chromium"
  },
  "devDependencies": {
    "start-server-and-test": "^2.0.0"
  }
}`}
        </pre>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
          start-server-and-test 가 next start (background) → wait-on → playwright
          → kill 을 deterministic 하게 처리. zombie process 회피.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CheckCard
          title="Service Worker 활성"
          detail="production mode 에서만 sw.ts 활성. NetworkOnly /api/* + 7s AuthGuard (ADR-007). offline → cached page 표시"
          tone="emerald"
        />
        <CheckCard
          title="env validation"
          detail="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SENTRY_DSN / NEXT_PUBLIC_PLAUSIBLE_DOMAIN 필수 키 누락 시 build fail. .env.production 명시"
          tone="sky"
        />
        <CheckCard
          title="Code splitting size"
          detail="next build output 의 route 별 first-load JS < 200KB 검증 (현재 base ~180KB). bundle-analyzer 로 회귀 가드"
          tone="indigo"
        />
        <CheckCard
          title="RLS 정책 검증"
          detail="SUPABASE_SERVICE_ROLE_KEY 가 client bundle 에 노출 안 됨 확인 (rg + grep). anon key 로 owner-only 데이터 접근 차단 e2e"
          tone="amber"
        />
        <CheckCard
          title="robots.txt + sitemap"
          detail="production 에만 enabled. dev/staging 은 Disallow: /. next-sitemap 또는 manual generation"
          tone="violet"
        />
        <CheckCard
          title="Image optimization"
          detail="next/image 사용 검증 + Lightsail Sharp 설치 확인 (또는 next.config.images.unoptimized 결정)"
          tone="rose"
        />
      </div>

      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-emerald-300">@prod-smoke Playwright tag — 5
        critical path:</strong>
        <ol className="mt-2 space-y-1 list-decimal list-inside text-[11px]">
          <li>Health check — / 로 GET 200</li>
          <li>Google OAuth 로그인 → AuthGuard 통과 → /schedule 진입</li>
          <li>학원 1개 생성 → Sidebar active_academy 반영</li>
          <li>시간표 세션 1개 추가 → 시간표 grid 에 렌더</li>
          <li>PDF 출력 → blob download 성공 + share token 생성 → /share/[token] 접근</li>
        </ol>
      </div>
    </section>
  );
}

function CheckCard({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: "emerald" | "sky" | "indigo" | "amber" | "violet" | "rose";
}) {
  const toneMap = {
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    sky: "border-sky-500/30 bg-sky-500/5",
    indigo: "border-indigo-500/30 bg-indigo-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    violet: "border-violet-500/30 bg-violet-500/5",
    rose: "border-rose-500/30 bg-rose-500/5",
  } as const;
  return (
    <div className={`rounded-lg border p-3 ${toneMap[tone]}`}>
      <div className="font-semibold text-[12px] mb-1">{title}</div>
      <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
        {detail}
      </div>
    </div>
  );
}

/* ───────────────── Footer ───────────────── */

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] pt-6 text-[11px] text-[var(--color-text-muted)] leading-relaxed space-y-2">
      <div className="flex items-center gap-2">
        <ExternalLink className="w-3 h-3" />
        <span>관련 문서:</span>
        <Link
          href="/design-explorations/monetization-strategy"
          className="underline hover:text-[var(--color-text-primary)]"
        >
          monetization-strategy
        </Link>
        ·{" "}
        <Link
          href="/design-explorations"
          className="underline hover:text-[var(--color-text-primary)]"
        >
          design-explorations index
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <FileText className="w-3 h-3" />
        <span>SSOT 영구화:</span>
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">
          docs/strategy/monetization.md
        </code>
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">
          docs/strategy/data-roadmap.md
        </code>
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">
          docs/adr/022 / 023
        </code>
      </div>
      <div className="flex items-center gap-2">
        <Target className="w-3 h-3" />
        <span>
          본 페이지는 Phase 1 production release 결정의 SSOT. Stage E 완료 시
          archive — Phase 2 시점에서 별도 phase2-readiness 페이지 신설 패턴.
        </span>
      </div>
    </footer>
  );
}

/* ───────────────── 공통 컴포넌트 ───────────────── */

function SectionHeader({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
      {icon}
      <span>{children}</span>
    </h2>
  );
}

function Row({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "muted" | "emerald" | "amber" | "violet";
  children: React.ReactNode;
}) {
  const labelClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "violet"
          ? "text-violet-300"
          : "text-[var(--color-text-muted)]";
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <div
        className={`text-[10px] uppercase tracking-wider font-medium ${labelClass}`}
      >
        {label}
      </div>
      <div className="text-[var(--color-text-secondary)]">{children}</div>
    </div>
  );
}
