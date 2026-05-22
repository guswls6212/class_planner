"use client";

import Link from "next/link";

const CODE_HEADER =
  "flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-medium";
const CODE_BLOCK =
  "block rounded-lg border border-white/10 bg-zinc-950/70 p-4 text-xs font-mono text-zinc-100 whitespace-pre overflow-x-auto leading-6";
const ANALOGY_BOX =
  "rounded-xl border border-amber-400/30 bg-amber-400/[0.05] p-5 text-sm text-amber-100 leading-relaxed";
const CARD =
  "rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-3";

export default function PlaywrightE2EExplained() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Back link */}
        <div className="text-sm">
          <Link
            href="/design-explorations/share-url-and-expiry"
            className="text-amber-300 hover:text-amber-200"
          >
            ← share-url-and-expiry 메인으로
          </Link>
        </div>

        {/* HEADER */}
        <header className="space-y-4">
          <div className="text-xs uppercase tracking-widest text-amber-400/80 font-medium">
            Deep Dive · Playwright e2e
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Playwright e2e — share-link-only flow 자동 검증
          </h1>
          <p className="text-base text-zinc-300 leading-relaxed">
            매번 손으로 "초대 페이지 → 링크만 받기 → URL 확인 → 복사 → 404
            여부"를 검증하는 대신, 한 번 코드로 작성해서 모든 PR에서 자동
            실행하기. 무엇이고, 어떻게 작성하고, 왜 1시간 들이는 가치가 있는지.
          </p>
        </header>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 1 — Playwright가 뭐냐 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ① Playwright가 뭔지
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-zinc-100">"브라우저를 코드로 조작하는
            도구."</strong>{" "}
            마치 사람이 마우스로 클릭하고 키보드로 타이핑하는 것을 JavaScript
            코드로 적어 둠. Microsoft가 만들었고 Chrome, Firefox, Safari 다
            지원.
          </p>

          <div className={ANALOGY_BOX}>
            <div className="font-bold text-amber-300 mb-2">
              🤖 자동 인형 비유
            </div>
            <p>
              매일 같은 작업을 반복해서 검증해야 한다고 상상해보세요. "이 페이지
              열고 → 이 버튼 누르고 → 결과 보고..." 이걸 10번, 100번 반복하면
              지침. 같은 동작을 하는{" "}
              <strong className="text-amber-200">자동 인형</strong>을 만들어 두면
              본인은 다른 일 함 — 인형이 본인 대신 클릭하고 본인은 결과만 확인.
            </p>
            <p className="mt-2">
              Playwright = 그 자동 인형. 한 번 어떤 동작을 할지 정의하면 무한
              반복 가능.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={CARD}>
              <div className="text-emerald-300 text-xs uppercase tracking-wider font-medium">
                + 무엇이 좋나
              </div>
              <ul className="text-sm text-zinc-200 space-y-1 list-disc ml-4">
                <li>본인이 매번 손 안 거쳐도 됨</li>
                <li>매 PR에서 자동 실행 (CI 통합)</li>
                <li>실수로 누락하는 시나리오 없음</li>
                <li>실패 시 비디오/스크린샷 자동 캡처</li>
              </ul>
            </div>
            <div className={CARD}>
              <div className="text-amber-300 text-xs uppercase tracking-wider font-medium">
                – 무엇이 비싼가
              </div>
              <ul className="text-sm text-zinc-200 space-y-1 list-disc ml-4">
                <li>초기 셋업 시간 (helper 만들기 등)</li>
                <li>CI 실행 시간 1-2분 추가</li>
                <li>UI 변경 시 selector 수정 필요</li>
                <li>flaky risk (8 원칙 위반 시)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — e2e란 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ② e2e란 — 테스트 피라미드
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            테스트 종류는 크게 3가지 층으로 나눠요. 위로 갈수록 더 진짜 사용자
            관점에 가까워지지만, 더 느리고 비쌈.
          </p>

          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-20 text-xs uppercase tracking-wider text-emerald-300 font-medium">
                  Unit
                </div>
                <div className="flex-1 h-8 bg-emerald-400/20 rounded flex items-center px-3 text-xs text-emerald-100">
                  함수 1개 검증 — 빠름, 많이 작성 (수백~수천 개)
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 text-xs uppercase tracking-wider text-blue-300 font-medium">
                  Integration
                </div>
                <div className="flex-1 ml-8 h-8 bg-blue-400/20 rounded flex items-center px-3 text-xs text-blue-100">
                  모듈 끼리 — 보통 빠름, 중간 정도 작성 (수십~수백)
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 text-xs uppercase tracking-wider text-amber-300 font-medium">
                  E2E
                </div>
                <div className="flex-1 ml-16 h-8 bg-amber-400/20 rounded flex items-center px-3 text-xs text-amber-100">
                  브라우저 전체 흐름 — 느림, 핵심 시나리오만 (수~수십)
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5 text-xs text-zinc-400 leading-relaxed">
              <strong className="text-zinc-200">E2E (end-to-end)</strong> = 사용자
              관점의 전체 시나리오 검증. 브라우저 클릭부터 DB 저장까지 진짜
              경로로 동작. "share-link-only flow"는 사용자가 화면에서 직접
              경험하는 흐름이라 e2e가 적합.
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 3 — 실제 spec 코드 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ③ share-link-only flow를 e2e로
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            실제로 작성할 spec 파일. 한 줄씩 한국어 주석으로.
          </p>

          <div>
            <div className={CODE_HEADER}>
              <span>
                새 파일 ·{" "}
                <code className="normal-case">
                  tests/e2e/share-link-only.spec.ts
                </code>
              </span>
              <span className="text-emerald-400/80">~90줄</span>
            </div>
            <pre className={CODE_BLOCK + " text-[11px]"}>
              <span className="text-blue-300">import</span>{" "}
              &#123; test, expect &#125;{" "}
              <span className="text-blue-300">from</span>{" "}
              <span className="text-emerald-300">'@playwright/test'</span>;
              {"\n"}
              <span className="text-blue-300">import</span>{" "}
              &#123; seedInvite, cleanupInvite &#125;{" "}
              <span className="text-blue-300">from</span>{" "}
              <span className="text-emerald-300">'./helpers/invite-seed'</span>;
              {"\n\n"}
              test.describe(
              <span className="text-emerald-300">'invite share-link-only'</span>,{" "}
              () =&gt; &#123;
              {"\n"}
              {"  "}
              <span className="text-blue-300">let</span> inviteToken:{" "}
              <span className="text-blue-300">string</span>;
              {"\n\n"}
              {"  "}
              <span className="text-zinc-500">
                {"// 매 test 시작 전: 고유한 fresh invite 생성"}
              </span>
              {"\n"}
              {"  "}test.beforeEach(<span className="text-blue-300">async</span>{" "}
              (&#123; request &#125;) =&gt; &#123;
              {"\n"}
              {"    "}inviteToken ={" "}
              <span className="text-blue-300">await</span> seedInvite(request, &#123;
              {"\n"}
              {"      "}academyName:{" "}
              <span className="text-emerald-300">{"`"}Test $&#123;Date.now()&#125;{"`"}</span>
              ,{" "}
              <span className="text-zinc-500">{"// 고유 데이터 (8원칙 #3)"}</span>
              {"\n"}
              {"      "}role:{" "}
              <span className="text-emerald-300">'member'</span>,
              {"\n"}
              {"      "}expiresInHours:{" "}
              <span className="text-amber-300">24</span>,
              {"\n"}
              {"    "}&#125;);
              {"\n"}
              {"  "}&#125;);
              {"\n\n"}
              {"  "}
              <span className="text-zinc-500">
                {"// 매 test 끝난 후: 격리 정리 (8원칙 #2)"}
              </span>
              {"\n"}
              {"  "}test.afterEach(<span className="text-blue-300">async</span>{" "}
              (&#123; request &#125;) =&gt; &#123;
              {"\n"}
              {"    "}<span className="text-blue-300">await</span>{" "}
              cleanupInvite(request, inviteToken);
              {"\n"}
              {"  "}&#125;);
              {"\n\n"}
              {"  "}test(
              <span className="text-emerald-300">
                '비로그인 사용자가 share URL을 받을 수 있다'
              </span>
              , <span className="text-blue-300">async</span> (&#123; page &#125;) =&gt; &#123;
              {"\n"}
              {"    "}
              <span className="text-zinc-500">{"// 1. invite 페이지 방문"}</span>
              {"\n"}
              {"    "}<span className="text-blue-300">await</span>{" "}
              page.goto(
              <span className="text-emerald-300">{"`/invite/$&#123;inviteToken&#125;`"}</span>
              );
              {"\n\n"}
              {"    "}
              <span className="text-zinc-500">
                {"// 2. 안정 selector — getByRole (CSS 의존 X, 8원칙 #4)"}
              </span>
              {"\n"}
              {"    "}<span className="text-blue-300">await</span>{" "}
              page.getByRole(
              <span className="text-emerald-300">'button'</span>, &#123;
              {"\n"}
              {"      "}name: /시간표 보기 링크만 받기/,
              {"\n"}
              {"    "}&#125;).click();
              {"\n\n"}
              {"    "}
              <span className="text-zinc-500">
                {"// 3. share URL 박스가 보이는지 (명시적 wait, 8원칙 #1)"}
              </span>
              {"\n"}
              {"    "}
              <span className="text-blue-300">const</span> shareUrlBox =
              page.getByText(/http.*\/share\//);
              {"\n"}
              {"    "}<span className="text-blue-300">await</span> expect(
              shareUrlBox).toBeVisible(&#123; timeout:{" "}
              <span className="text-amber-300">5000</span> &#125;);
              {"\n\n"}
              {"    "}
              <span className="text-zinc-500">
                {"// 4. ★ KEY 검증 — 옵션 B fix가 잘 됐는지"}
              </span>
              {"\n"}
              {"    "}<span className="text-blue-300">const</span> url ={" "}
              <span className="text-blue-300">await</span> shareUrlBox.textContent();
              {"\n"}
              {"    "}
              <span className="text-blue-300">const</span> currentOrigin ={" "}
              <span className="text-blue-300">new</span> URL(page.url()).origin;
              {"\n"}
              {"    "}expect(url).toContain(currentOrigin);{" "}
              <span className="text-zinc-500">{"// localhost면 localhost"}</span>
              {"\n"}
              {"    "}expect(url).<span className="text-blue-300">not</span>
              .toContain(
              <span className="text-emerald-300">'info365.studio'</span>);{" "}
              <span className="text-zinc-500">{"// production X"}</span>
              {"\n\n"}
              {"    "}
              <span className="text-zinc-500">{"// 5. 복사 버튼 동작 검증"}</span>
              {"\n"}
              {"    "}<span className="text-blue-300">await</span>{" "}
              page.getByRole(
              <span className="text-emerald-300">'button'</span>, &#123;
              name:{" "}
              <span className="text-emerald-300">'링크 복사'</span> &#125;
              ).click();
              {"\n"}
              {"    "}<span className="text-blue-300">await</span> expect(
              {"\n"}
              {"      "}page.getByText(
              <span className="text-emerald-300">'✓ 복사됨'</span>)
              {"\n"}
              {"    "}).toBeVisible();
              {"\n\n"}
              {"    "}
              <span className="text-zinc-500">
                {"// 6. 그 URL이 실제로 404 안 나는지 (e2e의 진짜 가치)"}
              </span>
              {"\n"}
              {"    "}
              <span className="text-blue-300">const</span> sharePage ={" "}
              <span className="text-blue-300">await</span>{" "}
              page.context().newPage();
              {"\n"}
              {"    "}<span className="text-blue-300">await</span>{" "}
              sharePage.goto(url!);
              {"\n"}
              {"    "}<span className="text-blue-300">await</span> expect(
              {"\n"}
              {"      "}sharePage.getByTestId(
              <span className="text-emerald-300">'share-content'</span>)
              {"\n"}
              {"    "}).toBeVisible();
              {"\n"}
              {"  "}&#125;);
              {"\n\n"}
              {"  "}test(
              <span className="text-emerald-300">
                '만료된 invite는 안내 페이지로 간다'
              </span>
              , <span className="text-blue-300">async</span> (&#123; page,
              request &#125;) =&gt; &#123;
              {"\n"}
              {"    "}
              <span className="text-blue-300">const</span> expiredToken ={" "}
              <span className="text-blue-300">await</span> seedInvite(request, &#123;
              {"\n"}
              {"      "}expiresInHours:{" "}
              <span className="text-amber-300">-1</span>,{" "}
              <span className="text-zinc-500">{"// 이미 만료"}</span>
              {"\n"}
              {"    "}&#125;);
              {"\n"}
              {"    "}<span className="text-blue-300">await</span>{" "}
              page.goto(
              <span className="text-emerald-300">{"`/invite/$&#123;expiredToken&#125;`"}</span>
              );
              {"\n"}
              {"    "}<span className="text-blue-300">await</span> expect(
              {"\n"}
              {"      "}page.getByText(
              <span className="text-emerald-300">'만료된 초대 링크'</span>)
              {"\n"}
              {"    "}).toBeVisible();
              {"\n"}
              {"  "}&#125;);
              {"\n"}
              &#125;);
            </pre>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-5 space-y-2 text-sm">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              💡 위 코드 핵심 포인트
            </div>
            <ul className="text-zinc-300 space-y-1 list-disc ml-5">
              <li>
                <strong className="text-zinc-100">beforeEach/afterEach</strong>로
                매 test마다 격리 — test 순서 무관하게 동작
              </li>
              <li>
                <code className="text-amber-300">Date.now()</code>로 고유한
                academy 이름 → test 충돌 없음
              </li>
              <li>
                <code className="text-amber-300">getByRole</code> 사용 — CSS
                클래스 바뀌어도 깨지지 않음
              </li>
              <li>
                <strong className="text-zinc-100">step 4가 옵션 B fix 검증의 핵심</strong>{" "}
                — URL이 현재 origin과 일치, info365 안 포함
              </li>
              <li>
                step 6에서 그 URL이 실제로 404 안 나는지 끝까지 따라감 — e2e만이
                할 수 있는 검증
              </li>
            </ul>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 4 — 회귀 가드 가치 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ④ "회귀 가드"가 뭐고 왜 가치 있나
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-zinc-100">회귀 (regression)</strong> = 한 번
            고친 버그가 미래의 다른 변경으로 다시 깨지는 현상.{" "}
            <strong className="text-zinc-100">가드 (guard)</strong> = 자동으로
            막아주는 장치.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-red-400/30 bg-red-400/[0.04] p-5 space-y-2">
              <div className="font-semibold text-red-200">
                😱 e2e 없을 때 일어날 일
              </div>
              <ol className="text-sm text-red-100/90 ml-5 list-decimal space-y-1.5">
                <li>오늘 옵션 B 적용 → URL fix 완료</li>
                <li>2주 후 다른 PR에서 다른 개발자가 route.ts 다시 만짐</li>
                <li>
                  실수로{" "}
                  <code className="text-red-200">
                    shareUrl: `${"${appUrl}"}/share/...`
                  </code>{" "}
                  부활
                </li>
                <li>로컬 테스트 — 그 개발자는 share-link flow 안 봄</li>
                <li>PR 머지 → production 배포</li>
                <li>
                  사용자가 또{" "}
                  <strong className="text-red-200">"링크가 이상해요"</strong>{" "}
                  보고
                </li>
                <li>같은 버그를 또 추적/수정</li>
              </ol>
            </div>

            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-5 space-y-2">
              <div className="font-semibold text-emerald-200">
                😎 e2e 있을 때
              </div>
              <ol className="text-sm text-emerald-100/90 ml-5 list-decimal space-y-1.5">
                <li>오늘 옵션 B 적용 → URL fix + e2e spec 추가</li>
                <li>2주 후 다른 개발자가 route.ts 다시 만짐</li>
                <li>실수로 server URL build 부활</li>
                <li>
                  CI에서{" "}
                  <code className="text-emerald-200">
                    share-link-only.spec.ts
                  </code>{" "}
                  자동 실행
                </li>
                <li>
                  <strong className="text-emerald-200">
                    ✗ step 4 assertion fail
                  </strong>{" "}
                  ("URL이 info365 포함")
                </li>
                <li>PR 머지 자동 차단 + 비디오/스크린샷 자동 캡처</li>
                <li>개발자가 즉시 알아채고 수정</li>
              </ol>
            </div>
          </div>

          <div className={ANALOGY_BOX}>
            <div className="font-bold text-amber-300 mb-2">
              🛡️ 보이지 않는 안전망 비유
            </div>
            <p>
              곡예사가 줄타기 할 때 밑에 안전망 깔아 두는 것과 같음. 평소엔
              아무도 의식 안 함 (떨어질 일 없으면 안전망 의식 X). 한 번이라도
              떨어졌을 때 큰 사고가 안 남.
            </p>
            <p className="mt-2">
              e2e는{" "}
              <strong className="text-amber-200">"한 번이라도"</strong>를 위한
              투자. 평소엔 안 보이지만 한 번 회귀 막으면 manual debug 시간 +
              사용자 사고 + 신뢰 손실 모두 절약.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 5 — 비용 1시간 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ⑤ 왜 1시간인가 — 시간 분해
          </h2>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="text-left p-3 font-medium">작업</th>
                  <th className="text-left p-3 font-medium">시간</th>
                  <th className="text-left p-3 font-medium">한 번? 매번?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="p-3">
                    <code className="text-amber-300">
                      tests/e2e/helpers/invite-seed.ts
                    </code>{" "}
                    작성 (seedInvite, cleanupInvite)
                  </td>
                  <td className="p-3 text-zinc-200">20분</td>
                  <td className="p-3 text-emerald-300">한 번</td>
                </tr>
                <tr>
                  <td className="p-3">
                    <code className="text-amber-300">share-link-only.spec.ts</code>{" "}
                    작성 (2 test case)
                  </td>
                  <td className="p-3 text-zinc-200">25분</td>
                  <td className="p-3 text-emerald-300">한 번</td>
                </tr>
                <tr>
                  <td className="p-3">
                    share 페이지에{" "}
                    <code className="text-amber-300">data-testid="share-content"</code>{" "}
                    추가
                  </td>
                  <td className="p-3 text-zinc-200">5분</td>
                  <td className="p-3 text-emerald-300">한 번</td>
                </tr>
                <tr>
                  <td className="p-3">
                    로컬에서 <code>npx playwright test share-link</code>로 검증
                  </td>
                  <td className="p-3 text-zinc-200">10분</td>
                  <td className="p-3 text-emerald-300">한 번</td>
                </tr>
                <tr className="bg-amber-400/[0.04]">
                  <td className="p-3 font-medium">→ 총 셋업</td>
                  <td className="p-3 text-amber-300 font-bold">~1시간</td>
                  <td className="p-3 text-emerald-300 font-medium">
                    영원히 작동
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-zinc-400 text-xs">
                    매 PR마다 CI 실행
                  </td>
                  <td className="p-3 text-zinc-400 text-xs">
                    1-2분 (자동)
                  </td>
                  <td className="p-3 text-zinc-400 text-xs">매번</td>
                </tr>
                <tr>
                  <td className="p-3 text-zinc-400 text-xs">
                    UI 변경 시 selector 수정 (드물게)
                  </td>
                  <td className="p-3 text-zinc-400 text-xs">5분 (가끔)</td>
                  <td className="p-3 text-zinc-400 text-xs">가끔</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 6 — class-planner 8 원칙 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ⑥ class-planner의 flaky 8 원칙 (이미 셋업됨)
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            class-planner는 e2e flaky로 1주일 산발적 fail 경험 (memory의{" "}
            <code className="text-amber-300">
              feedback_e2e_flaky_root_cause_first
            </code>
            ). 그 후 PR #410으로 helper 통합 + 8 원칙 hook 자동 inject. spec 작성
            시 Claude/사용자에게 자동 가이드.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {[
              {
                num: "1",
                title: "명시적 대기",
                desc: "waitForTimeout 금지. expect.poll, waitForFunction 사용",
              },
              {
                num: "2",
                title: "테스트 격리",
                desc: "beforeEach 깨끗한 상태 + globalTeardown",
              },
              {
                num: "3",
                title: "고유 데이터",
                desc: "Date.now(), crypto.randomUUID() prefix",
              },
              {
                num: "4",
                title: "안정 selector",
                desc: "data-testid + getByRole. CSS class 의존 X",
              },
              {
                num: "5",
                title: "Retry 보수적",
                desc: "retries: CI ? 2 : 0",
              },
              {
                num: "6",
                title: "외부 의존성",
                desc: "seedAnonymous, injectRealSession, page.route 명시적 선택",
              },
              {
                num: "7",
                title: "애니메이션",
                desc: "opacity transition 후 visible 가정 X",
              },
              {
                num: "8",
                title: "비동기 await",
                desc: "CUD await 의무 (ADR-012). fire-and-forget은 void prefix",
              },
            ].map((p) => (
              <div
                key={p.num}
                className="rounded border border-white/10 bg-zinc-900/40 p-3 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  {p.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-100">{p.title}</div>
                  <div className="text-zinc-400 leading-relaxed">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-zinc-500 leading-relaxed">
            위 8 원칙을 따르면 flaky risk 거의 0. spec 파일 작성 시 hook이 자동
            가이드 → 위반하기 어려움.
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 7 — 도입 결정 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ⑦ 도입 결정 기준 — 가치 vs 비용
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-5 space-y-2">
              <div className="font-semibold text-emerald-200">
                ✓ e2e 가치 큰 flow
              </div>
              <ul className="text-sm text-emerald-100/90 ml-5 list-disc space-y-1">
                <li>자주 회귀 (다른 PR이 영향 미침)</li>
                <li>사용자 직접 보는 핵심 흐름</li>
                <li>여러 모듈 (UI + API + DB) 통과</li>
                <li>손으로 검증이 귀찮은 길이</li>
              </ul>
              <div className="text-xs text-emerald-200/80 pt-2 border-t border-emerald-400/20">
                share-link-only flow는 위 모두 해당 → 가치 큼 ✓
              </div>
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.04] p-5 space-y-2">
              <div className="font-semibold text-amber-200">
                ✗ e2e 가치 작은 곳
              </div>
              <ul className="text-sm text-amber-100/90 ml-5 list-disc space-y-1">
                <li>거의 안 바뀌는 코드</li>
                <li>단일 함수 검증으로 충분</li>
                <li>관리자만 보는 일회성 화면</li>
                <li>외부 의존성 너무 많아 셋업 비싸짐</li>
              </ul>
              <div className="text-xs text-amber-200/80 pt-2 border-t border-amber-400/20">
                간단한 unit/integration test로 대체
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.06] p-6 space-y-2">
            <div className="font-bold text-amber-200">
              💡 지금 단계 추천
            </div>
            <p className="text-sm text-amber-100 leading-relaxed">
              UAT 막힘 풀기가 우선. e2e는 가치 있지만 1시간이라 UAT 끝나고 별도
              PR. 메인 페이지의 "콤보 3"이 e2e 포함 — 시간 여유 시 도입.{" "}
              <strong className="text-amber-50">콤보 1 (15분)</strong>으로 옵션
              B + 만료 env 변수화 먼저 머지하고, e2e는 그 다음 sprint에.
            </p>
          </div>
        </section>

        {/* Back link */}
        <footer className="pt-8 border-t border-white/10 text-sm">
          <Link
            href="/design-explorations/share-url-and-expiry"
            className="text-amber-300 hover:text-amber-200"
          >
            ← share-url-and-expiry 메인으로 돌아가기
          </Link>
        </footer>
      </div>
    </main>
  );
}
