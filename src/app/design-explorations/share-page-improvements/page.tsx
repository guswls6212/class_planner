"use client";

import Link from "next/link";

const SECTION_TITLE_CHIP =
  "text-xs uppercase tracking-widest text-amber-400/80 font-medium";
const CODE_BLOCK =
  "block rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-[11px] font-mono text-zinc-100 whitespace-pre overflow-x-auto leading-6";
const CARD =
  "rounded-xl border border-white/10 bg-zinc-900/40 p-5 space-y-3";

/* ────────────────────────────────────────────────────────────────── */
/* 미니 SessionBlock — 시각 비교용 (Before/After)                       */
/* ────────────────────────────────────────────────────────────────── */
function MiniSessionBlock({
  variant,
}: {
  variant: "before" | "after";
}) {
  return (
    <div
      className={`relative rounded-md px-2.5 py-2 ${
        variant === "before" ? "cursor-grab" : "cursor-default"
      }`}
      style={{
        background: "rgba(244, 114, 182, 0.15)",
        borderLeft: "3px solid rgb(244, 114, 182)",
        minWidth: "180px",
      }}
    >
      {variant === "before" && (
        <div className="absolute top-1.5 right-1.5 bg-zinc-900/80 text-zinc-200 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          3
        </div>
      )}
      <div className="text-[13px] font-semibold text-pink-200">수학</div>
      <div className="text-[10px] text-pink-300/70 mt-0.5">
        {variant === "before" ? "09:00:00-10:00:00" : "09:00-10:00"}
      </div>
      {variant === "before" && (
        <div className="text-[10px] text-pink-300/70 mt-0.5">김영수</div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Polling timeline — 30s vs 60s                                       */
/* ────────────────────────────────────────────────────────────────── */
function PollingTimeline({
  interval,
  label,
  color,
}: {
  interval: 30 | 60;
  label: string;
  color: string;
}) {
  // 5분 (300초) timeline. 30s → 10 ticks, 60s → 5 ticks
  const ticks = 300 / interval;
  const arr = Array.from({ length: ticks }, (_, i) => i);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        <span className="text-[10px] text-zinc-500">
          ({ticks}회 / 5분 = {ticks * 12}회/시간)
        </span>
      </div>
      <div className="relative h-8 bg-zinc-950 border border-white/10 rounded overflow-hidden">
        <div className="absolute inset-0 flex">
          {arr.map((i) => (
            <div
              key={i}
              className={`flex-1 border-r border-white/5 relative`}
            >
              <div
                className={`absolute left-0 top-1 w-1.5 h-1.5 rounded-full ${color.replace("text-", "bg-")}`}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500">
        <span>0초</span>
        <span>5분 후</span>
      </div>
    </div>
  );
}

export default function SharePageImprovementsExplained() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] py-12 px-6">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* ────────────────────────── HEADER ────────────────────────── */}
        <header className="space-y-4">
          <div className={SECTION_TITLE_CHIP}>
            Visual Explainer · 공유 페이지 개선 통합 plan
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            공유 페이지 7가지 변경 — 무엇이 바뀌고 왜 바뀌나
          </h1>
          <p className="text-base text-zinc-300 leading-relaxed">
            <strong className="text-zinc-100">UX 4가지</strong> (사용자가 보기
            싫어하는 노이즈 제거) +{" "}
            <strong className="text-zinc-100">트래픽 3가지</strong> (서버 부담
            줄이는 안전망). 각각 무엇인지 시각으로 비교 + 코드 어디 손대는지 +
            왜 안전한지.
          </p>
          <nav className="flex flex-wrap gap-2 pt-2 text-xs">
            {[
              { href: "#before-after", label: "① Before/After 한눈에" },
              { href: "#ux", label: "② UX 4 변경 상세" },
              { href: "#traffic", label: "③ 트래픽 3 권고 시각" },
              { href: "#scope", label: "④ 3 scope 옵션" },
              { href: "#decision", label: "⑤ 추천 결정" },
            ].map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-full border border-white/10 bg-zinc-900/40 text-zinc-300 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
              >
                {n.label}
              </a>
            ))}
          </nav>
        </header>

        {/* ──────────────── SECTION 1: Before/After ──────────────── */}
        <section id="before-after" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className={SECTION_TITLE_CHIP}>① 한눈에</div>
            <h2 className="text-2xl font-bold">
              지금 vs 개선 후 — 수업 블록 비교
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BEFORE */}
            <div className="rounded-xl border border-red-400/30 bg-red-400/[0.04] p-6 space-y-4">
              <div className="text-xs uppercase tracking-wider text-red-300 font-semibold">
                현재 (Before)
              </div>
              <div className="flex justify-center py-6 bg-zinc-950/40 rounded-lg">
                <MiniSessionBlock variant="before" />
              </div>
              <ul className="text-xs text-red-100/80 space-y-1 list-disc ml-5">
                <li>
                  시간 <strong>HH:MM:SS</strong> 초까지 표시 (학원 시간표에 초 무의미)
                </li>
                <li>
                  학생 이름 <strong>"김영수"</strong> 블록 안에 표시 (헤더에
                  이미 "영수" 보임 — 중복)
                </li>
                <li>
                  오른쪽 위 <strong>사람 숫자 chip "3"</strong> (필터된 학생
                  본인은 알 필요 없음)
                </li>
                <li>
                  마우스 hover 시 <strong>cursor: grab</strong> 손모양 (편집
                  못하는데 잡으려는 듯 보임 — misleading)
                </li>
              </ul>
            </div>

            {/* AFTER */}
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-6 space-y-4">
              <div className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                개선 (After)
              </div>
              <div className="flex justify-center py-6 bg-zinc-950/40 rounded-lg">
                <MiniSessionBlock variant="after" />
              </div>
              <ul className="text-xs text-emerald-100/90 space-y-1 list-disc ml-5">
                <li>
                  시간 <strong>HH:MM</strong> 만 표시 (09:00-10:00) — 가독성 ↑
                </li>
                <li>
                  학생 이름 제거 — 헤더 "영수"로 충분
                </li>
                <li>
                  사람 숫자 chip 제거 — 정보 노이즈 ↓
                </li>
                <li>
                  cursor 일반 (default) — 편집 권한 없음 명확
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ──────────────── SECTION 2: UX 4 변경 상세 ──────────────── */}
        <section id="ux" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className={SECTION_TITLE_CHIP}>② UX 4 변경 상세</div>
            <h2 className="text-2xl font-bold">
              각각 어디 코드 손대고, 왜 안전한가
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* UX-1 */}
            <div className={CARD}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-medium">
                  UX-1
                </span>
                <h3 className="text-base font-semibold">
                  시간 표시 HH:MM:SS → HH:MM
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-mono">
                <div className="bg-red-400/10 border border-red-400/30 rounded p-2 text-red-200">
                  09:00:00-10:00:00
                </div>
                <div className="bg-emerald-400/10 border border-emerald-400/30 rounded p-2 text-emerald-200">
                  09:00-10:00
                </div>
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <p>
                  <strong className="text-zinc-200">위치:</strong>{" "}
                  <code className="text-amber-300">SessionBlock.tsx</code> 시간
                  포맷 함수
                </p>
                <p>
                  <strong className="text-zinc-200">변경:</strong>{" "}
                  <code>startsAt.slice(0, 5)</code> 같은 substring 또는 dayjs
                  format
                </p>
                <p>
                  <strong className="text-zinc-200">안전:</strong> 표시만 바뀜.
                  내부 데이터 (HH:MM:SS) 그대로
                </p>
              </div>
            </div>

            {/* UX-2 */}
            <div className={CARD}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-medium">
                  UX-2
                </span>
                <h3 className="text-base font-semibold">
                  블록 내 학생 이름 제거 (share-only)
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-red-400/10 border border-red-400/30 rounded p-2 text-red-200">
                  <div className="font-semibold">수학</div>
                  <div className="opacity-70">김영수</div>
                </div>
                <div className="bg-emerald-400/10 border border-emerald-400/30 rounded p-2 text-emerald-200">
                  <div className="font-semibold">수학</div>
                  <div className="opacity-50 italic text-[9px]">(제거)</div>
                </div>
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <p>
                  <strong className="text-zinc-200">위치:</strong>{" "}
                  <code className="text-amber-300">SessionBlock.tsx</code> 또는{" "}
                  <code>TimeTableGrid.tsx</code>
                </p>
                <p>
                  <strong className="text-zinc-200">변경:</strong>{" "}
                  <code>isReadOnly</code> prop 활용 → readOnly면 학생 이름 렌더
                  안 함
                </p>
                <p>
                  <strong className="text-zinc-200">안전:</strong> owner schedule 화면은
                  <code> isReadOnly=false</code> 라 영향 X
                </p>
              </div>
            </div>

            {/* UX-3 */}
            <div className={CARD}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-medium">
                  UX-3
                </span>
                <h3 className="text-base font-semibold">
                  사람 숫자 chip 제거 (share-only)
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-center">
                <div className="bg-red-400/10 border border-red-400/30 rounded p-2 text-red-200">
                  <span className="inline-flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded-full text-[10px]">
                    👥 3
                  </span>
                </div>
                <div className="bg-emerald-400/10 border border-emerald-400/30 rounded p-2 text-emerald-200 italic">
                  (제거)
                </div>
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <p>
                  <strong className="text-zinc-200">위치:</strong>{" "}
                  <code className="text-amber-300">SessionBlock.tsx</code> 학생
                  수 chip 렌더 부분
                </p>
                <p>
                  <strong className="text-zinc-200">변경:</strong>{" "}
                  <code>isReadOnly</code> 조건부 렌더
                </p>
                <p>
                  <strong className="text-zinc-200">안전:</strong> owner 화면엔
                  여전히 필요 — same prop 활용
                </p>
              </div>
            </div>

            {/* UX-4 */}
            <div className={CARD}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-medium">
                  UX-4
                </span>
                <h3 className="text-base font-semibold">
                  cursor: grab 제거 (share-only)
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-center font-mono">
                <div className="bg-red-400/10 border border-red-400/30 rounded p-2 text-red-200 cursor-grab">
                  cursor: grab
                </div>
                <div className="bg-emerald-400/10 border border-emerald-400/30 rounded p-2 text-emerald-200">
                  cursor: default
                </div>
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <p>
                  <strong className="text-zinc-200">위치:</strong>{" "}
                  <code className="text-amber-300">SessionBlock.tsx</code>{" "}
                  className/style 부분
                </p>
                <p>
                  <strong className="text-zinc-200">변경:</strong>{" "}
                  <code>{`isReadOnly ? "cursor-default" : "cursor-grab"`}</code>
                </p>
                <p>
                  <strong className="text-zinc-200">안전:</strong> drag handler도{" "}
                  <code>isReadOnly</code> check 하니까 동작 변경 X
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-5 text-sm text-emerald-100">
            <div className="font-bold text-emerald-300 mb-2">
              💡 4가지 모두 같은 패턴 — <code>isReadOnly</code> prop 활용
            </div>
            <p>
              현재 SessionBlock은 이미{" "}
              <code className="px-1.5 py-0.5 rounded bg-zinc-900 text-amber-300 text-xs">
                isReadOnly
              </code>{" "}
              prop을 받고 있음 (share 페이지에서{" "}
              <code className="text-amber-300">isReadOnly=true</code>로 전달).
              다만 cursor와 부가 정보 표시는 그 prop 활용 못 하고 있어서 visual
              만 새로 적용. 그래서 <strong>코드 변경 양이 작음 (~20줄)</strong>.
            </p>
            <p className="mt-2 text-emerald-200/80">
              테스트 영향: SessionBlock unit test 1-2 case 추가{" "}
              <code>isReadOnly</code> 모드 시 학생 이름/chip/cursor 없음 검증.
            </p>
          </div>
        </section>

        {/* ──────────────── SECTION 3: 트래픽 권고 시각 ──────────────── */}
        <section id="traffic" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className={SECTION_TITLE_CHIP}>③ 트래픽 3 권고</div>
            <h2 className="text-2xl font-bold">
              서버 부담 줄이는 안전망 3가지
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              지금 share 페이지는 <strong>30초마다</strong> 서버에 "데이터
              변경됐어?" 묻고 있어요 (변경 알림 배너 띄우려고). 사용자가 페이지
              열어두는 동안 계속.
            </p>
          </div>

          {/* TRAFFIC-1: Polling 30s → 60s */}
          <div className={CARD}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-medium">
                T-1
              </span>
              <h3 className="text-lg font-semibold">
                Polling 간격 30초 → 60초
              </h3>
            </div>

            <div className="space-y-4 pt-2">
              <PollingTimeline
                interval={30}
                label="현재: 30초마다"
                color="text-red-400"
              />
              <PollingTimeline
                interval={60}
                label="개선: 60초마다"
                color="text-emerald-400"
              />
            </div>

            <div className="text-xs text-zinc-400 leading-relaxed pt-2">
              <p>
                <strong className="text-zinc-200">효과:</strong> 서버 부담{" "}
                <strong className="text-emerald-300">정확히 1/2로</strong>. 학원
                학생 30명이 1시간 페이지 열어둘 때:
              </p>
              <pre className={CODE_BLOCK + " mt-2"}>
                <span className="text-red-300">현재:</span>{" "}
                30명 × 120 req/hr = <strong>3,600 req/hr</strong>
                {"\n"}
                <span className="text-emerald-300">개선:</span>{" "}
                30명 × 60 req/hr ={"  "}
                <strong>1,800 req/hr</strong>
              </pre>
              <p className="mt-2">
                <strong className="text-zinc-200">trade-off:</strong> 학원 운영자가
                시간표 변경하면 학생에게 알림이 30초 더 늦게 도착. 학원 환경엔
                무시 가능한 지연 (실시간 채팅 아님).
              </p>
              <p>
                <strong className="text-zinc-200">변경 위치:</strong>{" "}
                <code className="text-amber-300">
                  src/app/share/[token]/page.tsx:15
                </code>{" "}
                상수 하나
              </p>
            </div>
          </div>

          {/* TRAFFIC-2: Page Visibility API */}
          <div className={CARD}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-medium">
                T-2
              </span>
              <h3 className="text-lg font-semibold">
                비활성 tab 시 polling 정지 (Page Visibility API)
              </h3>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              학부모가 brower tab에 share 페이지 열어두고 다른 작업하면, 그 tab은{" "}
              <strong className="text-zinc-100">"숨겨진 상태"</strong>(hidden).
              그래도 setInterval은 계속 발사 → 사용자가 보지도 않는 데이터 갱신
              위해 서버에 request 보냄. 낭비.
            </p>

            {/* 시각화 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-red-400/30 bg-red-400/[0.04] p-4 space-y-2">
                <div className="font-semibold text-red-200">😴 현재 — 8시간 자도 polling 계속</div>
                <div className="font-mono text-[10px] text-red-100/80 leading-relaxed bg-zinc-950/40 p-2 rounded">
                  [09:00] tab 열고 다른 일 시작
                  <br />
                  [09:00:30] 폴 ✓ <span className="opacity-50">(사용자 안 봄)</span>
                  <br />
                  [09:01:00] 폴 ✓ <span className="opacity-50">(사용자 안 봄)</span>
                  <br />
                  [09:01:30] 폴 ✓ <span className="opacity-50">(사용자 안 봄)</span>
                  <br />
                  ...
                  <br />
                  [17:00] 8시간 후 = <strong>960회 낭비</strong>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.04] p-4 space-y-2">
                <div className="font-semibold text-emerald-200">😎 개선 — 잠든 사람 안 깨움</div>
                <div className="font-mono text-[10px] text-emerald-100/80 leading-relaxed bg-zinc-950/40 p-2 rounded">
                  [09:00] tab 열고 보기 → 폴 ✓
                  <br />
                  [09:00:30] tab 안 봄 → polling stop
                  <br />
                  [13:00] tab 다시 봄 → 즉시 1회 fetch + polling resume
                  <br />
                  [13:01] 폴 ✓
                  <br />
                  ...
                  <br />
                  [17:00] = <strong>~30회만 (보는 시간만)</strong>
                </div>
              </div>
            </div>

            <pre className={CODE_BLOCK}>
              <span className="text-zinc-500">// share/[token]/page.tsx useEffect</span>
              {"\n"}
              <span className="text-blue-300">const</span> handleVisibility ={" "}
              () =&gt; &#123;
              {"\n"}
              {"  "}
              <span className="text-blue-300">if</span> (document.hidden) &#123;
              {"\n"}
              {"    "}<span className="text-zinc-500">// tab 숨김 → polling stop</span>
              {"\n"}
              {"    "}<span className="text-blue-300">if</span> (pollerRef.current) clearInterval(pollerRef.current);
              {"\n"}
              {"  "}&#125;{" "}<span className="text-blue-300">else</span> &#123;
              {"\n"}
              {"    "}<span className="text-zinc-500">// tab 보임 → 즉시 fetch + polling resume</span>
              {"\n"}
              {"    "}fetchData(<span className="text-blue-300">true</span>);
              {"\n"}
              {"    "}pollerRef.current = setInterval(() =&gt; fetchData(<span className="text-blue-300">true</span>), POLL_INTERVAL_MS);
              {"\n"}
              {"  "}&#125;
              {"\n"}
              &#125;;
              {"\n"}document.addEventListener(<span className="text-emerald-300">'visibilitychange'</span>, handleVisibility);
            </pre>

            <div className="text-xs text-zinc-400 leading-relaxed">
              <p>
                <strong className="text-zinc-200">효과:</strong> 8시간 백그라운드 tab의 960회 →{" "}
                <strong className="text-emerald-300">실제 보는 시간만</strong>. 평균 90% 절감.
              </p>
              <p>
                <strong className="text-zinc-200">표준 web API:</strong> Page Visibility
                API는 모든 모던 브라우저 지원 (IE10+). 안정.
              </p>
              <p>
                <strong className="text-zinc-200">변경 위치:</strong>{" "}
                <code className="text-amber-300">
                  src/app/share/[token]/page.tsx
                </code>{" "}
                useEffect ~10줄 추가
              </p>
            </div>
          </div>

          {/* TRAFFIC-3: Monthly view 제거 (선택) */}
          <div className={CARD}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-medium">
                T-3 · 선택
              </span>
              <h3 className="text-lg font-semibold">
                월별 view 제거 — 가장 무거운 쿼리 차단
              </h3>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              일별/주간은 1주 데이터만 fetch. 월별은 캘린더에 보이는 5~6주 전부
              fetch — 같은 DB query인데{" "}
              <strong className="text-amber-200">5~6배 데이터</strong>.
            </p>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded border border-white/10 bg-zinc-900/40 p-3">
                <div className="text-zinc-400 mb-1">일별</div>
                <div className="text-emerald-300 font-mono">1주 × 1 query</div>
              </div>
              <div className="rounded border border-white/10 bg-zinc-900/40 p-3">
                <div className="text-zinc-400 mb-1">주간</div>
                <div className="text-emerald-300 font-mono">1주 × 1 query</div>
              </div>
              <div className="rounded border border-amber-400/30 bg-amber-400/[0.05] p-3">
                <div className="text-amber-200 mb-1">월별 ⚠</div>
                <div className="text-amber-300 font-mono">
                  6주 × 1 query
                </div>
                <div className="text-[9px] text-amber-200/70 mt-1">
                  데이터 양 6배
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
                <div className="text-emerald-300 font-semibold mb-1">+ 제거 시 좋은 점</div>
                <ul className="text-emerald-100/80 space-y-0.5 list-disc ml-4">
                  <li>가장 무거운 쿼리 차단</li>
                  <li>SegmentedButton 옵션 2개로 더 단순</li>
                  <li>코드 ~30줄 사라짐 (ScheduleMonthlyView import 등)</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3">
                <div className="text-amber-300 font-semibold mb-1">– 잃는 것</div>
                <ul className="text-amber-100/80 space-y-0.5 list-disc ml-4">
                  <li>학생이 "이번 달 일정 한눈에" 보고 싶을 때 대안 X</li>
                  <li>주간 view에서 매주 클릭해 이동해야 함</li>
                  <li>학원 일정이 자주 바뀌면 monthly 유용성 ↑</li>
                </ul>
              </div>
            </div>

            <div className="text-xs text-zinc-500 leading-relaxed">
              <strong className="text-zinc-300">판단 기준:</strong> 학생이
              월별로 보는 빈도가 높으면 유지. 거의 안 쓰면 제거. UAT에서 사용
              패턴 본 후 결정해도 늦지 않음 — 일단 유지 가능.
            </div>
          </div>
        </section>

        {/* ──────────────── SECTION 4: 3 scope 옵션 ──────────────── */}
        <section id="scope" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className={SECTION_TITLE_CHIP}>④ 3 scope 옵션</div>
            <h2 className="text-2xl font-bold">
              어느 범위로 묶어 PR 진행?
            </h2>
          </div>

          {/* OPTION A — Recommended */}
          <div className={CARD + " border-amber-400/40"}>
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-medium border border-amber-400/40">
                ★ 추천
              </span>
              <h3 className="text-lg font-semibold">
                A — UX 1~4 + 트래픽 T-1 + T-2 (월별 유지)
              </h3>
              <span className="text-xs text-zinc-500 font-mono">~30분</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-emerald-300 font-semibold mb-1">포함</div>
                <ul className="text-zinc-200 space-y-0.5 ml-4 list-disc">
                  <li>시간 HH:MM:SS → HH:MM</li>
                  <li>학생 이름 제거 (share-only)</li>
                  <li>사람 chip 제거</li>
                  <li>cursor grab 제거</li>
                  <li>Polling 60s</li>
                  <li>Page Visibility tab stop</li>
                </ul>
              </div>
              <div>
                <div className="text-amber-300 font-semibold mb-1">제외</div>
                <ul className="text-zinc-200 space-y-0.5 ml-4 list-disc">
                  <li>월별 view (유지 — 학생 이동 의도 보존)</li>
                </ul>
              </div>
            </div>

            <div className="text-xs text-zinc-400 leading-relaxed pt-2 border-t border-white/5">
              <strong className="text-zinc-200">왜 이게 추천?</strong>{" "}
              사용자 불편(UX 4) 모두 해결 + 서버 부담 명백히 줄임 (T-1, T-2). 월별은
              UAT/실사용에서 정말 안 쓰는지 본 후 다음 PR에서 결정해도 늦지 않음.
              데이터에 기반한 결정 우선.
            </div>
          </div>

          {/* OPTION B */}
          <div className={CARD}>
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 font-medium">
                B
              </span>
              <h3 className="text-lg font-semibold">
                B — A + 월별 view 제거 (전체)
              </h3>
              <span className="text-xs text-zinc-500 font-mono">~40분</span>
            </div>

            <div className="text-xs text-zinc-300">
              UX 4 + 트래픽 3 모두 적용. 가장 단순 + 가장 적은 트래픽. 다만 학생이
              월별 view 원할 경우 대안 없음.
            </div>

            <div className="text-xs text-zinc-400 leading-relaxed">
              <strong className="text-zinc-200">언제 선택?</strong> 학원 일정 거의
              안 바뀌고, 학생이 "이번 주" 정도만 보면 충분하다고 판단할 때. 또는
              초기 트래픽 절감이 더 중요할 때.
            </div>
          </div>

          {/* OPTION C */}
          <div className={CARD}>
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 font-medium">
                C
              </span>
              <h3 className="text-lg font-semibold">
                C — UX 4만 (트래픽 권고 다음 PR)
              </h3>
              <span className="text-xs text-zinc-500 font-mono">~20분</span>
            </div>

            <div className="text-xs text-zinc-300">
              사용자 불편만 우선 해결. 트래픽 권고는 별도 PR로. 사용자 증가
              시점에 재검토.
            </div>

            <div className="text-xs text-zinc-400 leading-relaxed">
              <strong className="text-zinc-200">언제 선택?</strong> 지금은 1-2명
              테스트 단계라 트래픽 문제 거의 없음. 우선순위 = UX 개선 즉시
              사용자에게 보이는 변화 + UAT 진행. 트래픽은 production 사용자 늘
              때 처리.
            </div>
          </div>
        </section>

        {/* ──────────────── SECTION 5: 추천 결정 ──────────────── */}
        <section id="decision" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className={SECTION_TITLE_CHIP}>⑤ 추천 결정</div>
            <h2 className="text-2xl font-bold">
              지금 단계엔 옵션 A
            </h2>
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.06] p-6 space-y-3">
            <div className="text-sm text-amber-100 leading-relaxed">
              <p>
                <strong className="text-amber-50">이유 1.</strong> UX 4는 명백히
                노이즈 — 사용자가 이미 불편 보고함. 즉시 해결.
              </p>
              <p className="mt-2">
                <strong className="text-amber-50">이유 2.</strong> Polling 60s + Page
                Visibility는 코드 ~15줄. 부담 작고 효과 큼 (백그라운드 8시간 case
                90% 절감).
              </p>
              <p className="mt-2">
                <strong className="text-amber-50">이유 3.</strong> 월별 view 제거는
                돌이키기 어려움 (학생이 익숙해진 후 제거하면 불만). UAT에서 실제
                사용 패턴 본 후 다음 PR.
              </p>
            </div>
          </div>

          <div className="text-sm text-zinc-400 text-center pt-3">
            옵션 A로 GO하면 그대로 implementation. 다른 옵션이면 자유 응답.
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-white/10 space-y-2 text-xs text-zinc-500">
          <p>
            이 페이지는 mockup입니다. 실제 코드 변경은 없습니다.{" "}
            <Link
              href="/design-explorations"
              className="text-amber-300 hover:text-amber-200 underline"
            >
              ← 다른 design-explorations
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
