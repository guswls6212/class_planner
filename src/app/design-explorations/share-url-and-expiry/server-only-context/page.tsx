"use client";

import Link from "next/link";

const CODE_HEADER =
  "flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-medium";
const CODE_BLOCK =
  "block rounded-lg border border-white/10 bg-zinc-950/70 p-4 text-xs font-mono text-zinc-100 whitespace-pre overflow-x-auto leading-6";
const ANALOGY_BOX =
  "rounded-xl border border-amber-400/30 bg-amber-400/[0.05] p-5 text-sm text-amber-100 leading-relaxed";

export default function ServerOnlyContextExplained() {
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
            Deep Dive · 옵션 B의 단점
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            왜 옵션 B는 이메일/SMS 발송에 못 쓰나?
          </h1>
          <p className="text-base text-zinc-300 leading-relaxed">
            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 text-xs">
              window.location.origin
            </code>{" "}
            이 정확히 어떤 환경에서 동작하고, 어떤 환경에선 못 쓰는지. 그리고
            왜 이메일 발송은 후자에 해당하는지.
          </p>
        </header>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 1 — window는 무엇인가 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ① <code className="text-amber-300">window</code>는 브라우저
            전용 변수
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            JavaScript는 같은 언어지만 <strong className="text-zinc-100">실행되는
            장소</strong>에 따라 사용할 수 있는 변수가 다릅니다. 두 가지 큰
            장소가 있어요.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-blue-400/30 bg-blue-400/[0.05] p-5 space-y-3">
              <div className="text-xs uppercase tracking-wider text-blue-300 font-medium">
                🌐 브라우저 환경 (Browser)
              </div>
              <p className="text-sm text-blue-100">
                Chrome, Safari, Firefox 같은 곳. 사용자의 컴퓨터에서 실행됨.
              </p>
              <div className="text-xs text-blue-200/80">
                사용 가능한 전용 변수:
              </div>
              <ul className="text-xs text-blue-100/90 ml-4 list-disc space-y-1">
                <li>
                  <code className="text-blue-200">window</code> — 브라우저 창 객체
                </li>
                <li>
                  <code className="text-blue-200">document</code> — HTML 문서
                </li>
                <li>
                  <code className="text-blue-200">localStorage</code> — 저장소
                </li>
                <li>
                  <code className="text-blue-200">fetch</code> — 네트워크 호출
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-purple-400/30 bg-purple-400/[0.05] p-5 space-y-3">
              <div className="text-xs uppercase tracking-wider text-purple-300 font-medium">
                🖥️ 서버 환경 (Node.js)
              </div>
              <p className="text-sm text-purple-100">
                AWS Lightsail 같은 서버 컴퓨터에서 실행됨. Next.js의 API
                Routes도 여기서 돔.
              </p>
              <div className="text-xs text-purple-200/80">
                사용 가능한 전용 변수:
              </div>
              <ul className="text-xs text-purple-100/90 ml-4 list-disc space-y-1">
                <li>
                  <code className="text-purple-200">process.env</code> —
                  환경변수
                </li>
                <li>
                  <code className="text-purple-200">fs</code> — 파일 시스템
                </li>
                <li>
                  <code className="text-purple-200">request.headers</code> — HTTP 헤더
                </li>
                <li>
                  <code className="text-purple-200">process.cwd()</code> — 현재 경로
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-red-400/30 bg-red-400/[0.05] p-5 text-sm text-red-100">
            <div className="font-bold text-red-300 mb-2">
              💥 서버에서 <code>window</code>를 부르면?
            </div>
            <pre className={CODE_BLOCK + " border-red-400/20 bg-red-950/30"}>
              <span className="text-zinc-500">// 서버 API route 안에서</span>
              {"\n"}
              <span className="text-blue-300">const</span> url = window.location.origin;{" "}
              <span className="text-red-400">{"// ←"}</span>
              {"\n"}
              {"\n"}
              <span className="text-red-300">
                ReferenceError: window is not defined
              </span>
              {"\n"}
              <span className="text-red-300/70">
                {"  "}at /app/api/share-tokens/from-invite/route.ts:104
              </span>
            </pre>
            <p className="mt-3 text-red-200/90">
              서버는 브라우저가 아니니까 <code>window</code>를 모름. 즉시 에러.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — 비유 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ② 비유: 종업원 vs 인쇄소
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={ANALOGY_BOX}>
              <div className="font-bold text-amber-300 mb-2">
                👨‍🍳 종업원이 손님 앞에서 답하는 상황
              </div>
              <p>
                손님이 매장에 와서 "여기 주소가 뭐죠?" 물음. 종업원이 매장
                간판을 가리키며 "여기는 강남점입니다" 답함.
              </p>
              <p className="mt-2">
                <strong className="text-amber-200">손님이 매장에 있다 = 브라우저 환경.</strong>{" "}
                간판(window.location)을 보고 답할 수 있음 → 옵션 B의 동작 방식.
              </p>
            </div>

            <div className="rounded-xl border border-purple-400/30 bg-purple-400/[0.05] p-5 text-sm text-purple-100 leading-relaxed">
              <div className="font-bold text-purple-300 mb-2">
                🏭 인쇄소가 광고 전단지 만드는 상황
              </div>
              <p>
                매장이 광고 전단지를 만들어 우편으로 보내려고 함. 인쇄소는 종이에
                "매장 주소: ___"를 박아야 함.
              </p>
              <p className="mt-2">
                <strong className="text-purple-200">손님이 없는 상황 = 서버 환경.</strong>{" "}
                간판이 없으니 다른 방식으로 주소를 알아야 함:
                <br />
                ① 본사가 미리 정해 둔 주소 (env 변수)
                <br />
                ② 우편 요청서에 적힌 발신지 (request header)
              </p>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 3 — 지금 share-link flow */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ③ 지금 share-link-only flow = 손님 앞 종업원
          </h2>

          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-4 font-medium">
              현재 동작 (옵션 B 적용 시)
            </div>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-3 text-sm">
              <div className="text-zinc-400 self-center font-mono">1.</div>
              <div className="text-zinc-200">
                owner가 브라우저에서{" "}
                <span className="text-blue-300">"링크만 받기"</span> 클릭
              </div>
              <div className="text-blue-300 text-xs self-center font-mono">
                browser
              </div>

              <div className="text-zinc-400 self-center font-mono">2.</div>
              <div className="text-zinc-200">
                클라이언트 코드가 fetch POST → 서버
              </div>
              <div className="text-zinc-500 text-xs self-center font-mono">
                → server
              </div>

              <div className="text-zinc-400 self-center font-mono">3.</div>
              <div className="text-zinc-200">
                서버가 token 생성하고 token만 반환
              </div>
              <div className="text-purple-300 text-xs self-center font-mono">
                server
              </div>

              <div className="text-zinc-400 self-center font-mono">4.</div>
              <div className="text-zinc-200">
                클라이언트가 받은 token으로{" "}
                <code className="text-amber-300">window.location.origin</code>{" "}
                조립해서 화면에 URL 표시 ←{" "}
                <strong className="text-blue-300">아직도 browser 환경</strong>
              </div>
              <div className="text-blue-300 text-xs self-center font-mono">
                browser
              </div>

              <div className="text-zinc-400 self-center font-mono">5.</div>
              <div className="text-emerald-300">
                ✓ owner가 화면에서 URL 본 후 복사/공유
              </div>
              <div className="text-blue-300 text-xs self-center font-mono">
                browser
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 text-xs text-zinc-400 leading-relaxed">
              <strong className="text-zinc-200">핵심:</strong> 4번 시점에 owner가
              아직 브라우저에 있음 (탭이 열려 있고 fetch 응답을 처리 중). 그래서{" "}
              <code>window</code>가 존재 → 옵션 B로 충분.
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 4 — 미래 이메일 flow */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ④ 만약 이메일로 share URL을 보낸다면? = 인쇄소
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            지금은 owner가 본인이 화면에서 URL 보고 복사. 만약 미래에 "owner가
            이메일 주소 입력 → 서비스가 그 이메일로 share URL 자동 발송" 기능을
            추가한다면 흐름이 완전히 달라집니다.
          </p>

          <div className="rounded-xl border border-purple-400/30 bg-purple-400/[0.04] p-6">
            <div className="text-xs uppercase tracking-wider text-purple-300 mb-4 font-medium">
              가상 시나리오 — 이메일 발송 (미래)
            </div>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-3 text-sm">
              <div className="text-zinc-400 self-center font-mono">1.</div>
              <div className="text-zinc-200">
                owner가 이메일 주소 입력 후 "발송" 클릭
              </div>
              <div className="text-blue-300 text-xs self-center font-mono">
                browser
              </div>

              <div className="text-zinc-400 self-center font-mono">2.</div>
              <div className="text-zinc-200">
                서버가 token 생성
              </div>
              <div className="text-purple-300 text-xs self-center font-mono">
                server
              </div>

              <div className="text-zinc-400 self-center font-mono">3.</div>
              <div className="text-zinc-200">
                서버가 SendGrid/AWS SES 같은 이메일 서비스에 보낼 본문 작성 →
                여기에{" "}
                <strong className="text-red-300">share URL이 본문에 박혀야 함</strong>{" "}
                ← server 환경, window 없음!
              </div>
              <div className="text-red-300 text-xs self-center font-mono">
                server ⚠
              </div>

              <div className="text-zinc-400 self-center font-mono">4.</div>
              <div className="text-zinc-200">
                받는 사람이 이메일 열고 URL 클릭
              </div>
              <div className="text-zinc-500 text-xs self-center font-mono">
                (나중)
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-purple-400/20 text-xs text-purple-100/90 leading-relaxed">
              <strong className="text-purple-200">문제 지점:</strong> 3번 시점엔
              owner의 브라우저가 안 보임 — 서버는 백그라운드에서 이메일 본문을
              만드는 중. 받는 사람도 아직 이메일 안 열어서 브라우저 없음.{" "}
              <strong>그 시점에서 URL의 base 도메인을 어떻게 정하지?</strong>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 5 — 다른 server-only 상황 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ⑤ 이메일 말고도 server-only 상황은 많다
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                title: "📧 이메일 발송",
                desc: "owner 초대, 비밀번호 재설정, 알림 메일. 받는 사람 브라우저는 미래.",
              },
              {
                title: "📱 SMS 발송",
                desc: "Twilio 같은 서비스로 invite SMS. 텍스트에 URL 박힘.",
              },
              {
                title: "🔔 Push notification",
                desc: "모바일 알림에 URL deep-link. 받는 사람 브라우저 없음.",
              },
              {
                title: "⏰ Scheduled job (cron)",
                desc: '매일 자정에 "만료 임박" 알림 발송. 사용자 인터랙션 없이 서버 단독 실행.',
              },
              {
                title: "🪝 Webhook 호출",
                desc: "다른 서비스 (Slack, Zapier 등)에 share URL 포함 POST.",
              },
              {
                title: "📄 PDF 서버 렌더링",
                desc: "서버에서 PDF 생성 시 URL을 포함. 클라이언트 컨텍스트 없음.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-white/10 bg-zinc-900/40 p-4"
              >
                <div className="font-medium text-zinc-100 mb-1">
                  {item.title}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 6 — 미래 대응 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ⑥ 그럼 그 시점에 어떻게 대응?
          </h2>

          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-5 space-y-3">
              <h3 className="text-lg font-semibold text-emerald-100">
                방법 1 — 명시적 base URL env (가장 깨끗)
              </h3>
              <p className="text-sm text-emerald-100/90">
                서버가 알아야 할 "내 사이트의 공식 base URL"을 env 변수로 명시.
                hardcode fallback 없이 startup 시 강제.
              </p>
              <pre className={CODE_BLOCK + " text-emerald-50"}>
                <span className="text-zinc-500"># .env.production</span>
                {"\n"}
                <span className="text-purple-300">PUBLIC_BASE_URL</span>=
                <span className="text-emerald-300">
                  https://class-planner.info365.studio
                </span>
                {"\n"}
                <span className="text-zinc-500"># .env.local</span>
                {"\n"}
                <span className="text-purple-300">PUBLIC_BASE_URL</span>=
                <span className="text-emerald-300">http://localhost:3000</span>
                {"\n"}
                {"\n"}
                <span className="text-zinc-500">// 서버 코드</span>
                {"\n"}
                <span className="text-blue-300">const</span> baseUrl =
                process.env.PUBLIC_BASE_URL;
                {"\n"}
                <span className="text-blue-300">if</span> (!baseUrl){" "}
                <span className="text-blue-300">throw</span>{" "}
                <span className="text-blue-300">new</span> Error(
                <span className="text-emerald-300">"PUBLIC_BASE_URL 미설정"</span>
                );{"\n"}
                <span className="text-blue-300">const</span> shareUrl ={" "}
                <span className="text-emerald-300">{"`"}</span>
                <span className="text-amber-300">$&#123;</span>baseUrl
                <span className="text-amber-300">&#125;</span>
                <span className="text-emerald-300">/share/</span>
                <span className="text-amber-300">$&#123;</span>token
                <span className="text-amber-300">&#125;</span>
                <span className="text-emerald-300">{"`"}</span>;
              </pre>
              <p className="text-xs text-emerald-200/80">
                hardcode fallback이 없다는 점이 옵션 A와 다름. env 안 잡혀
                있으면 startup 자체가 실패 → 미래의 본인이 함정에 안 빠짐.
              </p>
            </div>

            <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.04] p-5 space-y-3">
              <h3 className="text-lg font-semibold text-amber-100">
                방법 2 — request header에서 추출 (옵션 C)
              </h3>
              <p className="text-sm text-amber-100/90">
                메인 페이지의 옵션 C와 동일. 이메일 발송 시점엔 사용자 인터랙션
                직후라 request header가 살아있음 → origin 추출 가능. 단,
                Cloudflare 같은 reverse proxy 환경에서{" "}
                <code>x-forwarded-host</code> 처리 필요.
              </p>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 7 — 결론 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-amber-400/40 bg-amber-400/[0.06] p-6 space-y-3">
          <h2 className="text-xl font-bold text-amber-200">
            🎯 정리 — 옵션 B 단점의 본질
          </h2>
          <ul className="text-sm text-amber-100 space-y-2 list-disc ml-5">
            <li>
              <code>window.location.origin</code>은{" "}
              <strong className="text-amber-50">브라우저 전용 변수</strong>.
              서버에선 존재 자체가 없음.
            </li>
            <li>
              지금 share-link-only flow는{" "}
              <strong className="text-amber-50">
                owner가 브라우저에 있는 시점
              </strong>
              에 URL을 표시. 그래서 옵션 B로 충분.
            </li>
            <li>
              미래에 이메일/SMS/cron/webhook 같이{" "}
              <strong className="text-amber-50">
                사용자 브라우저가 없는 server-only 시점
              </strong>
              에 URL을 만들어야 한다면 옵션 B 불가 → 옵션 C 또는{" "}
              <code>PUBLIC_BASE_URL</code> env 도입.
            </li>
            <li>
              <strong className="text-amber-50">지금 단계엔 옵션 B로 충분.</strong>{" "}
              미래에 server-only 기능 추가할 때 그때 마이그레이션 (5-10분 작업).
            </li>
          </ul>
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
