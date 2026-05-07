import Link from "next/link";

const PROTOTYPES = [
  {
    href: "/design-explorations/p4-a",
    title: "P4-A · Sidebar",
    desc: "좌측 collapsible 사이드바에 학생/강사 리스트 + 메인은 시간표만. Google Calendar / Sana AI 패턴. 권장.",
    pros: "시간표 영역 최대, Mobile에서 collapse 자연",
    cons: "좁은 노트북에서 가로 압박 가능",
  },
  {
    href: "/design-explorations/p4-b",
    title: "P4-B · Popover",
    desc: "헤더 1줄 (filter 활성 chip + ⏱9-23 + PDF/템플릿) + 활성 chip 클릭 시 popover로 전체 학생 리스트.",
    pros: "Linear/Stripe 패턴, 헤더 가장 압축",
    cons: "전체 학생 리스트는 클릭 후에만 보임 (mental load)",
  },
  {
    href: "/design-explorations/p4-c",
    title: "P4-C · Hide-on-Scroll",
    desc: "정지 시 풀 헤더 + chip bar. 스크롤 시작하면 헤더 자동 압축 (Material 3 패턴).",
    pros: "정보 잃지 않음, 모바일 친화",
    cons: "스크롤 동작 추가 학습",
  },
  {
    href: "/schedule?layout=p3",
    title: "현재 P3 (라이브)",
    desc: "Phase 2까지 구현된 sticky header + active chip + Time Selector. 실 schedule 페이지로 이동.",
    pros: "실 데이터로 비교 가능",
    cons: "버그 (time range 미적용 + N명 클릭 expand 부재)",
  },
];

export default function DesignExplorationsIndex() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">P4 Schedule Layout — Visual Companion</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            mock data 17명 학생, 5개 세션. 실 schedule 페이지(/schedule)는 무관.
            각 prototype을 클릭해 비교. 결정 후 사용자가 선호 layout을 알려주세요.
          </p>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROTOTYPES.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="block rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-bg-secondary)]/40 p-5 transition-colors h-full"
              >
                <h2 className="text-lg font-semibold mb-1">{p.title}</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3 leading-relaxed">
                  {p.desc}
                </p>
                <div className="text-xs space-y-1">
                  <p className="text-emerald-400">+ {p.pros}</p>
                  <p className="text-amber-400">– {p.cons}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-10 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-4">
          <p>각 prototype은 mock data + 단순화된 grid. 인터랙션은 limit (chip 클릭/검색만 작동).</p>
          <p>본 비교 후 본격 구현 시 실 컴포넌트 통합 + bug fix 진행.</p>
        </footer>
      </div>
    </main>
  );
}
