"use client";

import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Award,
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  Brain,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Coins,
  Database,
  DollarSign,
  Download,
  Eye,
  Filter,
  Flame,
  GraduationCap,
  Heart,
  Info,
  Layers,
  LineChart,
  Lock,
  Megaphone,
  Network,
  PieChart,
  Receipt,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

/**
 * class-planner monetization 전략 mockup
 *
 * 사용자 의문 (2026-05-24):
 *   - 무료로 풀고 유저 확보 후 부분유료화 vs 2-3달 후 유료화?
 *   - AI 로 코드/생산 가치 0 수렴 시대에 차별화 + 유료 전환 유도?
 *   - 광고 vs 프리미엄?
 *   - 사용자 본인 안: 무료 → 사용자 피드백 → +기능 프리미엄. 합리적인지?
 *
 * 본 mockup 은 한국 학원 시장 데이터 + SaaS freemium 전략 + AI 시대 차별화
 * 인사이트를 종합해 class-planner specific 권장안을 제시. 사용자가 채택할 조합/
 * timeline 결정 시 별도 docs/strategy/ 문서로 영구화.
 */
export default function MonetizationStrategyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-14">
        <Header />
        <MarketContext />
        <CompetitorMatrix />
        <AiEraChallenge />
        <FreemiumPatterns />
        <ClassPlannerTiers />
        <SafetyNetSection />
        <DataRetentionArchitecture />
        <DataValueSection />
        <AdsVsPremium />
        <PhaseTimeline />
        <FinalRecommendation />
        <References />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">
            class-planner 수익화 전략 검토
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
            한국 사교육 시장 + SaaS freemium 사례 + AI 시대 차별화 기반 권장안
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
        <Info className="w-3.5 h-3.5 flex-shrink-0" /> 2026-05-24 작성 · 사용자
        결정 시 별도 <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">docs/strategy/monetization.md</code>
        영구화 예정
      </div>
    </header>
  );
}

/* ───────────────── 시장 현황 ───────────────── */

function MarketContext() {
  return (
    <section>
      <SectionHeader icon={<TrendingUp className="w-5 h-5 text-amber-400" />}>
        ① 한국 사교육 시장 — 30조원, 디지털 전환
      </SectionHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="2024 사교육비 총액" value="29.2조원" sub="2020 대비 +50%" />
        <Stat label="2025 예상" value="≈32조원" sub="매년 +2.5조원" />
        <Stat label="학생 1인당 사교육비" value="567만원" sub="2024 기준" />
        <Stat label="서울 사교육 참여율" value="86.1%" sub="초중고" />
      </div>
      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        <p className="mb-2">
          <strong className="text-[var(--color-text-primary)]">시장 양극화:</strong>{" "}
          학령인구 감소에도 사교육비 역대 최고. 학원 시장 디지털 전환·재편이
          가속화 (출처 검색 결과 §0).
        </p>
        <p>
          <strong className="text-[var(--color-text-primary)]">의미:</strong>{" "}
          시장 자체는 충분히 크지만 (B2C 부모 지불 + B2B 학원 지불), 학원이
          쓰는 관리 SaaS 의 ARPU 는 ARR per 학원 기준으로 매우 낮음 (월
          1~3만원이 보통). class-planner 의 1차 타겟은{" "}
          <strong className="text-amber-300">소규모 학원 + 개인 강사</strong>{" "}
          — Wedge 시장에서 시작.
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4">
      <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold mb-0.5">{value}</div>
      <div className="text-[10px] text-[var(--color-text-muted)]">{sub}</div>
    </div>
  );
}

/* ───────────────── 경쟁업체 매트릭스 ───────────────── */

function CompetitorMatrix() {
  const competitors = [
    {
      name: "클래스업 (classup.io)",
      tier: "무료 (광고/기능 제한)",
      focus: "출결·수납·키오스크 올인원",
      ai: "—",
      strength: "무료 + 강력 기능",
      weakness: "디자인·UX 평균. 학원 운영자 친화",
    },
    {
      name: "공선학관 (gshk.io)",
      tier: "무료",
      focus: "기본 학원 관리",
      ai: "—",
      strength: "완전 무료",
      weakness: "기능 한정. 확장성 제한",
    },
    {
      name: "랠리즈",
      tier: "무료",
      focus: "출결·수납·간편결제·성적표",
      ai: "—",
      strength: "결제 통합",
      weakness: "수익 모델 결제 수수료 의존",
    },
    {
      name: "학원조아 (hakwonjoa)",
      tier: "유료 (CRM)",
      focus: "원생·출결·수납·상담·실시간 채팅",
      ai: "—",
      strength: "통합 CRM",
      weakness: "가격 진입장벽",
    },
    {
      name: "통통통",
      tier: "유료",
      focus: "출결·수납·학부모 소통",
      ai: "—",
      strength: "학부모 채널",
      weakness: "전통적 솔루션 — UX 무거움",
    },
    {
      name: "에듀허브 / 클비즈 / 학원메이커",
      tier: "유료 (월 2만~13만원 +옵션)",
      focus: "종합 학원관리",
      ai: "—",
      strength: "오랜 시장 검증",
      weakness: "AI 미적용 · 디자인 구식",
    },
    {
      name: "제로엑스플로우",
      tier: "유료 (B2B 학원)",
      focus: "AI 수업 콘텐츠 + 학생관리 + 리포팅",
      ai: "✓ 콘텐츠 생성",
      strength: "AI 차별화 + 영어학원 niche",
      weakness: "콘텐츠 한정 (시간표 X)",
    },
  ];

  return (
    <section>
      <SectionHeader icon={<Building2 className="w-5 h-5 text-sky-400" />}>
        ② 한국 학원 관리 SaaS 경쟁 매트릭스
      </SectionHeader>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)] text-left text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-medium">서비스</th>
              <th className="px-3 py-2 font-medium">가격</th>
              <th className="px-3 py-2 font-medium">초점</th>
              <th className="px-3 py-2 font-medium">AI</th>
              <th className="px-3 py-2 font-medium">강점</th>
              <th className="px-3 py-2 font-medium">약점</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((c, i) => (
              <tr
                key={c.name}
                className={i % 2 ? "bg-[var(--color-bg-secondary)]/20" : ""}
              >
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 text-[var(--color-text-secondary)]">{c.tier}</td>
                <td className="px-3 py-2 text-[var(--color-text-secondary)]">{c.focus}</td>
                <td className="px-3 py-2 text-amber-300">{c.ai}</td>
                <td className="px-3 py-2 text-emerald-300">{c.strength}</td>
                <td className="px-3 py-2 text-rose-300">{c.weakness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-emerald-300">class-planner 의 빈틈 (positioning):</strong>{" "}
        대부분의 경쟁자가 출결·수납에 집중 — <strong>시간표 작성/공유</strong>{" "}
        가 메인인 솔루션은 거의 없음. PDF 인쇄·학부모 share·드래그앤드롭 시간표는
        wedge 가능. 무료 + 디자인 우위 + Local-first 속도 (0ms 조작) 가 차별화 핵심.
      </div>
    </section>
  );
}

/* ───────────────── AI 시대 도전 ───────────────── */

function AiEraChallenge() {
  return (
    <section>
      <SectionHeader icon={<Brain className="w-5 h-5 text-violet-400" />}>
        ③ AI 시대 SaaS 풍경 — 기능 moat 거의 사라짐
      </SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold">사라지는 moat</h3>
          </div>
          <ul className="space-y-2 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            <li className="flex items-start gap-2">
              <X className="w-3 h-3 text-rose-400 mt-1 flex-shrink-0" />
              <span>
                <strong>기능 차별화</strong> — AI 가 거의 모든 기본 기능 복제. 시간표 관리,
                출결 관리 등 commodity 화.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-3 h-3 text-rose-400 mt-1 flex-shrink-0" />
              <span>
                <strong>UI/UX 우위</strong> — 좋은 디자인도 AI 가 빠르게 모방. 잠깐의 우위.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-3 h-3 text-rose-400 mt-1 flex-shrink-0" />
              <span>
                <strong>코드 가치 ≒ 0</strong> — AI 가 빠르게 작성. 진입장벽 낮음.
              </span>
            </li>
          </ul>
          <div className="mt-3 text-[10px] text-[var(--color-text-muted)]">
            출처: 80% 매수자가 AI commoditization 을 SaaS 최대 위협으로 본다 (M&A 시장).
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold">남은 moat (AI 가 복제 못 함)</h3>
          </div>
          <ul className="space-y-2 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            <li className="flex items-start gap-2">
              <Database className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>도메인 데이터 flywheel</strong> — 학원별 시간표·학생·출결 데이터가
                사용으로 늘어남. 경쟁사 따라잡기 어려움.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Network className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>네트워크 효과</strong> — 학부모·강사가 한번 등록되면 학원이 옮기기
                어려움. switching cost.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>브랜드/신뢰</strong> — 학원 운영자가 "내 학원 데이터를 맡길 만한"
                신뢰 형성. 시간 누적이 필요.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>실행 속도</strong> — 사용자 피드백 → 24h 안 반영 사이클. 대기업이
                못 따라가는 vertical SaaS 의 진짜 우위.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ClipboardList className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>워크플로우 통합</strong> — 시간표 → 출결 → 수납 → 학부모 알림 →
                성적 한 곳에서. 단일 기능보다 lock-in 강함.
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-violet-300">핵심 인사이트:</strong>{" "}
        Vertical SaaS (특정 도메인 specialized) 는 horizontal SaaS 보다 AI 시대에 더
        안전. 학원 도메인의 규제·워크플로우·proprietary 데이터를 가진 class-planner 는
        AI-native upstart 가 80% 가격으로 들어와도 데이터 우위로 방어 가능.
      </div>
    </section>
  );
}

/* ───────────────── Freemium 패턴 비교 ───────────────── */

function FreemiumPatterns() {
  return (
    <section>
      <SectionHeader icon={<Layers className="w-5 h-5 text-cyan-400" />}>
        ④ Freemium gating 3가지 패턴 — 어떤 걸 잠글까
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        Small business 타겟 SaaS 의 freemium 변환율 6-10% (전체 평균 1-5%). 무엇을
        잠그느냐가 변환율을 결정.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PatternCard
          icon={<Lock className="w-5 h-5" />}
          tone="amber"
          title="Feature gating"
          subtitle="일부 기능 자체를 paid 잠금"
          example="Zapier (premium app), Loom (HD), Notion (advanced permissions)"
          fitToUs="중간"
          notes={[
            "PDF brand 제거, 학부모 share 고급 옵션, AI 자동화 등을 paid 로",
            "어떤 기능을 잠글지가 핵심 — 무료 사용자가 핵심 가치 못 누리면 이탈",
          ]}
        />
        <PatternCard
          icon={<BarChart3 className="w-5 h-5" />}
          tone="emerald"
          title="Usage gating"
          subtitle="볼륨/시간 limit"
          example="Slack (90일 메시지), Airtable (1000 records), Calendly (1 event)"
          fitToUs="가장 적합"
          recommended
          notes={[
            "학생 N명까지 무료, N+ 부터 유료 — 학원 성장 시 자연 upgrade trigger",
            "Traction = 가치 = 지불 의지. small biz 타겟에 가장 효과적 (6-10% 변환율)",
          ]}
        />
        <PatternCard
          icon={<Users className="w-5 h-5" />}
          tone="sky"
          title="Outcome / Collaboration gating"
          subtitle="협업 시작 순간 paid"
          example="Figma (team sharing), Notion (team), Linear (team)"
          fitToUs="조합 가능"
          notes={[
            "본인 1명 무료, 강사·관리자 초대는 paid",
            "Figma 패턴: \"upgrade = 보상이지 처벌 아님\". 협업 시작 = 가치 인식 순간",
          ]}
        />
      </div>
      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 p-4 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
        <strong className="text-[var(--color-text-primary)]">SaaS 2026 데이터:</strong>{" "}
        Role-based feature gating 도입 시 변환율 5.1% (거의 2배). 핵심은 "hard limits
        on desirable features (not arbitrary limits on core value)". 무료 사용자도
        핵심 가치는 누리되, 성장 시점에 자연 upgrade.
      </div>
    </section>
  );
}

function PatternCard({
  icon,
  tone,
  title,
  subtitle,
  example,
  fitToUs,
  notes,
  recommended,
}: {
  icon: React.ReactNode;
  tone: "amber" | "emerald" | "sky";
  title: string;
  subtitle: string;
  example: string;
  fitToUs: string;
  notes: string[];
  recommended?: boolean;
}) {
  const borderClass =
    recommended
      ? "border-emerald-500/50 bg-emerald-500/10"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/5"
        : tone === "emerald"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-sky-500/30 bg-sky-500/5";
  const iconClass =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-400"
      : tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-400"
        : "bg-sky-500/15 text-sky-400";
  return (
    <div className={`rounded-xl border p-5 ${borderClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-sm">{title}</div>
            {recommended && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-[9px] text-emerald-200 font-medium">
                class-planner 추천
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>
        </div>
      </div>
      <div className="text-[11px] text-[var(--color-text-muted)] mb-2">
        예: <span className="text-[var(--color-text-secondary)]">{example}</span>
      </div>
      <div className="text-[11px] text-[var(--color-text-muted)] mb-2">
        적합도: <span className="text-[var(--color-text-secondary)]">{fitToUs}</span>
      </div>
      <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
        {notes.map((n, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────── class-planner Free vs Premium ───────────────── */

function ClassPlannerTiers() {
  return (
    <section>
      <SectionHeader icon={<Coins className="w-5 h-5 text-emerald-400" />}>
        ⑤ class-planner Free vs Premium — 3가지 안
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        각 안의 trade-off + 예상 변환율. 권장 = 안 B (Usage + 협업 조합).
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TierVariant
          number="안 A"
          title="Pure Usage gating"
          subtitle="학생 N명까지 무료 — 단순"
          freeTier={[
            "학생 30명까지 무료 (모든 기능)",
            "강사 무제한, PDF 무제한",
            "강사 휴지통 (보관) 30일 유지",
            "자동 백업 7일 (기본 안전망)",
          ]}
          premiumTier={[
            "학생 30+ 명 — 월 9,900원/학원",
            "강사 휴지통·자동 백업 무제한 유지",
            "전체 기능 동일, 학생 수·안전망만 늘어남",
          ]}
          pros={["가장 단순", "사용자 인지 비용 낮음"]}
          cons={["변환 trigger 가 학생 수 하나 — 작은 학원은 평생 무료"]}
        />
        <TierVariant
          number="안 B"
          recommended
          title="Usage + 협업 + 안전망 gating"
          subtitle="개인·기초 무료, 협업·고급 안전망 paid"
          freeTier={[
            "학생 30명까지 무료",
            "본인 (원장) 1명까지 무료",
            "PDF 인쇄 + 학부모 share + 기본 시간표 풀 기능",
            "강사 휴지통 30일 (이후 영구 삭제 안내)",
            "자동 백업 최근 1개 + 7일 유지",
          ]}
          premiumTier={[
            "월 14,900원/학원 (annual 12,900원)",
            "학생 무제한",
            "강사·관리자 초대 무제한 (협업)",
            "AI 시간표 최적화·학생 picker 등 +기능",
            "학원별 분석 대시보드 + PDF 워터마크 제거",
            "강사 휴지통 무제한 + 보관 audit log",
            "데이터 복구 — 자동 백업 90일 + 수동 스냅샷 + 시점 복원",
          ]}
          pros={[
            "Usage + 협업 + 안전망 3 trigger — 변환율 6-10% 예상",
            "Figma 패턴: 협업 시작 시 자연 upgrade",
            "안전망 = 사고 발생 시 즉시 upgrade trigger (Dropbox/Notion 패턴)",
            "AI feature 가 추가 가치 — AI 차별화",
          ]}
          cons={["가격 결정 + AI/백업 인프라 개발 필요"]}
        />
        <TierVariant
          number="안 C"
          title="Outcome gating (수업료 % 연동)"
          subtitle="결제 통합 + 수수료 모델"
          freeTier={[
            "모든 기능 + 학생 수 무제한 무료",
            "강사 휴지통 + 데이터 복구 풀 기능",
          ]}
          premiumTier={[
            "학원비 결제 통합 시 수수료 1.5% (랠리즈 패턴)",
            "또는 수업료 자동 청구 / 미납 추적 등 outcome feature 별 paid",
          ]}
          pros={["무료 진입장벽 0 — 빠른 확보", "학원이 매출 발생 후 수수료"]}
          cons={[
            "결제 통합 인프라 + PG 계약 필요 (시간/리스크 큼)",
            "수수료 모델은 학원 운영자에게 민감 — 신뢰 형성 후 도입",
            "안전망까지 무료 — 가치 대비 인프라 비용 부담",
          ]}
        />
      </div>
    </section>
  );
}

function TierVariant({
  number,
  title,
  subtitle,
  freeTier,
  premiumTier,
  pros,
  cons,
  recommended,
}: {
  number: string;
  title: string;
  subtitle: string;
  freeTier: string[];
  premiumTier: string[];
  pros: string[];
  cons: string[];
  recommended?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        recommended
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">{number}</span>
        {recommended && (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-[9px] text-emerald-200 font-medium">
            추천
          </span>
        )}
      </div>
      <h3 className="font-semibold text-base mb-0.5">{title}</h3>
      <p className="text-[11px] text-[var(--color-text-muted)] mb-3">{subtitle}</p>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]/40 p-3 mb-2">
        <div className="flex items-center gap-1.5 mb-2">
          <BadgePercent className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-medium">
            Free
          </span>
        </div>
        <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)]">
          {freeTier.map((f, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] uppercase tracking-wider text-amber-300 font-medium">
            Premium
          </span>
        </div>
        <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)]">
          {premiumTier.map((p, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <Star className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <ProsCons pros={pros} cons={cons} />
    </div>
  );
}

function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1 font-medium">
          장점
        </div>
        <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          {pros.map((p) => (
            <li key={p} className="flex items-start gap-1.5">
              <Check className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-amber-400 mb-1 font-medium">
          단점 / 우려
        </div>
        <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          {cons.map((c) => (
            <li key={c} className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────────── 안전망 (강사 보관 + 데이터 복구) ───────────────── */

function SafetyNetSection() {
  const features = [
    {
      icon: <Archive className="w-5 h-5" />,
      tone: "amber" as const,
      title: "강사 휴지통 (현재 \"보관\")",
      currentImpl: "teachers.archived_at 컬럼. /teachers 페이지 보관함 (사용자 결정 후 단어 통일)",
      freeLimit: "보관 후 30일 자동 영구 삭제 (학원 한 곳당 보관 슬롯 5개)",
      premiumPlus: "무제한 보관 + 보관 audit log (누가 언제 보관/복구) + 일괄 복구",
      trigger: "강사 2-3명 보관 시도 시 \"보관함 가득\" 알림 → upgrade",
      analogy: "Gmail 휴지통 30일 (free) / Google Workspace 무제한 + 복구 로그",
    },
    {
      icon: <Database className="w-5 h-5" />,
      tone: "sky" as const,
      title: "데이터 복구 (자동 백업 + 시점 복원)",
      currentImpl: "data_snapshots 테이블 있음. UI 미구현. 학원 전체 시점 백업",
      freeLimit: "자동 백업 최근 1개 + 7일 보관. 시점 복원 1회/월",
      premiumPlus: "자동 백업 90일 무제한 + 수동 스냅샷 무제한 + 시점 복원 무제한 + 다운로드 (JSON)",
      trigger: "\"학생 50명 잘못 삭제\" 같은 사고 발생 시 즉시 upgrade",
      analogy: "Dropbox 30일 history (free) / Plus 180일 + 복원 + 다운로드",
    },
  ];

  return (
    <section>
      <SectionHeader icon={<Shield className="w-5 h-5 text-amber-400" />}>
        ⑤b 안전망 기능의 freemium 전략 (강사 보관 + 데이터 복구)
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        강사 보관 + 데이터 복구는 사용자 사고 발생 시 강력한 upgrade trigger. Dropbox /
        Notion / Gmail 모두 \"안전망 = 시간/볼륨 limit\" freemium 패턴.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f) => (
          <SafetyFeatureCard key={f.title} {...f} />
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-violet-300">왜 안전망이 강한 upgrade trigger 인가:</strong>{" "}
        실수·사고 발생 후의 사용자 = "지금 당장" 지불 의지 가장 높은 순간. Dropbox 가
        "30일 history" 를 freemium 의 핵심으로 둔 이유 — 31일째 자료 잃은 사용자가
        Plus 결제. class-planner 도 동일 패턴 적용 가능. 단, 무료 안전망이 너무 약하면
        \"이거 못 믿는데\" 라며 이탈 — 7일/1개 등 최소한은 무료에 두기.
      </div>
      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-emerald-300">데이터 복구 UI 구현 timeline 권장:</strong>{" "}
        현재 <code className="px-1 rounded bg-[var(--color-bg-tertiary)]">data_snapshots</code> 테이블
        backend 만 있음. Phase 2 (3~6개월) 중 자동 백업 UI + 시점 복원 모달 구현 →
        Phase 3 (6~12개월) 에 수동 스냅샷 + 다운로드 + audit log 추가 (Premium feature).
      </div>
    </section>
  );
}

function SafetyFeatureCard({
  icon,
  tone,
  title,
  currentImpl,
  freeLimit,
  premiumPlus,
  trigger,
  analogy,
}: {
  icon: React.ReactNode;
  tone: "amber" | "sky";
  title: string;
  currentImpl: string;
  freeLimit: string;
  premiumPlus: string;
  trigger: string;
  analogy: string;
}) {
  const borderClass =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-sky-500/30 bg-sky-500/5";
  const iconClass =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-400"
      : "bg-sky-500/15 text-sky-400";
  return (
    <div className={`rounded-xl border p-5 ${borderClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="space-y-2 text-[11px] leading-relaxed">
        <Row label="현재 구현" tone="muted">
          {currentImpl}
        </Row>
        <Row label="Free 한도" tone="emerald">
          {freeLimit}
        </Row>
        <Row label="Premium +" tone="amber">
          {premiumPlus}
        </Row>
        <Row label="Upgrade trigger" tone="violet">
          {trigger}
        </Row>
        <Row label="경쟁 패턴" tone="muted">
          {analogy}
        </Row>
      </div>
    </div>
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
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <div className={`text-[10px] uppercase tracking-wider font-medium ${labelClass}`}>
        {label}
      </div>
      <div className="text-[var(--color-text-secondary)]">{children}</div>
    </div>
  );
}

/* ───────────────── 데이터 보관 아키텍처 (4-layer) ───────────────── */

function DataRetentionArchitecture() {
  const layers = [
    {
      icon: <Zap className="w-5 h-5" />,
      tone: "emerald" as const,
      tag: "Layer 1",
      title: "Live data",
      duration: "현재 활성 — 무기한",
      access: "사용자 항상 접근",
      content: "학원 운영 중인 모든 row (학생/강사/세션 등). 사용자가 항상 보고 편집",
      legal: "사용자의 명시 동의 기반 운영 (서비스 제공 목적)",
    },
    {
      icon: <Archive className="w-5 h-5" />,
      tone: "amber" as const,
      tag: "Layer 2",
      title: "User-visible backup",
      duration: "Free 7일 / Premium 90일",
      access: "사용자 UI 에서 복구",
      content: "soft-delete + 자동 백업 스냅샷. 사용자가 실수 회복 (Dropbox 패턴)",
      legal: "freemium gating 의 noticed limit — UI 에서 한도 명시",
    },
    {
      icon: <Database className="w-5 h-5" />,
      tone: "sky" as const,
      tag: "Layer 3",
      title: "Internal retention (PII 포함)",
      duration: "2~3년 (PIPA 보유 기간)",
      access: "사용자 안 보임 — 운영자(class-planner)만 audit log 접근",
      content: "audit log, CS 분쟁 대응, 법적 분쟁 증거. 사용자가 본인 데이터 삭제 요청 시 즉시 삭제",
      legal: "한국 PIPA: 보유 기간 + 목적 사용자 동의 + DPA 위탁 처리자 계약 + Right to Erasure 응대",
    },
    {
      icon: <PieChart className="w-5 h-5" />,
      tone: "violet" as const,
      tag: "Layer 4",
      title: "Anonymized aggregate",
      duration: "무기한 (PII 제거)",
      access: "사용자 안 보임 — class-planner 내부 분석 + 비교용 통계",
      content: "요일별 수업 분포 / 시간대 인기도 / 강사 워크로드 평균 / 학원 규모별 trend. PII 제거 후 통계 only",
      legal: "익명화된 데이터 — PII 보호법 적용 외. 무기한 보관 + 분석 자유",
    },
  ];

  return (
    <section>
      <SectionHeader icon={<Layers className="w-5 h-5 text-violet-400" />}>
        ⑤c 데이터 보관 아키텍처 (4-Layer) — 사용자 노출 ≠ Server 측 정책
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        {'Vertical SaaS moat = 데이터. 그러나 PII 보호법 (한국 PIPA / GDPR) 으로 "무기한 보관 = 자유" 아님. 4-Layer 분리로 (a) 사용자 안전망 + (b) 운영 audit + (c) 익명 분석 무기한 동시 가능.'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {layers.map((l) => (
          <RetentionLayerCard key={l.tag} {...l} />
        ))}
      </div>

      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 mb-3">
        <h4 className="font-medium text-sm text-violet-300 mb-2 flex items-center gap-1.5">
          <Brain className="w-4 h-4" /> Vertical SaaS moat — Layer 4 의 가치
        </h4>
        <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
            {'학원 운영 패턴 (anonymized) 를 누적 → 신규 학원이 가입 시 "비슷한 규모의 평균은…" 추천 가능 (Premium 가치).'}
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
            {'AI 시간표 자동 최적화 — 다른 학원의 충돌 해결 패턴을 학습. 사용자가 늘수록 추천 품질 ↑ = flywheel.'}
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
            {'경쟁사 (AI-native upstart) 가 80% 가격으로 들어와도 — 그들에겐 누적 데이터 X. moat 의 핵심.'}
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
            {'시도별 / 학원 규모별 사교육 동향 데이터 — 추후 별도 product line (e.g. 시장 리포트 B2B) 도 가능.'}
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5 mb-3">
        <h4 className="font-medium text-sm text-rose-300 mb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4" /> 법적 가드 (Non-negotiable)
        </h4>
        <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong className="text-rose-200">한국 PIPA (개인정보보호법):</strong>{' '}
              학생 이름·전화·학부모 정보 = PII. 수집·이용 목적 + 보유 기간 + 동의 명시 의무. 가입 약관에 4-Layer 정책 모두 명시.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong className="text-rose-200">위탁 처리자 계약 (DPA):</strong>{' '}
              학원이 학생/학부모 데이터의 "처리자", class-planner 가 "위탁 처리자". 가입 시 DPA 체결 — 추후 분쟁 보호.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong className="text-rose-200">Right to Erasure (삭제권):</strong>{' '}
              사용자가 본인 학원 삭제 요청 시 Layer 1~3 즉시 삭제 (Layer 4 는 익명화 되어 영향 없음).
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong className="text-rose-200">익명화 기준:</strong>{' '}
              개별 학원/학생 식별 불가능한 통계만 Layer 4 로 이관. 학원 N개 미만 그룹은 통계 안 만듦 (k-anonymity).
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <h4 className="font-medium text-sm text-emerald-300 mb-2 flex items-center gap-1.5">
          <Boxes className="w-4 h-4" /> Supabase 구현 가이드 (간단)
        </h4>
        <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Layer 1+2:</strong> 기존 테이블 + soft-delete 컬럼 (<code>deleted_at TIMESTAMPTZ</code>) + <code>data_snapshots</code> 테이블 활용 (이미 있음).
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Layer 3:</strong> 별도 <code>audit_log</code> 테이블 (이미 있음) + cold storage (Supabase Storage 또는 S3 Glacier). 비용 절감 위해 압축 JSON.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Layer 4:</strong> 별도 schema <code>analytics</code> + nightly ETL job (PII 제거 + aggregate). cron + Edge Functions.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Retention enforcement:</strong> Supabase cron job — Layer 2 (Free 7일/Premium 90일) 자동 purge, Layer 3 (3년) 자동 purge. Layer 4 만 무기한.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>비용 추정:</strong> 학원 1000곳 × 평균 학생 100명 × 10년 = 1M rows × ~1KB = ~1GB. Supabase Pro $25/월 (8GB) 충분. cold storage 별도 $5/월 추가.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

function RetentionLayerCard({
  icon,
  tone,
  tag,
  title,
  duration,
  access,
  content,
  legal,
}: {
  icon: React.ReactNode;
  tone: "emerald" | "amber" | "sky" | "violet";
  tag: string;
  title: string;
  duration: string;
  access: string;
  content: string;
  legal: string;
}) {
  const borderClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/5"
        : tone === "sky"
          ? "border-sky-500/30 bg-sky-500/5"
          : "border-violet-500/30 bg-violet-500/5";
  const iconClass =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-400"
      : tone === "amber"
        ? "bg-amber-500/15 text-amber-400"
        : tone === "sky"
          ? "bg-sky-500/15 text-sky-400"
          : "bg-violet-500/15 text-violet-400";
  return (
    <div className={`rounded-xl border p-4 ${borderClass}`}>
      <div className="flex items-center gap-3 mb-2.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
              {tag}
            </span>
            <div className="font-semibold text-sm">{title}</div>
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">{duration}</div>
        </div>
      </div>
      <div className="space-y-1.5 text-[10.5px] leading-relaxed">
        <div className="grid grid-cols-[60px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">접근</span>
          <span className="text-[var(--color-text-secondary)]">{access}</span>
        </div>
        <div className="grid grid-cols-[60px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">내용</span>
          <span className="text-[var(--color-text-secondary)]">{content}</span>
        </div>
        <div className="grid grid-cols-[60px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">법적 가드</span>
          <span className="text-[var(--color-text-secondary)]">{legal}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── 데이터 가치 + 활용 + 수익화 + 기능 ───────────────── */

function DataValueSection() {
  return (
    <section>
      <SectionHeader icon={<LineChart className="w-5 h-5 text-violet-400" />}>
        ⑤d 데이터 가치 — 활용 영역 + 수익화 + 추가 기능 우선순위
      </SectionHeader>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">
        {'현재 수집 데이터 (시간표 + 학생 + 강사) 만으로는 moat 30% 수준. 출결·수업료·학부모 engagement 가 가세해야 80% — 어떤 기능을 더 개발해야 데이터가 살아나는가.'}
      </p>

      <DataInventory />
      <DataValueQuadrants />
      <FutureFeatures />
      <RevenueModels />
      <ProductLines />
    </section>
  );
}

/* —— 현재/추가 데이터 인벤토리 —— */

function DataInventory() {
  const rows = [
    { kind: '시간표 (요일·시간·세션)', current: true, value: '중', use: '시간대별 인기도, 강사 워크로드, AI 자동 최적화' },
    { kind: '학생 기본정보 (이름·학년·학교)', current: true, value: '중', use: '학원 규모, 학년 분포, 학교별 수요' },
    { kind: '강사 기본정보 + 담당 과목', current: true, value: '중', use: '과목 인기도, 강사 1인당 학생 수' },
    { kind: '출결 (출석·결석·지각)', current: false, value: '높음', use: 'retention 예측, 학생 이탈 신호, 학원 KPI' },
    { kind: '수업료 / 결제', current: false, value: '높음', use: '학원 매출, 단가 동향, 미납 패턴, 수익 예측' },
    { kind: '학부모 engagement (share 페이지 view)', current: '부분', value: '높음', use: '학원 신뢰도 지표, 학부모 활동성, 마케팅 ROI' },
    { kind: '성적 / 평가 기록', current: false, value: '중', use: '학업 성과 추세, 강사별 성과, 학원 quality 지표' },
    { kind: '학생 입학 출처 (광고/추천)', current: false, value: '높음', use: '학원 마케팅 ROI, 채널별 효과, 신규 학생 유치 비용' },
    { kind: '상담 / 메모 기록', current: false, value: '낮음', use: '학원-학부모 관계 강도, 이탈 사전 신호' },
    { kind: '수업 노트 (강사 → 학생)', current: false, value: '중', use: 'AI 학생별 progress 요약, 학부모 리포트 자동 생성' },
    { kind: '지역 / 학원 위치', current: '부분', value: '높음', use: '지역별 시장 분석, 학원 밀도, B2B 리포트' },
    { kind: '시간표 변경 history', current: '자동 수집', value: '낮음', use: '운영 안정성 지표 (잦은 변경 = 불안정)' },
  ];
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-sky-400" /> 데이터 인벤토리 — 현재 + 추가 수집 후보
      </h3>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--color-bg-secondary)] text-left text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">데이터 종류</th>
              <th className="px-3 py-2 font-medium">현재</th>
              <th className="px-3 py-2 font-medium">가치</th>
              <th className="px-3 py-2 font-medium">활용</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.kind} className={i % 2 ? 'bg-[var(--color-bg-secondary)]/20' : ''}>
                <td className="px-3 py-2 font-medium">{r.kind}</td>
                <td className="px-3 py-2">
                  {r.current === true ? (
                    <span className="text-emerald-300">✓</span>
                  ) : r.current === false ? (
                    <span className="text-rose-400">✗ 미수집</span>
                  ) : (
                    <span className="text-amber-300">{r.current}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <ValueBadge level={r.value} />
                </td>
                <td className="px-3 py-2 text-[var(--color-text-secondary)]">{r.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
        {'요약: 12 종류 중 현재 완전 수집 = 3, 부분/자동 = 3, 미수집 = 6. 미수집 6개 중 4개가 "높음" 가치 — 우선 개발 대상.'}
      </div>
    </div>
  );
}

function ValueBadge({ level }: { level: string }) {
  const cls =
    level === '높음'
      ? 'bg-emerald-500/20 text-emerald-300'
      : level === '중'
        ? 'bg-amber-500/20 text-amber-300'
        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]';
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {level}
    </span>
  );
}

/* —— 데이터 가치 4사분면 —— */

function DataValueQuadrants() {
  const quadrants = [
    {
      icon: <BarChart3 className="w-5 h-5" />,
      tone: 'sky' as const,
      label: 'A. 내부 분석 (Premium feature)',
      audience: '학원 운영자 본인',
      examples: [
        '학원 KPI 대시보드 — 학생 수 추이, 출결률, retention',
        '강사별 워크로드 + 학생 수 균형',
        '시간대별 수업 효율 (빈 시간 vs 만석)',
        '학부모 engagement 점수 — share 페이지 view 빈도',
      ],
      monetize: 'Premium 14,900원/월 의 핵심 가치',
      example_company: 'Toss 사장님 분석 / Square Analytics',
    },
    {
      icon: <Receipt className="w-5 h-5" />,
      tone: 'emerald' as const,
      label: 'B. B2B 시장 리포트 (별도 product)',
      audience: '교육 산업 stakeholder',
      examples: [
        '출판사·교재사 — 시기별 과목 인기도, 학년별 수요',
        '교육청·정부 — 시도별 사교육 동향 데이터',
        '학원 프랜차이즈 — 지역 진출 의사결정 자료',
        '부동산 — 학원 밀집도 데이터 (간접)',
      ],
      monetize: '연 1천만~1억원 계약 단위. 학원 데이터 1000곳+ 누적 후 시작 가능',
      example_company: 'Nielsen / SimilarWeb / Statista',
    },
    {
      icon: <Brain className="w-5 h-5" />,
      tone: 'violet' as const,
      label: 'C. AI flywheel (자기 강화)',
      audience: 'class-planner 본인 + Premium 사용자',
      examples: [
        '신규 학원 가입 시 자동 시간표 추천 — 비슷한 규모 학원 패턴',
        'AI 학생 picker — 강사·과목·시간 조합 자동 제안',
        '수업료 가이드 — 지역·규모·과목별 평균',
        'AI 학부모 메시지 — 출결 알림 / 상담 요청 자동 생성',
        '운영 anomaly 감지 — "이번 달 retention 5% 하락, 원인 분석"',
      ],
      monetize: 'Premium feature + 사용자 lock-in (사용할수록 추천 품질 ↑)',
      example_company: 'GitHub Copilot / Notion AI / Linear AI',
    },
    {
      icon: <Network className="w-5 h-5" />,
      tone: 'amber' as const,
      label: 'D. 마켓플레이스 수수료 (Phase 4+)',
      audience: '학원 + 외부 partner',
      examples: [
        '강사 채용 매칭 — 비슷한 학원에서 잘한 강사 추천',
        '교재 / 학원 보험 partnership',
        '학원 마케팅 도구 — 신규 학생 유치 캠페인',
        '학생 학원 추천 (B2C) — 학부모가 학원 찾을 때',
      ],
      monetize: '매칭/판매 성공 시 수수료 5~10%',
      example_company: 'Wyzant / Preply (강사 매칭) / 알바몬 (채용 수수료)',
    },
  ];
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-violet-400" /> 데이터 가치 — 4사분면 활용
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {quadrants.map((q) => (
          <QuadrantCard key={q.label} {...q} />
        ))}
      </div>
    </div>
  );
}

function QuadrantCard({
  icon,
  tone,
  label,
  audience,
  examples,
  monetize,
  example_company,
}: {
  icon: React.ReactNode;
  tone: 'sky' | 'emerald' | 'violet' | 'amber';
  label: string;
  audience: string;
  examples: string[];
  monetize: string;
  example_company: string;
}) {
  const borderClass =
    tone === 'sky'
      ? 'border-sky-500/30 bg-sky-500/5'
      : tone === 'emerald'
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : tone === 'violet'
          ? 'border-violet-500/30 bg-violet-500/5'
          : 'border-amber-500/30 bg-amber-500/5';
  const iconClass =
    tone === 'sky'
      ? 'bg-sky-500/15 text-sky-400'
      : tone === 'emerald'
        ? 'bg-emerald-500/15 text-emerald-400'
        : tone === 'violet'
          ? 'bg-violet-500/15 text-violet-400'
          : 'bg-amber-500/15 text-amber-400';
  return (
    <div className={`rounded-xl border p-4 ${borderClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
          {icon}
        </div>
        <div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{audience}</div>
        </div>
      </div>
      <ul className="space-y-1 mb-3 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
        {examples.map((e) => (
          <li key={e} className="flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
            {e}
          </li>
        ))}
      </ul>
      <div className="rounded-md bg-[var(--color-bg-tertiary)]/40 px-2.5 py-2 text-[10.5px] text-[var(--color-text-secondary)] mb-1.5 leading-relaxed">
        <strong className="text-[var(--color-text-primary)]">수익:</strong> {monetize}
      </div>
      <div className="text-[9.5px] text-[var(--color-text-muted)]">
        예시: {example_company}
      </div>
    </div>
  );
}

/* —— 추가 기능 우선순위 —— */

function FutureFeatures() {
  const features = [
    {
      rank: 1,
      title: '출결 관리',
      desc: '학생 출석·결석·지각 기록. 강사 앱 또는 학생 키오스크 입력.',
      dataValue: 'retention 예측 + 학원 KPI 의 핵심. AI flywheel 시작.',
      effort: '중',
      tier: 'Free (기본) + Premium (출결 자동화·알림)',
    },
    {
      rank: 2,
      title: '수업료 / 결제',
      desc: '학원비 청구·납부·미납 추적. PG 통합 (토스/카카오 페이 등).',
      dataValue: '학원 매출 + 단가 동향 + 미납 패턴. B2B 리포트 핵심 데이터.',
      effort: '높음 (PG 계약·정산)',
      tier: 'Free (기록만) + Premium (자동 청구·결제) + 수수료 1.5%',
    },
    {
      rank: 3,
      title: '학부모 소통 (인앱 메시지)',
      desc: '출결 알림 / 공지 / 상담 요청. SMS 대체.',
      dataValue: '학부모 engagement 점수 — 학원 신뢰도. share 페이지 + 통합.',
      effort: '중',
      tier: 'Free (수동 메시지) + Premium (AI 자동 생성·일괄)',
    },
    {
      rank: 4,
      title: '학생 입학 출처 추적',
      desc: '신규 학생 등록 시 "어떻게 알게 됐나" 입력 (광고/지인/검색).',
      dataValue: '학원 마케팅 ROI. 채널별 효과 측정. B2B 마케팅 리포트.',
      effort: '낮음',
      tier: 'Free (입력) + Premium (분석 대시보드)',
    },
    {
      rank: 5,
      title: '성적 / 평가 기록',
      desc: '학생별 시험 점수 / 강사 평가. 단순 5점 척도 시작.',
      dataValue: '학업 성과 추세 + 강사별 quality + retention 예측 변수.',
      effort: '중',
      tier: 'Free (기본 기록) + Premium (분석·학부모 리포트 자동 생성)',
    },
    {
      rank: 6,
      title: '수업 노트 (강사 → 학생)',
      desc: '강사가 수업 후 학생별 메모. AI 가 학부모 리포트 요약.',
      dataValue: 'AI 학습 데이터 + 학원 quality 지표.',
      effort: '중',
      tier: 'Premium (AI 요약·자동 리포트)',
    },
    {
      rank: 7,
      title: '상담 기록',
      desc: '학부모 상담 일자 / 내용 / 결과. 이탈 사전 신호.',
      dataValue: '학원-학부모 관계 강도 + 이탈 사전 신호 데이터.',
      effort: '낮음',
      tier: 'Premium (CRM 통합)',
    },
    {
      rank: 8,
      title: '지역 / 학교 정보',
      desc: '학원 위치 (좌표) + 학생 학교. 지도 + 통계.',
      dataValue: 'B2B 리포트의 핵심 — 지역별 시장 분석 / 학원 밀도.',
      effort: '낮음',
      tier: 'Free (입력) — class-planner 본인 B2B 데이터',
    },
    {
      rank: 9,
      title: '학원 마케팅 도구',
      desc: '학부모 추천 reward / 신규 학생 캠페인 / 학원 홍보 페이지.',
      dataValue: '마케팅 채널 효과 측정 + B2B partnership 데이터.',
      effort: '높음',
      tier: 'Premium (캠페인 도구) + 마켓플레이스 수수료',
    },
    {
      rank: 10,
      title: '강사 마켓플레이스',
      desc: '학원이 강사 구할 때 비슷한 학원에서 잘한 강사 추천 (B2B).',
      dataValue: 'D. 마켓플레이스 수수료. 데이터 누적 후 가능 (1000+ 학원).',
      effort: '높음 (별도 product)',
      tier: 'Phase 4+ — 채용 성공 수수료',
    },
  ];
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Target className="w-4 h-4 text-emerald-400" /> 추가 기능 우선순위 (Top 10)
      </h3>
      <div className="space-y-2">
        {features.map((f) => (
          <FeatureRow key={f.rank} {...f} />
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-emerald-300">권장 도입 순서:</strong>{' '}
        Phase 2 (3-6개월) — 1, 4, 8 (출결 + 입학 출처 + 지역). 작은 노력으로 큰 데이터 가치. Phase 3 — 2, 3, 5 (수업료 + 학부모 + 성적). 결제 + AI 자동화 가세. Phase 4+ — 9, 10 (마케팅 + 강사 마켓). 데이터 누적 후.
      </div>
    </div>
  );
}

function FeatureRow({
  rank,
  title,
  desc,
  dataValue,
  effort,
  tier,
}: {
  rank: number;
  title: string;
  desc: string;
  dataValue: string;
  effort: string;
  tier: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-3 grid grid-cols-[40px_1fr] gap-3">
      <div className="flex items-start justify-center">
        <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-300 text-[12px] font-semibold flex items-center justify-center">
          {rank}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-[9px] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
            구현 {effort}
          </span>
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed mb-1">
          {desc}
        </p>
        <div className="text-[10.5px] text-[var(--color-text-muted)] mb-1">
          <strong className="text-violet-300">데이터 가치:</strong>{' '}
          <span className="text-[var(--color-text-secondary)]">{dataValue}</span>
        </div>
        <div className="text-[10.5px] text-[var(--color-text-muted)]">
          <strong className="text-amber-300">tier:</strong>{' '}
          <span className="text-[var(--color-text-secondary)]">{tier}</span>
        </div>
      </div>
    </div>
  );
}

/* —— 수익화 모델 5가지 —— */

function RevenueModels() {
  const models = [
    {
      icon: <Star className="w-5 h-5" />,
      tone: 'emerald' as const,
      name: 'Premium 구독',
      arr: '학원 1000곳 × 5% × 14,900원 = 75만원/월 → ARR 900만원',
      mature: '저', current: '메인',
    },
    {
      icon: <Receipt className="w-5 h-5" />,
      tone: 'sky' as const,
      name: 'B2B 시장 리포트',
      arr: '출판사 5곳 × 연 5천만원 = 2.5억원/년',
      mature: '고 (3년+)', current: 'Phase 4',
    },
    {
      icon: <Wallet className="w-5 h-5" />,
      tone: 'amber' as const,
      name: '결제 수수료',
      arr: '학원 1000곳 × 평균 학원비 1000만원/월 × 1.5% = 1.5억원/월',
      mature: '중 (PG 계약 필요)', current: 'Phase 3',
    },
    {
      icon: <Network className="w-5 h-5" />,
      tone: 'violet' as const,
      name: '마켓플레이스 수수료',
      arr: '강사 채용 100건/년 × 평균 학원비 1년치 × 10% = 1억원/년',
      mature: '고 (마켓 양면)', current: 'Phase 4+',
    },
    {
      icon: <Boxes className="w-5 h-5" />,
      tone: 'rose' as const,
      name: 'API / Data 판매',
      arr: 'edtech / 출판 / 정부 API 계약 — 각 1천만원/년',
      mature: '고', current: 'Phase 5',
    },
  ];
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-emerald-400" /> 수익화 모델 5가지 — ARR 추정
      </h3>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--color-bg-secondary)] text-left text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">모델</th>
              <th className="px-3 py-2 font-medium">ARR 추정 (학원 1000곳 기준)</th>
              <th className="px-3 py-2 font-medium">성숙도</th>
              <th className="px-3 py-2 font-medium">Phase</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m, i) => (
              <tr key={m.name} className={i % 2 ? 'bg-[var(--color-bg-secondary)]/20' : ''}>
                <td className="px-3 py-2 font-medium flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded flex items-center justify-center ${
                      m.tone === 'emerald'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : m.tone === 'sky'
                          ? 'bg-sky-500/15 text-sky-400'
                          : m.tone === 'amber'
                            ? 'bg-amber-500/15 text-amber-400'
                            : m.tone === 'violet'
                              ? 'bg-violet-500/15 text-violet-400'
                              : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {m.icon}
                  </span>
                  {m.name}
                </td>
                <td className="px-3 py-2 text-[var(--color-text-secondary)]">{m.arr}</td>
                <td className="px-3 py-2 text-[var(--color-text-secondary)]">{m.mature}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[10px] text-[var(--color-text-secondary)]">
                    {m.current}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-violet-300">중요:</strong>{' '}
        {'Phase 1-2 는 Premium 구독 (안정) 만. Phase 3 결제 통합으로 폭발적 ARR — 1000 학원 × 학원비 1억원 거래량 × 1.5% = 월 1.5억원. Phase 4+ B2B 리포트/마켓이 long-tail. 결제 통합이 게임 체인저.'}
      </div>
    </div>
  );
}

/* —— Future product lines —— */

function ProductLines() {
  const products = [
    {
      name: 'class-planner Core',
      tone: 'emerald' as const,
      desc: '시간표 + 학생 + 강사 — 무료/Premium (현재)',
      phase: 'Phase 1-2',
      status: '진행 중',
    },
    {
      name: 'class-planner Insights',
      tone: 'sky' as const,
      desc: 'KPI 대시보드 + AI 자동화 — Premium feature',
      phase: 'Phase 2-3',
      status: '계획',
    },
    {
      name: 'class-planner Pay',
      tone: 'amber' as const,
      desc: '학원비 결제 + 자동 청구 — Free + 수수료',
      phase: 'Phase 3',
      status: '계획',
    },
    {
      name: 'class-planner Market (B2B)',
      tone: 'violet' as const,
      desc: '시장 리포트 + 데이터 API — 출판사/교육청 별도 상품',
      phase: 'Phase 4+',
      status: '미래',
    },
    {
      name: 'class-planner Match',
      tone: 'rose' as const,
      desc: '강사 채용 매칭 / 학원 추천 — 마켓플레이스',
      phase: 'Phase 4+',
      status: '미래',
    },
  ];
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Boxes className="w-4 h-4 text-violet-400" /> Future Product Lines — class-planner 가족
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {products.map((p) => (
          <ProductLineCard key={p.name} {...p} />
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-amber-300">로드맵 logic:</strong>{' '}
        {'Core (무료 대규모 사용자) → Insights (데이터 누적 + Premium ARR 확보) → Pay (거래 데이터 + 폭발적 수수료) → Market/Match (누적 데이터로 B2B 진입). 각 product line 은 이전 데이터 위에 빌드 — 순서 바꾸면 데이터 부족으로 실패.'}
      </div>
    </div>
  );
}

function ProductLineCard({
  name,
  tone,
  desc,
  phase,
  status,
}: {
  name: string;
  tone: 'emerald' | 'sky' | 'amber' | 'violet' | 'rose';
  desc: string;
  phase: string;
  status: string;
}) {
  const borderClass =
    tone === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : tone === 'sky'
        ? 'border-sky-500/30 bg-sky-500/5'
        : tone === 'amber'
          ? 'border-amber-500/30 bg-amber-500/5'
          : tone === 'violet'
            ? 'border-violet-500/30 bg-violet-500/5'
            : 'border-rose-500/30 bg-rose-500/5';
  return (
    <div className={`rounded-lg border p-3 ${borderClass}`}>
      <div className="font-semibold text-[11px] mb-1">{name}</div>
      <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed mb-2">{desc}</p>
      <div className="text-[9px] text-[var(--color-text-muted)] flex items-center justify-between">
        <span>{phase}</span>
        <span className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)]">{status}</span>
      </div>
    </div>
  );
}

/* ───────────────── 광고 vs 프리미엄 ───────────────── */

function AdsVsPremium() {
  return (
    <section>
      <SectionHeader icon={<Megaphone className="w-5 h-5 text-rose-400" />}>
        ⑥ 광고 vs 프리미엄 — 어떤 수익 채널?
      </SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChannelCard
          icon={<Megaphone className="w-5 h-5" />}
          tone="rose"
          title="광고 모델"
          fitToUs="비추천"
          points={[
            { ok: false, text: "B2B SaaS 에서 광고 효과 극히 낮음. 학원 운영자는 광고 시청 시간 없음" },
            { ok: false, text: "학부모 share 페이지에 광고? — 학원 운영자 신뢰 손상. 학원이 서비스 이탈" },
            { ok: false, text: "광고 단가 (CPM) 낮음. 30조 시장에서 학원당 광고 수익 < 1000원/월 예상" },
            { ok: true, text: "예외: 학원 추가 도구 (교재, 학원 보험 등) cross-promotion. 광고 형태 X, partnership" },
          ]}
        />
        <ChannelCard
          icon={<Wallet className="w-5 h-5" />}
          tone="emerald"
          title="프리미엄 구독"
          fitToUs="추천"
          recommended
          points={[
            { ok: true, text: "ARPU 예상 월 9,900~14,900원 — small biz SaaS 표준 범위" },
            { ok: true, text: "학원 운영자가 본인의 수익 도구로 인지. 지불 willingness 높음" },
            { ok: true, text: "변환율 6-10% 가능 (안 B 채택 시)" },
            { ok: true, text: "annual plan 할인 (12,900원) 으로 churn 낮춤" },
            { ok: false, text: "premium feature 개발 비용 + AI inference 비용 발생" },
          ]}
        />
      </div>
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <strong className="text-amber-300">하이브리드 (선택적):</strong>{" "}
        결제 통합 도입 시 수수료 1% 추가 (랠리즈 패턴). 학원 운영자가{" "}
        <strong>매출 발생 후</strong> 지불 — 진입장벽 0. 단, PG 계약 + 정산 인프라
        필요 (Phase 3+).
      </div>
    </section>
  );
}

function ChannelCard({
  icon,
  tone,
  title,
  fitToUs,
  points,
  recommended,
}: {
  icon: React.ReactNode;
  tone: "rose" | "emerald";
  title: string;
  fitToUs: string;
  points: { ok: boolean; text: string }[];
  recommended?: boolean;
}) {
  const borderClass =
    recommended
      ? "border-emerald-500/50 bg-emerald-500/10"
      : tone === "rose"
        ? "border-rose-500/30 bg-rose-500/5"
        : "border-emerald-500/30 bg-emerald-500/5";
  const iconClass = tone === "rose" ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400";
  return (
    <div className={`rounded-xl border p-5 ${borderClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
          {icon}
        </div>
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{fitToUs}</div>
        </div>
        {recommended && (
          <span className="ml-auto px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-[9px] text-emerald-200 font-medium">
            추천
          </span>
        )}
      </div>
      <ul className="space-y-2 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2">
            {p.ok ? (
              <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" />
            )}
            {p.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────── Phase Timeline ───────────────── */

function PhaseTimeline() {
  const phases = [
    {
      label: "Phase 1 — 사용자 확보",
      duration: "지금 ~ 3개월",
      goal: "유료 X · 100% 무료 · 사용자 100+ 학원 확보",
      actions: [
        "기본 시간표 / 학생 / 강사 / 출결 / PDF / 학부모 share — 모두 무료 풀 기능",
        "사용자 피드백 channel 강화 (in-app feedback, 학원 운영자 1:1 인터뷰)",
        "SEO + 콘텐츠 마케팅 (\"무료 학원 시간표\", \"학원 PDF 인쇄\")",
        "랜딩 페이지 + 데모 영상 + try-it-now 인터랙티브 (변환율 16.7% baseline)",
      ],
      kpi: "WAU 100+ 학원, NPS 50+",
    },
    {
      label: "Phase 2 — Premium 정의 + 시드 유료 사용자",
      duration: "3 ~ 6개월",
      goal: "안 B 채택 → 학생 limit 30명 도입 + premium 기능 1-2개 출시",
      actions: [
        "Premium feature 1차: AI 시간표 자동 최적화 (드래그 충돌 해결 자동화)",
        "Premium feature 2차: 강사 무제한 초대 + 강사별 권한 세분",
        "데이터 복구 UI 구현 — 자동 백업 (Free 7일·Premium 90일) + 시점 복원 모달",
        "강사 휴지통 한도 — Free 30일 자동 영구 삭제 + Premium 무제한",
        "PDF brand 제거 (학원 logo upload) — premium",
        "Stripe 결제 통합 (또는 토스페이먼츠)",
        "Phase 1 사용자에게 \"6개월 무료 grandfather\" 제공 — 신뢰 형성",
      ],
      kpi: "유료 학원 10+, 변환율 3-5%",
    },
    {
      label: "Phase 3 — 차별화 + Network 효과",
      duration: "6 ~ 12개월",
      goal: "데이터 flywheel + 워크플로우 통합 + 학원비 결제 통합 (옵션)",
      actions: [
        "학원별 분석 대시보드 (출결률, 학생 retention, 매출 추세)",
        "학원 간 벤치마킹 (anonymized — \"비슷한 학원 대비 우리 학원은...\")",
        "학부모 알림 자동화 (출결 자동 발송, AI 메시지 생성)",
        "데이터 복구 — 수동 스냅샷 + 다운로드 (JSON) + audit log 추가 (Premium)",
        "강사 보관 audit log (누가 언제 보관/복구) + 일괄 복구 (Premium)",
        "결제 통합 (PG 계약 + 학원비 자동 청구) — 수수료 1.5%",
        "iOS/Android 앱 — push 알림 + 모바일 first 학원 운영자 캡처",
      ],
      kpi: "유료 학원 100+, ARR 1억원+, churn < 5%",
    },
  ];

  return (
    <section>
      <SectionHeader icon={<Timer className="w-5 h-5 text-indigo-400" />}>
        ⑦ Timeline — 3 Phase (Wedge → Premium → 차별화)
      </SectionHeader>
      <ol className="space-y-4">
        {phases.map((p, i) => (
          <li
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-5"
          >
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono flex items-center justify-center">
                  {i + 1}
                </span>
                {p.label}
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)]">
                {p.duration}
              </span>
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] mb-3 leading-relaxed">
              <strong className="text-indigo-300">목표:</strong> {p.goal}
            </div>
            <ul className="space-y-1.5 mb-3">
              {p.actions.map((a, ai) => (
                <li
                  key={ai}
                  className="flex items-start gap-2 text-[11px] text-[var(--color-text-secondary)] leading-relaxed"
                >
                  <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
            <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Target className="w-3 h-3" />
              <span>
                <strong>KPI:</strong> {p.kpi}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────────── 최종 권장 ───────────────── */

function FinalRecommendation() {
  return (
    <section>
      <SectionHeader icon={<Trophy className="w-5 h-5 text-emerald-400" />}>
        ⑧ 최종 권장 — 사용자 안 + 데이터 종합
      </SectionHeader>
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-lg mb-1">
              "무료로 풀어 유저 확보 → 안 B (Usage + 협업 gating) 부분유료화"
            </h3>
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              사용자 본인 안과 정합 + 데이터 기반 우선순위 + AI 시대 차별화 핵심을 통합한
              권장. timeline 은 위 ⑦. ARPU 14,900원/학원·월, 변환율 5-7% 가정 시 사용자
              1000 학원 = ARR 1억원 가능.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <RecCard
            icon={<Flame className="w-4 h-4" />}
            title="우선순위 1 — 디자인/속도/UX"
            text="AI 시대 남은 moat. Local-first 0ms + 우아한 UX 가 1차 차별화."
          />
          <RecCard
            icon={<Database className="w-4 h-4" />}
            title="우선순위 2 — 데이터 flywheel"
            text="사용자 늘수록 학원 운영 패턴 데이터 누적. AI 자동화 기능 = 데이터 기반."
          />
          <RecCard
            icon={<Heart className="w-4 h-4" />}
            title="우선순위 3 — 신뢰 + 한국 wedge"
            text="학원 운영자 1:1 인터뷰 + 빠른 피드백 사이클 (24h). 한국 사교육 specific."
          />
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-[var(--color-bg-secondary)]/30 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          <strong className="text-emerald-300">왜 \"먼저 유료화\"는 비추천:</strong>{" "}
          (1) 한국 학원 SaaS 시장에 무료 옵션 다수 (클래스업/공선학관/랠리즈) — 유료
          진입 시 비교 우위 만들기 어렵다. (2) 초기 사용자 100명도 못 모으면 데이터
          flywheel 시작 안 됨 — AI 시대 핵심 moat 못 만듦. (3) 인프라 비용은 무료
          사용자 100명 수준에서 월 5-10만원 — 사용자 본인 부담 가능. ARR 10만원 부터
          break-even.
        </div>

        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          <strong className="text-amber-300">왜 \"광고\"는 비추천:</strong>{" "}
          B2B SaaS 학원 도메인에서 광고 단가 매우 낮음 + 학원 운영자가 광고 노출 도구를
          학부모 share 페이지에 두지 않으려 함 (신뢰 손상). Partnership (교재·보험·
          학원 마케팅 도구) 형태 cross-promotion 만 추후 고려.
        </div>
      </div>
    </section>
  );
}

function RecCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-[var(--color-bg-primary)]/60 p-4">
      <div className="flex items-center gap-2 mb-2 text-emerald-300">
        {icon}
        <span className="text-[12px] font-medium">{title}</span>
      </div>
      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{text}</p>
    </div>
  );
}

/* ───────────────── References ───────────────── */

function References() {
  const refs = [
    {
      label: "한국 사교육 시장 30조 + 학원 양극화",
      url: "https://edumorning.com/articles/853",
    },
    {
      label: "사교육 30조 시대 — 학령인구 감소에도 사교육비 증가",
      url: "https://www.asiae.co.kr/visual-news/article/2025052914314444471",
    },
    {
      label: "한국 학원 관리 SaaS 매트릭스 (클래스업/통통통/학원조아 등)",
      url: "https://blog.bati.ai/academy-service/",
    },
    {
      label: "SaaS Freemium 2026 변환율 — small biz 6-10%",
      url: "https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/",
    },
    {
      label: "AI 시대 SaaS moat — feature moat 소멸 + 남은 moat",
      url: "https://medium.com/@cenrunzhe/ai-killed-the-feature-moat-heres-what-actually-defends-your-saas-company-in-2026-9a5d3d20973b",
    },
    {
      label: "Calendly / Figma / Notion freemium gating 패턴",
      url: "https://newsletter.pricingsaas.com/p/this-week-openai-figma-calendly",
    },
    {
      label: "EdTech freemium 사례 — Canvas LMS bottom-up 전략",
      url: "https://www.getmonetizely.com/articles/edtech-pricing-models-monetizing-education-technology-effectively",
    },
    {
      label: "Vertical SaaS 인사이트 (Stripe Sessions 2026)",
      url: "https://stripe.com/blog/vertical-saas-insights-sessions-2026",
    },
  ];
  return (
    <section className="mb-8">
      <SectionHeader icon={<Award className="w-5 h-5 text-[var(--color-text-muted)]" />}>
        Sources
      </SectionHeader>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
        {refs.map((r) => (
          <li key={r.url}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 px-3 py-2 hover:border-[var(--color-border)]/60 text-[var(--color-text-secondary)]"
            >
              <Eye className="w-3 h-3 inline mr-1.5 opacity-50" />
              {r.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────────── Common ───────────────── */

function SectionHeader({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-xl font-semibold">{children}</h2>
    </div>
  );
}
