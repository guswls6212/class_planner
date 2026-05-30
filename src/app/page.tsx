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

// invite/[token]/page.tsx 의 OAuth 시작 직전에 set 하는 키 (PR 10 — Supabase Allowed
// Redirect URLs 미등록 시 callback 이 Site URL(=root) 로 fallback 하는 케이스 처리).
// root 가 일반 schedule redirect 전에 이 키 확인해서 invite 페이지로 priority redirect.
const PENDING_INVITE_KEY = "pending_invite_token";

export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const check = () => {
      // PR 10 우선순위 1 — OAuth callback fallback 처리. invite 페이지가 set 한
      // pending token 이 있으면 schedule redirect 보다 invite 흐름이 우선.
      if (typeof window !== "undefined") {
        const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
        if (pendingInvite) {
          router.replace(`/invite/${encodeURIComponent(pendingInvite)}`);
          return;
        }
      }
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
            학생이 바뀔 때마다
            <br />
            시간표 다시 짜지 마세요
          </h1>
          <p className="text-[15px] leading-relaxed text-[--color-text-muted] mb-8">
            끌어다 놓으면 시간표 완성. 학생이 바뀌어도{" "}
            <strong className="text-[--color-text-primary] font-semibold">5분이면 다시 완성</strong>하고,
            <br />
            PDF·링크로 학부모에게 바로 공유하세요.
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
          <p className="text-caption text-[--color-text-muted] mt-3">
            회원가입 없이 30초면 시작 · 100% 무료
          </p>
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
  const steps = [
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
      desc: "PDF로 출력해 인쇄하고, 공유 링크·학부모 접속코드로 바로 전송하세요.",
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
