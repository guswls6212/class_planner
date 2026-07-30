import type { Metadata } from "next";
import Link from "next/link";

import SchedulePreview from "@/components/common/SchedulePreview";
import type { PreviewCell } from "@/components/common/SchedulePreview.types";
import { SITE_URL } from "@/lib/seo/site";

import RootRedirectGate from "./_components/RootRedirectGate";

// ───────────────────────── SEO / AEO 메타데이터 ─────────────────────────
// 루트(`/`) = 공부방·교습소·1인 학원 타겟 마케팅 면. 메인 도메인에 검색·AI 답변 권위 집중.

const OG_TITLE = "공부방 시간표, 엑셀로 두 번 안 고치게 — class-planner";
const OG_DESC =
  "학생별로 한 번만 입력하면 방 시간표도, 학부모 안내도 자동으로. 공부방·교습소·1인 학원을 위한 시간표 관리.";

export const metadata: Metadata = {
  title: "공부방 시간표 자동화 — class-planner | 공부방·교습소·1인 학원",
  description:
    "매일 바뀌는 학생별 시간표를 엑셀로 두 번 고치지 마세요. 학생별 한 번 입력하면 방 시간표와 학부모 안내까지 자동. 회원가입 없이 무료로 시작하는 공부방·교습소·1인 학원 시간표 관리, class-planner.",
  keywords: [
    "공부방 시간표",
    "공부방 프로그램",
    "공부방 학생관리",
    "교습소 시간표",
    "1인 학원 시간표",
    "소규모 학원 시간표",
    "학원 시간표 관리",
    "공선학관 대체",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: OG_TITLE,
    description: OG_DESC,
    url: "/",
    siteName: "class-planner",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESC,
  },
};

const LANDING_DEMO_DATA: PreviewCell[] = [
  { day: 0, timeIndex: 0, subjectLabel: "수학", studentLabel: "김민준", color: "blue" },
  { day: 2, timeIndex: 0, subjectLabel: "수학", studentLabel: "김민준", color: "blue" },
  { day: 4, timeIndex: 2, subjectLabel: "수학", studentLabel: "김민준", color: "blue" },
  { day: 4, timeIndex: 0, subjectLabel: "영어", studentLabel: "이서연", color: "red" },
  { day: 1, timeIndex: 1, subjectLabel: "영어", studentLabel: "이서연", color: "red" },
  { day: 0, timeIndex: 1, subjectLabel: "과학", studentLabel: "박지호", color: "violet" },
  { day: 3, timeIndex: 2, subjectLabel: "과학", studentLabel: "박지호", color: "violet" },
  { day: 3, timeIndex: 1, subjectLabel: "국어", studentLabel: "최유진", color: "emerald" },
  { day: 2, timeIndex: 2, subjectLabel: "국어", studentLabel: "최유진", color: "emerald" },
  { day: 1, timeIndex: 2, subjectLabel: "미술", studentLabel: "정하은", color: "amber" },
  { day: 0, timeIndex: 3, subjectLabel: "음악", studentLabel: "한소율", color: "pink" },
  { day: 2, timeIndex: 3, subjectLabel: "체육", studentLabel: "윤도현", color: "teal" },
  { day: 4, timeIndex: 3, subjectLabel: "사회", studentLabel: "강예린", color: "orange" },
];

// 화면에 보이는 FAQ 와 JSON-LD(FAQPage) 의 단일 소스 — 구글 가이드(가시 콘텐츠와 마크업 일치).
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "공부방·교습소에서 써도 되나요?",
    a: "네. 학생마다 수업 시간이 다른 1:1·소규모 운영에 맞춰 만들었습니다. 공부방·교습소·1인 학원에서 바로 쓸 수 있어요.",
  },
  {
    q: "무료인가요?",
    a: "회원가입 없이 바로 무료로 시작할 수 있습니다. 더 많은 학생·기능이 필요할 때만 유료를 선택하면 됩니다.",
  },
  {
    q: "학부모가 앱을 설치해야 하나요?",
    a: "아니요. 공유 링크나 6자리 접속코드만 보내면 학부모가 설치 없이 최신 시간표를 바로 봅니다.",
  },
  {
    q: "출결·수납도 되나요?",
    a: "지금은 시간표와 학생 관리를 가장 쉽게 만드는 데 집중하고 있습니다. 출결·수납은 이후 로드맵에 있습니다.",
  },
  {
    q: "공선학관에서 옮길 수 있나요?",
    a: "공부방·교습소 시간표와 학생 정보를 옮겨오시는 걸 도와드립니다.",
  },
];

export default function LandingPage() {
  return (
    <>
      <RootRedirectGate />
      <LandingStructuredData />
      <HeroSection />
      <StepsSection />
      <FaqSection />
      <BottomCTA />
    </>
  );
}

// JSON-LD(AEO/GEO) — SoftwareApplication + FAQPage + Organization. 서버 렌더라 크롤러가 즉시 인식.
function LandingStructuredData() {
  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "class-planner",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "공부방·교습소·1인 학원을 위한 시간표 관리. 학생별 한 번 입력으로 방 시간표와 학부모 안내까지 자동 동기화.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    publisher: { "@type": "Organization", name: "deepcraft", url: "https://deepcraft.app" },
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "deepcraft",
    url: "https://deepcraft.app",
    brand: { "@type": "Brand", name: "class-planner" },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
    </>
  );
}

function HeroSection() {
  return (
    <section className="pb-16 pt-12 px-6 md:px-12 lg:px-20">
      <div className="flex flex-col md:flex-row items-center gap-12 max-w-7xl mx-auto">
        <div className="flex-1">
          <p className="text-caption text-accent font-[600] tracking-[0.1em] uppercase mb-3">
            공부방·교습소·1인 학원 시간표
          </p>
          <h1 className="text-hero font-[800] tracking-[-0.035em] leading-[1.15] mb-4 text-[--color-text-primary]">
            매일 바뀌는 학생별 시간표,
            <br />
            엑셀로 두 번 고치지 마세요
          </h1>
          <p className="text-[15px] leading-relaxed text-[--color-text-muted] mb-8">
            학생별로 한 번만 입력하면 방 시간표도, 학부모 안내도{" "}
            <strong className="text-[--color-text-primary] font-semibold">자동으로 완성</strong>.
            <br />
            학생이 바뀌어도 5분이면 다시 끝나고, PDF·링크로 학부모에게 바로 공유하세요.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/schedule"
              className="bg-accent hover:bg-accent-hover text-admin-ink font-bold px-7 py-3 rounded-admin-md shadow-admin-md transition-colors"
            >
              무료로 시작하기
            </Link>
            <a
              href="#how-it-works"
              className="border border-[--color-border] text-[--color-text-muted] px-7 py-3 rounded-admin-md hover:bg-[--color-bg-tertiary] transition-colors"
            >
              자세히 보기 ↓
            </a>
          </div>
        </div>
        <div className="flex-[1.2] w-full">
          {/* make → share: 드래그로 만들고(데모 cue) → 학부모에게 공유. 실제 드래그/PDF 영상은 follow-up 캡처 */}
          <div className="relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-admin-ink text-white text-caption px-2.5 py-1 rounded-full shadow-admin-md animate-bounce whitespace-nowrap">
              ↕ 드래그로 수업 이동
            </div>
            <SchedulePreview
              data={LANDING_DEMO_DATA}
              times={["15:00", "16:00", "17:00", "18:00"]}
              size="sm"
            />
            <div className="mt-3">
              <p className="text-caption text-[--color-text-muted] mb-1.5">
                완성한 시간표, 학부모에게 바로
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-admin-md border border-[--color-border] bg-[--color-bg-secondary] px-3 py-2">
                  <div className="text-caption text-[--color-text-muted] mb-0.5">공유 링크</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-label text-[--color-text-muted] truncate font-mono">
                      …/share/a1b2c3
                    </span>
                    <span className="text-caption bg-accent text-admin-ink rounded px-1.5 py-0.5 font-semibold shrink-0">
                      복사
                    </span>
                  </div>
                </div>
                <div className="rounded-admin-md border border-[--color-border] bg-[--color-bg-secondary] px-3 py-2 text-center">
                  <div className="text-caption text-[--color-text-muted] mb-0.5">학부모 접속 코드</div>
                  <span className="font-mono font-bold tracking-[0.2em] text-[--color-text-primary]">
                    8F3K2D
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepsSection() {
  const steps: { n: number; title: string; desc: string; share?: boolean }[] = [
    {
      n: 1,
      title: "학생·과목 등록",
      desc: "이름만 입력하면 끝. 검색으로 빠르게 찾고, 과목별 색상이 자동 배정됩니다.",
    },
    {
      n: 2,
      title: "시간표에 배치",
      desc: "요일·시간을 선택하거나 드래그로 옮기면 끝. 학생이 바뀌어도 5분이면 다시 완성됩니다.",
    },
    {
      n: 3,
      title: "PDF로 출력",
      desc: "한 장으로 깔끔하게 인쇄해 공부방·학원에 게시하세요.",
    },
    {
      n: 4,
      title: "학부모에게 공유",
      desc: "공유 링크 또는 6자리 접속코드를 만들어 카톡으로 전송. 학부모가 언제든 시간표를 확인해요.",
      share: true,
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-16 px-6 md:px-12 lg:px-20 bg-[--color-bg-secondary]"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-section font-bold text-center mb-2 tracking-[-0.02em] text-[--color-text-primary]">
          이렇게 만들어집니다
        </h2>
        <p className="text-label text-center text-[--color-text-muted] mb-10">
          등록부터 학부모 공유까지, 4단계
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map(({ n, title, desc, share }) => (
            <div
              key={n}
              className="flex flex-col bg-[--color-bg-primary] rounded-admin-lg border border-[--color-border] p-6"
            >
              <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center font-[800] text-admin-ink text-base mb-4">
                {n}
              </div>
              <p className="font-bold text-base text-[--color-text-primary] mb-2">
                {title}
              </p>
              <p className="text-label text-[--color-text-muted] leading-relaxed">
                {desc}
              </p>
              {share ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-caption rounded-full border border-[--color-border] bg-[--color-bg-secondary] px-2 py-0.5 text-[--color-text-muted]">
                    🔗 공유 링크
                  </span>
                  <span className="text-caption rounded-full border border-[--color-border] bg-[--color-bg-secondary] px-2 py-0.5 font-mono font-bold tracking-wider text-[--color-text-primary]">
                    8F3K2D
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="py-16 px-6 md:px-12 lg:px-20">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-section font-bold text-center mb-2 tracking-[-0.02em] text-[--color-text-primary]">
          자주 묻는 질문
        </h2>
        <p className="text-label text-center text-[--color-text-muted] mb-10">
          공부방·교습소·1인 학원 운영자분들이 많이 묻는 것들
        </p>
        <dl className="flex flex-col gap-4">
          {FAQ_ITEMS.map(({ q, a }) => (
            <div
              key={q}
              className="rounded-admin-lg border border-[--color-border] bg-[--color-bg-secondary] p-5"
            >
              <dt className="font-bold text-base text-[--color-text-primary] mb-1.5">
                {q}
              </dt>
              <dd className="text-label text-[--color-text-muted] leading-relaxed">
                {a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="py-12 px-6 text-center bg-admin-ink">
      <h2 className="text-page font-[800] text-white mb-2 tracking-[-0.035em]">
        지금 바로 시작하세요
      </h2>
      <p className="text-sm text-[--color-text-muted] mb-6">
        회원가입 없이 바로 사용할 수 있습니다.
      </p>
      <Link
        href="/schedule"
        className="inline-block bg-accent hover:bg-accent-hover text-admin-ink font-bold px-9 py-3.5 rounded-admin-md shadow-admin-md transition-colors"
      >
        무료로 시작하기
      </Link>
    </section>
  );
}
