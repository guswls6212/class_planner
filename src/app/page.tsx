"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const check = () => {
      const userId = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
      setIsLoggedIn(!!userId);
      if (userId) {
        router.replace("/schedule");
      }
    };

    check();
    const interval = setInterval(check, 1000);
    window.addEventListener("userLoggedOut", check);

    return () => {
      clearInterval(interval);
      window.removeEventListener("userLoggedOut", check);
    };
  }, [router]);

  if (isLoggedIn) return null;

  return (
    <>
      <HeroSection />
      <StepsSection />
      <BottomCTA />
    </>
  );
}

function HeroSection() {
  return (
    <section className="pb-16 pt-12 px-6 md:px-12 lg:px-20">
      <div className="flex flex-col md:flex-row items-center gap-12 max-w-7xl mx-auto">
        <div className="flex-1">
          <p className="text-caption text-accent font-[600] tracking-[0.1em] uppercase mb-3">
            무료 시간표 관리 도구
          </p>
          <h1 className="text-hero font-[800] tracking-[-0.035em] leading-[1.15] mb-4 text-[--color-text-primary]">
            수업 시간표,
            <br />
            5분이면 충분합니다
          </h1>
          <p className="text-[15px] leading-relaxed text-[--color-text-muted] mb-8">
            학생 등록부터 시간표 완성, PDF 출력까지.
            <br />
            복잡한 설정 없이 바로 시작하세요.
          </p>
          <div className="flex gap-3">
            <Link
              href="/schedule"
              className="bg-accent hover:bg-accent-hover text-[#1a1a1a] font-bold px-7 py-3 rounded-admin-md shadow-admin-md transition-colors"
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
        <div className="flex-1 w-full">
          <ScheduleMockup />
        </div>
      </div>
    </section>
  );
}

function ScheduleMockup() {
  return (
    <div
      aria-hidden="true"
      className="bg-[--color-bg-secondary] rounded-admin-lg shadow-admin-lg border border-[--color-border-light] p-5 w-full"
    >
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "56px repeat(5, 1fr)" }}
      >
        {/* Header row */}
        <div />
        {["월", "화", "수", "목", "금"].map((day) => (
          <div
            key={day}
            className="text-[12px] font-[700] text-[--color-text-muted] text-center py-2"
          >
            {day}
          </div>
        ))}

        {/* 15:00 row */}
        <div className="text-[10px] text-[--color-text-muted] text-right py-1 pr-2">
          15:00
        </div>
        {/* 월 */}
        <div className="bg-[--color-subject-blue-bg] text-[--color-subject-blue-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          수학
          <br />
          <span className="text-[9px] opacity-70">김민준</span>
        </div>
        {/* 화 */}
        <div />
        {/* 수 */}
        <div className="bg-[--color-subject-blue-bg] text-[--color-subject-blue-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          수학
          <br />
          <span className="text-[9px] opacity-70">김민준</span>
        </div>
        {/* 목 */}
        <div />
        {/* 금 */}
        <div className="bg-[--color-subject-red-bg] text-[--color-subject-red-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          영어
          <br />
          <span className="text-[9px] opacity-70">이서연</span>
        </div>

        {/* 16:00 row */}
        <div className="text-[10px] text-[--color-text-muted] text-right py-1 pr-2">
          16:00
        </div>
        {/* 월 */}
        <div className="bg-[--color-subject-violet-bg] text-[--color-subject-violet-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          과학
          <br />
          <span className="text-[9px] opacity-70">박지호</span>
        </div>
        {/* 화 */}
        <div className="bg-[--color-subject-red-bg] text-[--color-subject-red-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          영어
          <br />
          <span className="text-[9px] opacity-70">이서연</span>
        </div>
        {/* 수 */}
        <div />
        {/* 목 */}
        <div className="bg-[--color-subject-emerald-bg] text-[--color-subject-emerald-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          국어
          <br />
          <span className="text-[9px] opacity-70">최유진</span>
        </div>
        {/* 금 */}
        <div />

        {/* 17:00 row */}
        <div className="text-[10px] text-[--color-text-muted] text-right py-1 pr-2">
          17:00
        </div>
        {/* 월 */}
        <div />
        {/* 화 */}
        <div className="bg-[--color-subject-amber-bg] text-[--color-subject-amber-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          미술
          <br />
          <span className="text-[9px] opacity-70">정하은</span>
        </div>
        {/* 수 */}
        <div className="bg-[--color-subject-emerald-bg] text-[--color-subject-emerald-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          국어
          <br />
          <span className="text-[9px] opacity-70">최유진</span>
        </div>
        {/* 목 */}
        <div className="bg-[--color-subject-violet-bg] text-[--color-subject-violet-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          과학
          <br />
          <span className="text-[9px] opacity-70">박지호</span>
        </div>
        {/* 금 */}
        <div className="bg-[--color-subject-blue-bg] text-[--color-subject-blue-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          수학
          <br />
          <span className="text-[9px] opacity-70">김민준</span>
        </div>

        {/* 18:00 row */}
        <div className="text-[10px] text-[--color-text-muted] text-right py-1 pr-2">
          18:00
        </div>
        {/* 월 */}
        <div className="bg-[--color-subject-pink-bg] text-[--color-subject-pink-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          음악
          <br />
          <span className="text-[9px] opacity-70">한소율</span>
        </div>
        {/* 화 */}
        <div />
        {/* 수 */}
        <div className="bg-[--color-subject-teal-bg] text-[--color-subject-teal-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          체육
          <br />
          <span className="text-[9px] opacity-70">윤도현</span>
        </div>
        {/* 목 */}
        <div />
        {/* 금 */}
        <div className="bg-[--color-subject-orange-bg] text-[--color-subject-orange-fg] rounded-[6px] p-[6px] text-[10px] leading-[1.3]">
          사회
          <br />
          <span className="text-[9px] opacity-70">강예린</span>
        </div>
      </div>
    </div>
  );
}

function StepsSection() {
  const steps = [
    {
      n: 1,
      title: "학생·과목 등록",
      desc: "이름만 입력하면 끝. 검색으로 빠르게 찾고, 과목별 색상이 자동 배정됩니다.",
    },
    {
      n: 2,
      title: "시간표에 배치",
      desc: "요일과 시간을 선택하고 수업을 추가. 한눈에 보이는 주간 시간표가 완성됩니다.",
    },
    {
      n: 3,
      title: "PDF로 출력",
      desc: "완성된 시간표를 PDF로 다운로드. 바로 인쇄해서 학원에 게시할 수 있습니다.",
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
          3단계면 시간표 완성
        </p>
        <div className="flex flex-col md:flex-row gap-6">
          {steps.map(({ n, title, desc }) => (
            <div
              key={n}
              className="flex-1 bg-[--color-bg-primary] rounded-admin-lg border border-[--color-border] p-7"
            >
              <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center font-[800] text-[#1a1a1a] text-base mb-4">
                {n}
              </div>
              <p className="font-bold text-base text-[--color-text-primary] mb-2">
                {title}
              </p>
              <p className="text-label text-[--color-text-muted] leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="py-12 px-6 text-center bg-[#1a1a1a]">
      <h2 className="text-page font-[800] text-white mb-2 tracking-[-0.035em]">
        지금 바로 시작하세요
      </h2>
      <p className="text-sm text-[#999] mb-6">
        회원가입 없이 바로 사용할 수 있습니다. 무료.
      </p>
      <Link
        href="/schedule"
        className="inline-block bg-accent hover:bg-accent-hover text-[#1a1a1a] font-bold px-9 py-3.5 rounded-admin-md shadow-admin-md transition-colors"
      >
        무료로 시작하기
      </Link>
    </section>
  );
}
