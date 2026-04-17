"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SchedulePreview from "@/components/common/SchedulePreview";
import type { PreviewCell } from "@/components/common/SchedulePreview.types";

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

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const check = () => {
      const userId = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
      setIsLoggedIn(!!userId);
      setChecked(true);
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

  if (!checked || isLoggedIn) return null;

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
          <SchedulePreview
            data={LANDING_DEMO_DATA}
            times={["15:00", "16:00", "17:00", "18:00"]}
            size="sm"
          />
        </div>
      </div>
    </section>
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
              <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center font-[800] text-admin-ink text-base mb-4">
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
    <section className="py-12 px-6 text-center bg-admin-ink">
      <h2 className="text-page font-[800] text-white mb-2 tracking-[-0.035em]">
        지금 바로 시작하세요
      </h2>
      <p className="text-sm text-[--color-text-muted] mb-6">
        회원가입 없이 바로 사용할 수 있습니다. 무료.
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
