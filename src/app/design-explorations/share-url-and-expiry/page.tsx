"use client";

import Link from "next/link";

const CODE_HEADER =
  "flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-medium";
const CODE_BLOCK =
  "block rounded-lg border border-white/10 bg-zinc-950/70 p-4 text-xs font-mono text-zinc-100 whitespace-pre overflow-x-auto leading-6";
const ANALOGY_BOX =
  "rounded-xl border border-amber-400/30 bg-amber-400/[0.05] p-5 text-sm text-amber-100 leading-relaxed";
const CARD =
  "rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-4 hover:border-white/20 transition-colors";

export default function ShareUrlAndExpiryExplained() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* ────────────────────────────────────────────────────────── */}
        {/* HEADER */}
        {/* ────────────────────────────────────────────────────────── */}
        <header className="space-y-4">
          <div className="text-xs uppercase tracking-widest text-amber-400/80 font-medium">
            Visual Explainer · 초보 개발자 친화
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            왜 localhost인데 production URL이 나오지?
          </h1>
          <p className="text-base text-zinc-300 leading-relaxed">
            "시간표 보기 링크만 받기" 버튼을 눌렀더니{" "}
            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
              https://class-planner.info365.studio/share/...
            </code>{" "}
            가 나오는 현상. 그리고 만료가 하루뿐이라 테스트가 매번 막힘.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            아래에서 <strong className="text-zinc-200">왜</strong> 그런 일이
            벌어지는지, <strong className="text-zinc-200">어떻게</strong> 고칠
            수 있는지, 그리고 <strong className="text-zinc-200">로컬에서 똑똑하게</strong> 테스트하는 방법을 차근차근 설명합니다.
          </p>
          <nav className="flex flex-wrap gap-2 pt-2 text-xs">
            {[
              { href: "#problem-1", label: "① 왜 production URL이 나오나" },
              { href: "#solutions-1", label: "② 어떻게 고칠까 (3 옵션)" },
              { href: "#problem-2", label: "③ 만료 24시간 문제" },
              { href: "#problem-3", label: "④ 로컬 효율 4가지" },
              { href: "#decision", label: "⑤ 추천 콤보" },
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

        {/* ────────────────────────────────────────────────────────── */}
        {/* PROBLEM 1 — Current behavior */}
        {/* ────────────────────────────────────────────────────────── */}
        <section id="problem-1" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-amber-400/80 font-medium">
              문제 ①
            </div>
            <h2 className="text-2xl font-bold">
              서버가 "여기는 본점입니다"라고 우긴다
            </h2>
          </div>

          {/* Sequence diagram */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-4 font-medium">
              지금 일어나는 일 (Sequence)
            </div>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-3 text-sm font-mono">
              <div className="text-zinc-400 self-center">1.</div>
              <div className="text-zinc-200">
                당신이 <span className="text-amber-300">localhost:3000</span>에서
                "링크만 받기" 클릭
              </div>
              <div className="text-zinc-500 text-xs self-center">browser</div>

              <div className="text-zinc-500 self-center">↓</div>
              <div className="text-zinc-500 text-xs">
                POST /api/share-tokens/from-invite
              </div>
              <div />

              <div className="text-zinc-400 self-center">2.</div>
              <div className="text-zinc-200">
                서버가 DB에 share-token 저장하고{" "}
                <span className="text-emerald-300">token 문자열</span> 만듦
              </div>
              <div className="text-zinc-500 text-xs self-center">server</div>

              <div className="text-zinc-400 self-center">3.</div>
              <div className="text-zinc-200">
                서버가 URL을 만들려고{" "}
                <span className="text-amber-300">process.env.NEXT_PUBLIC_APP_URL</span>{" "}
                조회 → <span className="text-red-300">undefined</span>
              </div>
              <div className="text-zinc-500 text-xs self-center">server</div>

              <div className="text-zinc-400 self-center">4.</div>
              <div className="text-zinc-200">
                env가 없으니 <span className="text-amber-300">??</span> 연산자가
                fallback 발동 →{" "}
                <span className="text-red-300">
                  "https://class-planner.info365.studio"
                </span>{" "}
                박힘
              </div>
              <div className="text-zinc-500 text-xs self-center">server</div>

              <div className="text-zinc-500 self-center">↓</div>
              <div className="text-zinc-500 text-xs">
                {`{ shareUrl: "https://class-planner.info365.studio/share/xxx" }`}
              </div>
              <div />

              <div className="text-zinc-400 self-center">5.</div>
              <div className="text-red-300">
                브라우저가 그 URL을 그대로 표시 → 클릭하면{" "}
                <span className="font-bold">production으로 점프 → 404</span>
              </div>
              <div className="text-zinc-500 text-xs self-center">browser</div>
            </div>
          </div>

          {/* Code excerpt */}
          <div>
            <div className={CODE_HEADER}>
              <span>
                실제 코드 ·{" "}
                <code className="normal-case text-zinc-400">
                  src/app/api/share-tokens/from-invite/route.ts:103-106
                </code>
              </span>
              <span className="text-red-400/80">문제의 줄</span>
            </div>
            <pre className={CODE_BLOCK}>
              <span className="text-zinc-500">// 서버에서 URL을 조립</span>
              {"\n"}
              <span className="text-blue-300">const</span> appUrl ={"\n"}
              {"  "}process.env.NEXT_PUBLIC_APP_URL{" "}
              <span className="text-amber-300">??</span>{" "}
              <span className="text-emerald-300">
                "https://class-planner.info365.studio"
              </span>
              ;{" "}
              <span className="text-red-400">{"// ←"} fallback 박힘</span>
              {"\n"}
              <span className="text-blue-300">const</span> shareUrl ={" "}
              <span className="text-emerald-300">{"`"}</span>
              <span className="text-amber-300">$&#123;</span>appUrl
              <span className="text-amber-300">&#125;</span>
              <span className="text-emerald-300">/share/</span>
              <span className="text-amber-300">$&#123;</span>shareToken.token
              <span className="text-amber-300">&#125;</span>
              <span className="text-emerald-300">{"`"}</span>;
            </pre>
          </div>

          {/* Analogy */}
          <div className={ANALOGY_BOX}>
            <div className="font-bold text-amber-300 mb-2">
              🍽️ 식당 비유 — 명패가 없으면 default 주소를 외친다
            </div>
            <p>
              어떤 체인 식당에 종업원이 새로 입사했다. 매뉴얼에 "손님이 매장
              주소 물으면 무조건{" "}
              <strong className="text-amber-200">'본점입니다'</strong>라고
              말하세요"라고 적혀 있다 ← 이게 hardcode fallback.
            </p>
            <p className="mt-2">
              그래서 <strong className="text-amber-200">분점에서 일하는 종업원</strong>도
              손님이 어디냐고 물으면 "본점입니다"라고 말한다. 매장 입구에
              "여기는 강남점입니다" 명패(env)가 붙어 있었다면 그걸 보고
              올바르게 답했겠지만, 명패가 없으니 매뉴얼대로 default 박힌 문자열
              사용.
            </p>
          </div>

          {/* JS 용어 풀이 */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-5 text-sm space-y-3">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              📚 초보자용 용어 풀이
            </div>
            <div>
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
                ??
              </code>{" "}
              <span className="text-zinc-300">
                — Nullish coalescing 연산자. "왼쪽이 null이나 undefined면
                오른쪽 값 써라"는 의미. 즉{" "}
                <code className="text-zinc-400">A ?? B</code>는 "A가 비어있으면
                B"로 읽으면 됨.
              </span>
            </div>
            <div>
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
                process.env.NEXT_PUBLIC_APP_URL
              </code>{" "}
              <span className="text-zinc-300">
                — 환경변수(environment variable). 코드 밖에서 주입하는 설정 값.
                개발/테스트/프로덕션 환경마다 다른 값을 주입하기 위한 표준 방식.{" "}
                <code className="text-zinc-400">.env.local</code> 같은 파일에
                저장.
              </span>
            </div>
            <div>
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
                NEXT_PUBLIC_*
              </code>{" "}
              <span className="text-zinc-300">
                — Next.js 컨벤션. 이 prefix가 붙어야 브라우저에서도 읽을 수
                있음. 안 붙으면 서버에서만 접근 가능 (보안 default).
              </span>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* GOOD PATTERN — settings page */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-emerald-400/80 font-medium">
              ✓ 이미 잘 되어 있는 곳 (참고)
            </div>
            <h2 className="text-2xl font-bold">settings 페이지는 이렇게 함</h2>
          </div>

          <div>
            <div className={CODE_HEADER}>
              <span>
                실제 코드 ·{" "}
                <code className="normal-case text-zinc-400">
                  src/app/settings/page.tsx:389
                </code>
              </span>
              <span className="text-emerald-400/80">정답</span>
            </div>
            <pre className={CODE_BLOCK}>
              <span className="text-blue-300">const</span> shareUrl ={" "}
              <span className="text-emerald-300">{"`"}</span>
              <span className="text-amber-300">$&#123;</span>
              <span className="text-purple-300">window.location.origin</span>
              <span className="text-amber-300">&#125;</span>
              <span className="text-emerald-300">/share/</span>
              <span className="text-amber-300">$&#123;</span>token
              <span className="text-amber-300">&#125;</span>
              <span className="text-emerald-300">{"`"}</span>;
            </pre>
          </div>

          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.05] p-5 text-sm text-emerald-100 leading-relaxed">
            <div className="font-bold text-emerald-300 mb-2">
              🪧 분점 종업원이 자기 명패를 보고 답하는 패턴
            </div>
            <p>
              <code className="px-1.5 py-0.5 rounded bg-zinc-900/60 text-emerald-300 text-xs">
                window.location.origin
              </code>{" "}
              은 브라우저에 내장된 변수. 지금 사용자가 보고 있는 사이트의 root
              URL을 자동으로 알려줌:
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-1 text-emerald-200/90">
              <li>
                localhost에서 보면 →{" "}
                <code className="text-zinc-300">http://localhost:3000</code>
              </li>
              <li>
                production에서 보면 →{" "}
                <code className="text-zinc-300">
                  https://class-planner.info365.studio
                </code>
              </li>
              <li>
                다른 도메인으로 옮겨도 → 자동으로 그 도메인. 코드 수정 0.
              </li>
            </ul>
            <p className="mt-3 text-emerald-200/90">
              즉 <strong className="text-emerald-200">"브라우저가 자기 위치를
              안다"</strong>는 사실을 활용. 서버한테 물어볼 필요 없음 — 어차피
              사용자가 자기 화면에서 보는 URL을 만들고 싶은 거니까.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SOLUTIONS — 3 options */}
        {/* ────────────────────────────────────────────────────────── */}
        <section id="solutions-1" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-amber-400/80 font-medium">
              해결 옵션
            </div>
            <h2 className="text-2xl font-bold">
              어떻게 고칠까 — 3가지 방향
            </h2>
            <p className="text-sm text-zinc-400">
              각자 trade-off가 있어요. 깊이/시간/안전성이 다름.
            </p>
          </div>

          {/* Option A */}
          <div className={CARD}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">
                옵션 A — <span className="text-amber-300">.env.local 한 줄 추가</span>
              </h3>
              <span className="text-xs text-zinc-500 font-mono">1분 · 코드 0줄</span>
            </div>

            <p className="text-sm text-zinc-300">
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
                .env.local
              </code>{" "}
              파일에 한 줄 추가하고 dev 서버 재시작.
            </p>

            <pre className={CODE_BLOCK}>
              <span className="text-zinc-500"># .env.local (gitignore됨, 본인만 봄)</span>
              {"\n"}
              <span className="text-purple-300">NEXT_PUBLIC_APP_URL</span>=
              <span className="text-emerald-300">http://localhost:3000</span>
            </pre>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
                <div className="text-emerald-400 font-semibold mb-1">+ 좋은 점</div>
                <ul className="text-emerald-100/80 space-y-0.5 list-disc ml-4">
                  <li>즉시 해결, UAT 막힘 풀림</li>
                  <li>코드 변경 0 (배포 PR 없음)</li>
                  <li>본인 머신에만 적용</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3">
                <div className="text-amber-400 font-semibold mb-1">– 안 좋은 점</div>
                <ul className="text-amber-100/80 space-y-0.5 list-disc ml-4">
                  <li>hardcode fallback이 코드에 그대로 남음</li>
                  <li>새 개발자/미래의 본인이 같은 함정에 또 빠짐</li>
                  <li>도메인 바뀌면 .env + cors.ts + route.ts 3곳 동시 수정</li>
                </ul>
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              <span className="text-zinc-400">언제 선택?</span> UAT 마감 임박해서
              지금 당장 풀어야 할 때. 근본 fix는 나중 PR로.
            </div>
          </div>

          {/* Option B */}
          <div className={CARD + " border-amber-400/40"}>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold">
                  옵션 B —{" "}
                  <span className="text-amber-300">
                    서버에서 URL 조립 그만두기
                  </span>
                </h3>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-medium border border-amber-400/40">
                  ★ 추천
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-mono">10분 · 2 파일</span>
            </div>

            <p className="text-sm text-zinc-300">
              서버는 token만 반환. 브라우저(클라이언트)가{" "}
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
                window.location.origin
              </code>{" "}
              로 URL 조립. settings 페이지와 동일 패턴 → 코드 일관성.
            </p>

            <div>
              <div className={CODE_HEADER}>
                <span>
                  변경 1 ·{" "}
                  <code className="normal-case">
                    src/app/api/share-tokens/from-invite/route.ts
                  </code>
                </span>
              </div>
              <pre className={CODE_BLOCK}>
                <span className="text-red-400">- const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://...";</span>
                {"\n"}
                <span className="text-red-400">- const shareUrl = {"`"}$&#123;appUrl&#125;/share/$&#123;token&#125;{"`"};</span>
                {"\n"}
                <span className="text-red-400">- return NextResponse.json(&#123; shareUrl, token &#125;);</span>
                {"\n"}
                <span className="text-emerald-400">+ return NextResponse.json(&#123; token: shareToken.token &#125;);</span>
              </pre>
            </div>

            <div>
              <div className={CODE_HEADER}>
                <span>
                  변경 2 ·{" "}
                  <code className="normal-case">
                    src/app/invite/[token]/page.tsx handleShareLinkOnly()
                  </code>
                </span>
              </div>
              <pre className={CODE_BLOCK}>
                <span className="text-red-400">- if (res.ok && data.shareUrl) &#123;</span>
                {"\n"}
                <span className="text-red-400">-   setShareUrl(data.shareUrl);</span>
                {"\n"}
                <span className="text-red-400">- &#125;</span>
                {"\n"}
                <span className="text-emerald-400">+ if (res.ok && data.token) &#123;</span>
                {"\n"}
                <span className="text-emerald-400">+   setShareUrl(`$&#123;window.location.origin&#125;/share/$&#123;data.token&#125;`);</span>
                {"\n"}
                <span className="text-emerald-400">+ &#125;</span>
              </pre>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
                <div className="text-emerald-400 font-semibold mb-1">+ 좋은 점</div>
                <ul className="text-emerald-100/80 space-y-0.5 list-disc ml-4">
                  <li>settings 페이지와 동일 패턴 (코드 일관성)</li>
                  <li>hardcode fallback 영원히 사라짐</li>
                  <li>도메인 바뀌어도 코드 수정 0</li>
                  <li>로컬/스테이징/프로덕션 모두 자동 동작</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3">
                <div className="text-amber-400 font-semibold mb-1">– 안 좋은 점</div>
                <ul className="text-amber-100/80 space-y-0.5 list-disc ml-4">
                  <li>API response schema 변경 — caller 모두 동시 수정 (지금은 1곳뿐, 안전)</li>
                  <li>
                    이메일/SMS 발송 같은 server-only 컨텍스트엔 못 씀 (다행히 이 flow는 client redirect){" "}
                    <Link
                      href="/design-explorations/share-url-and-expiry/server-only-context"
                      className="text-amber-300 underline hover:text-amber-200"
                    >
                      자세히 →
                    </Link>
                  </li>
                  <li>관련 테스트 1-2개 수정 필요</li>
                </ul>
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              <span className="text-zinc-400">언제 선택?</span> UAT 끝나기 전에
              근본까지 정리하고 싶을 때. 한 PR로 묶어 코드 base 일관성 확보.
            </div>
          </div>

          {/* Option C */}
          <div className={CARD}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">
                옵션 C —{" "}
                <span className="text-amber-300">request header에서 origin 추출</span>
              </h3>
              <span className="text-xs text-zinc-500 font-mono">30분 · 보안 검토 필요</span>
            </div>

            <p className="text-sm text-zinc-300">
              서버가 받은 HTTP 요청의{" "}
              <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
                Origin
              </code>{" "}
              헤더를 사용. 서버에서 build해도 정확한 origin 알 수 있음.
            </p>

            <pre className={CODE_BLOCK}>
              <span className="text-blue-300">const</span> origin = request.headers.get(<span className="text-emerald-300">"origin"</span>);
              {"\n"}
              <span className="text-blue-300">const</span> appUrl = origin && ALLOWED_ORIGINS.includes(origin)
              {"\n"}{"  "}? origin
              {"\n"}{"  "}: <span className="text-emerald-300">"https://class-planner.info365.studio"</span>;
            </pre>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
                <div className="text-emerald-400 font-semibold mb-1">+ 좋은 점</div>
                <ul className="text-emerald-100/80 space-y-0.5 list-disc ml-4">
                  <li>가장 robust — 서버에서 build해도 정확</li>
                  <li>이메일 발송 같은 server-only 미래 대응 가능</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3">
                <div className="text-amber-400 font-semibold mb-1">– 안 좋은 점</div>
                <ul className="text-amber-100/80 space-y-0.5 list-disc ml-4">
                  <li>
                    Cloudflare/Lightsail 같은 reverse proxy에선 <code>x-forwarded-host</code> 처리 추가{" "}
                    <Link
                      href="/design-explorations/share-url-and-expiry/reverse-proxy"
                      className="text-amber-300 underline hover:text-amber-200"
                    >
                      자세히 →
                    </Link>
                  </li>
                  <li>Origin header injection 보안 위험 (allowlist 의무)</li>
                  <li>복잡도 ↑, 테스트 케이스 ↑</li>
                </ul>
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              <span className="text-zinc-400">언제 선택?</span> 미래에 이메일/SMS
              로 share link 발송 기능 추가할 때. 지금 단계엔 과함.
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* PROBLEM 2 — Expiry 24h */}
        {/* ────────────────────────────────────────────────────────── */}
        <section id="problem-2" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-amber-400/80 font-medium">
              문제 ③
            </div>
            <h2 className="text-2xl font-bold">
              만료 24시간이 hardcode되어 있음
            </h2>
          </div>

          <div>
            <div className={CODE_HEADER}>
              <span>
                실제 코드 ·{" "}
                <code className="normal-case text-zinc-400">
                  src/app/api/invites/route.ts:117
                </code>
              </span>
              <span className="text-red-400/80">문제의 줄</span>
            </div>
            <pre className={CODE_BLOCK}>
              <span className="text-blue-300">const</span> expiresAt ={" "}
              <span className="text-blue-300">new</span> Date(
              {"\n"}
              {"  "}Date.now() + <span className="text-amber-300">24</span> *{" "}
              <span className="text-amber-300">60</span> *{" "}
              <span className="text-amber-300">60</span> *{" "}
              <span className="text-amber-300">1000</span>{" "}
              <span className="text-zinc-500">// = 24시간 (밀리초)</span>
              {"\n"})
              .toISOString();
            </pre>
          </div>

          <div className={ANALOGY_BOX}>
            <div className="font-bold text-amber-300 mb-2">
              🥛 우유 유통기한 비유
            </div>
            <p>
              모든 우유의 유통기한이 무조건 24시간. 가게 입장에선 회전이 빠르고
              상한 우유 위험 적어서 좋음. 하지만 매번 사러 가야 해서 손님은
              번거로움 — 특히 <strong className="text-amber-200">테스트하는 사람</strong>은
              매일 새 invite 만들어야 함.
            </p>
            <p className="mt-2">
              해결: <strong className="text-amber-200">상황에 따라 다른 유통기한</strong>을
              찍을 수 있게 함. dev에서는 7일짜리, prod에서는 1일짜리.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={CARD}>
              <h3 className="text-lg font-semibold">즉시 (0분)</h3>
              <p className="text-sm text-zinc-300">
                Supabase Dashboard에서 invites 테이블 열기 → 해당 row의{" "}
                <code className="px-1 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
                  expires_at
                </code>{" "}
                직접 UPDATE.
              </p>
              <pre className="text-xs font-mono bg-zinc-950/70 p-3 rounded border border-white/10 text-zinc-200">
                UPDATE invites{"\n"}SET expires_at = NOW() + INTERVAL{" "}
                <span className="text-emerald-300">'30 days'</span>{"\n"}WHERE
                token ={" "}
                <span className="text-emerald-300">'aa8de9ef...'</span>;
              </pre>
              <div className="text-xs text-zinc-500">
                만료 임박한 token 살리기. 가장 빠름. 다만 매번 반복.
              </div>
            </div>

            <div className={CARD}>
              <h3 className="text-lg font-semibold">근본 (10분)</h3>
              <p className="text-sm text-zinc-300">
                env 변수화 → dev에선 7일, prod에선 1일.
              </p>
              <pre className="text-xs font-mono bg-zinc-950/70 p-3 rounded border border-white/10 text-zinc-200">
                <span className="text-zinc-500"># .env.local</span>
                {"\n"}
                <span className="text-purple-300">INVITE_EXPIRES_HOURS</span>=
                <span className="text-amber-300">168</span>{" "}
                <span className="text-zinc-500"># 7일</span>
                {"\n"}
                {"\n"}
                <span className="text-zinc-500">// route.ts</span>
                {"\n"}
                <span className="text-blue-300">const</span> hours ={" "}
                <span className="text-blue-300">Number</span>
                (process.env.INVITE_EXPIRES_HOURS) ||{" "}
                <span className="text-amber-300">24</span>;
                {"\n"}
                <span className="text-blue-300">const</span> expiresAt = ...{" "}
                <span className="text-zinc-500">// hours 사용</span>
              </pre>
              <div className="text-xs text-zinc-500">
                한 번 셋업 후 영구. prod는 24h 유지 (보안 default).
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* PROBLEM 3 — Local testing efficiency */}
        {/* ────────────────────────────────────────────────────────── */}
        <section id="problem-3" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-amber-400/80 font-medium">
              로컬 효율
            </div>
            <h2 className="text-2xl font-bold">
              로컬에서 똑똑하게 테스트하는 4가지 방법
            </h2>
            <p className="text-sm text-zinc-400">
              "셋업 시간"과 "매번 쓰는 시간"의 trade-off. 자주 반복할수록
              영속화 도구가 이득.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="text-left p-3 font-medium">도구</th>
                  <th className="text-left p-3 font-medium">셋업</th>
                  <th className="text-left p-3 font-medium">매번 사용</th>
                  <th className="text-left p-3 font-medium">영속화</th>
                  <th className="text-left p-3 font-medium">적합 상황</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr className="hover:bg-zinc-900/30">
                  <td className="p-3 font-medium text-zinc-200">
                    🗄️ Supabase Dashboard UPDATE
                  </td>
                  <td className="p-3 text-emerald-300">0분</td>
                  <td className="p-3 text-amber-300">30초</td>
                  <td className="p-3 text-zinc-500">없음</td>
                  <td className="p-3 text-zinc-400 text-xs">
                    "지금 막힌 거 1번만 풀자"
                  </td>
                </tr>
                <tr className="hover:bg-zinc-900/30">
                  <td className="p-3 font-medium text-zinc-200">
                    🌱 dev-only seed script
                  </td>
                  <td className="p-3 text-amber-300">30분</td>
                  <td className="p-3 text-emerald-300">
                    1초 (<code>npm run seed:invite</code>)
                  </td>
                  <td className="p-3 text-emerald-400">✓ 코드에 박힘</td>
                  <td className="p-3 text-zinc-400 text-xs">
                    "매일 새 invite 필요"
                  </td>
                </tr>
                <tr className="hover:bg-zinc-900/30">
                  <td className="p-3 font-medium text-zinc-200">
                    🎭 Playwright e2e fixture
                  </td>
                  <td className="p-3 text-amber-300">1-2시간</td>
                  <td className="p-3 text-emerald-300">
                    0초 (자동 실행)
                  </td>
                  <td className="p-3 text-emerald-400">✓ CI 자동 검증</td>
                  <td className="p-3 text-zinc-400 text-xs">
                    "회귀 가드 + 자동 검증"
                  </td>
                </tr>
                <tr className="hover:bg-zinc-900/30">
                  <td className="p-3 font-medium text-zinc-200">
                    📡 omni-radar trace
                  </td>
                  <td className="p-3 text-emerald-300">0분 (이미 셋업)</td>
                  <td className="p-3 text-emerald-300">
                    보기만 (<code>:8888</code> 대시보드)
                  </td>
                  <td className="p-3 text-zinc-500">로그 viewer</td>
                  <td className="p-3 text-zinc-400 text-xs">
                    "에러 났을 때 timeline 추적"
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.05] p-5 text-sm text-emerald-100 leading-relaxed">
            <div className="font-bold text-emerald-300 mb-2">
              🌱 seed script가 뭔지 (예시)
            </div>
            <p className="mb-3">
              <code>scripts/seed-invite-fresh.ts</code> 같은 파일을 만들어 dev
              DB에 새 invite를 한 줄 명령으로 만들고 URL을 콘솔에 출력. 본인 머신
              전용.
            </p>
            <pre className={CODE_BLOCK + " text-emerald-50"}>
              $ <span className="text-amber-300">npm run seed:invite</span>
              {"\n"}
              ↳ Created invite for UAT Test Academy (member role)
              {"\n"}
              ↳ Token: a1b2c3...
              {"\n"}
              ↳{" "}
              <span className="text-emerald-300">
                http://localhost:3000/invite/a1b2c3...
              </span>{" "}
              ← 클릭 가능
              {"\n"}↳ Expires: 7d
            </pre>
            <p className="mt-3 text-emerald-200/90">
              이미{" "}
              <code className="px-1.5 py-0.5 rounded bg-zinc-900/60 text-emerald-300 text-xs">
                npm run uat:invite
              </code>{" "}
              가 비슷한 역할 — 다만 share-link-only flow 전용 seed는 없음. 추가
              30분.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* DECISION */}
        {/* ────────────────────────────────────────────────────────── */}
        <section id="decision" className="space-y-6 scroll-mt-8">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-amber-400/80 font-medium">
              추천
            </div>
            <h2 className="text-2xl font-bold">어떤 콤보로 갈까요?</h2>
          </div>

          <div className="space-y-4">
            <div className={CARD + " border-amber-400/40"}>
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-medium border border-amber-400/40">
                  ★ 추천
                </span>
                <h3 className="text-lg font-semibold">콤보 1 — 근본 한 번에</h3>
              </div>
              <ol className="text-sm text-zinc-300 space-y-2 ml-5 list-decimal">
                <li>
                  <strong>옵션 B</strong> (10분) — route.ts + page.tsx 수정 → URL 문제 영구 해결
                </li>
                <li>
                  <strong>만료 env 변수화</strong> (5분) + .env.local에{" "}
                  <code>INVITE_EXPIRES_HOURS=168</code> → 7일짜리 invite
                </li>
                <li>
                  <strong>UAT 계속 진행</strong> — 매번 만료/도메인 문제 안 만남
                </li>
              </ol>
              <div className="text-xs text-zinc-500 pt-2 border-t border-white/5">
                총 15분. 한 PR로 묶어 머지. 다음 세션부터 같은 함정 없음.
              </div>
            </div>

            <div className={CARD}>
              <h3 className="text-lg font-semibold">콤보 2 — 일단 막힘만 풀고 나중에</h3>
              <ol className="text-sm text-zinc-300 space-y-2 ml-5 list-decimal">
                <li>
                  <strong>옵션 A</strong> — .env.local에 NEXT_PUBLIC_APP_URL,
                  INVITE_EXPIRES_HOURS 둘 다 추가 (1분)
                </li>
                <li>
                  <strong>Supabase Dashboard</strong>에서 현재 invite expires_at
                  UPDATE (30초)
                </li>
                <li>UAT 끝나고 별도 PR로 근본 fix</li>
              </ol>
              <div className="text-xs text-zinc-500 pt-2 border-t border-white/5">
                총 2분. UAT 막힘만 풀림. 근본 fix는 미래의 일.
              </div>
            </div>

            <div className={CARD}>
              <h3 className="text-lg font-semibold">콤보 3 — 모두 끝장내기</h3>
              <ol className="text-sm text-zinc-300 space-y-2 ml-5 list-decimal">
                <li>콤보 1 (15분)</li>
                <li>
                  <strong>seed script 추가</strong> (30분) — 매번 fresh invite 1초 발급
                </li>
                <li>
                  <strong>Playwright e2e</strong> — share-link-only flow 자동 검증 (1시간){" "}
                  <Link
                    href="/design-explorations/share-url-and-expiry/playwright-e2e"
                    className="text-amber-300 underline hover:text-amber-200"
                  >
                    자세히 →
                  </Link>
                </li>
              </ol>
              <div className="text-xs text-zinc-500 pt-2 border-t border-white/5">
                총 1시간 45분. UAT 후 정리 PR 또는 다음 sprint. 이번엔 콤보 1만.
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* FOOTER */}
        {/* ────────────────────────────────────────────────────────── */}
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
          <p>
            결정 후 알려주시면 PR 만들어드릴게요. "콤보 1로 가자", "B만 먼저"
            처럼 자유롭게.
          </p>
        </footer>
      </div>
    </main>
  );
}
