"use client";

import {
  AlertTriangle,
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
            "광고/브랜드 표시 없음",
          ]}
          premiumTier={[
            "학생 30+ 명 — 월 9,900원/학원",
            "전체 기능 동일, 학생 수만 늘어남",
          ]}
          pros={["가장 단순", "사용자 인지 비용 낮음"]}
          cons={["변환 trigger 가 학생 수 하나 — 작은 학원은 평생 무료"]}
        />
        <TierVariant
          number="안 B"
          recommended
          title="Usage + 협업 gating"
          subtitle="개인 무료, 협업 paid"
          freeTier={[
            "학생 30명까지 무료",
            "본인 (원장) 1명까지 무료",
            "PDF 인쇄 + 학부모 share + 기본 시간표 풀 기능",
          ]}
          premiumTier={[
            "월 14,900원/학원 (annual 12,900원)",
            "학생 무제한",
            "강사·관리자 초대 무제한 (협업)",
            "AI 시간표 최적화·학생 picker 등 +기능",
            "학원별 분석 대시보드",
            "PDF 워터마크 제거",
          ]}
          pros={[
            "Usage + 협업 두 trigger — 변환율 6-10% 예상",
            "Figma 패턴: 협업 시작 시 자연 upgrade",
            "AI feature 가 추가 가치 — AI 차별화",
          ]}
          cons={["가격 결정 + AI 기능 개발 필요"]}
        />
        <TierVariant
          number="안 C"
          title="Outcome gating (수업료 % 연동)"
          subtitle="결제 통합 + 수수료 모델"
          freeTier={["모든 기능 + 학생 수 무제한 무료"]}
          premiumTier={[
            "학원비 결제 통합 시 수수료 1.5% (랠리즈 패턴)",
            "또는 수업료 자동 청구 / 미납 추적 등 outcome feature 별 paid",
          ]}
          pros={["무료 진입장벽 0 — 빠른 확보", "학원이 매출 발생 후 수수료"]}
          cons={[
            "결제 통합 인프라 + PG 계약 필요 (시간/리스크 큼)",
            "수수료 모델은 학원 운영자에게 민감 — 신뢰 형성 후 도입",
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
