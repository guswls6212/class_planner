"use client";

import Link from "next/link";

const CODE_BLOCK =
  "block rounded-lg border border-white/10 bg-zinc-950/70 p-4 text-xs font-mono text-zinc-100 whitespace-pre overflow-x-auto leading-6";
const ANALOGY_BOX =
  "rounded-xl border border-amber-400/30 bg-amber-400/[0.05] p-5 text-sm text-amber-100 leading-relaxed";
const CARD =
  "rounded-xl border border-white/10 bg-zinc-900/40 p-5 space-y-3";

export default function ReverseProxyExplained() {
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
            Deep Dive · reverse proxy
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Cloudflare 같은 reverse proxy 환경이 뭔지
          </h1>
          <p className="text-base text-zinc-300 leading-relaxed">
            "옵션 C가 Cloudflare에서 깨질 수 있다"의 진짜 의미. 그리고 reverse
            proxy가 왜 거의 모든 웹서비스에 끼어 있는지.
          </p>
        </header>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 1 — Proxy 종류 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ① Proxy가 뭐고 reverse proxy가 뭔지
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-zinc-100">Proxy</strong> = "대신 처리해주는
            중간 다리". 영단어 그대로 "대리인". 클라이언트와 서버 사이에 끼어서
            요청/응답을 중계.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={CARD}>
              <div className="text-xs uppercase tracking-wider text-blue-300 font-medium">
                Forward Proxy (앞 방향)
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">
                "내가 누군지 숨기기 위한 다리"
              </h3>
              <div className="font-mono text-xs text-zinc-300 bg-zinc-950/50 p-3 rounded border border-white/5 leading-7">
                나(클라이언트) → <span className="text-blue-300">[Proxy]</span>{" "}
                → 서버
                <br />
                <span className="text-zinc-500">
                  ↑ 회사 방화벽, VPN, 익명화 도구
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                <strong className="text-zinc-200">예시:</strong> 회사가 직원의
                인터넷 트래픽을 검열할 때, VPN으로 다른 나라 IP처럼 보이게 할
                때, 학교 네트워크가 게임 사이트 차단할 때.
              </p>
              <p className="text-xs text-zinc-400">
                <strong className="text-zinc-200">서버 입장:</strong> "누가
                보냈는지 몰라" (proxy 뒤의 클라이언트 신원 숨김)
              </p>
            </div>

            <div className={CARD + " border-amber-400/40"}>
              <div className="text-xs uppercase tracking-wider text-amber-300 font-medium">
                Reverse Proxy (뒤 방향) ★ 본문 주제
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">
                "서버를 숨기기 위한 다리"
              </h3>
              <div className="font-mono text-xs text-zinc-300 bg-zinc-950/50 p-3 rounded border border-white/5 leading-7">
                나(클라이언트) → <span className="text-amber-300">[Proxy]</span>{" "}
                → 서버
                <br />
                <span className="text-zinc-500">
                  ↑ Cloudflare, Nginx, AWS CloudFront
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                <strong className="text-zinc-200">예시:</strong> Cloudflare가
                class-planner 앞에 끼어 있을 때, Nginx가 Node.js 앞에서 SSL
                처리할 때, AWS Load Balancer가 여러 EC2 서버에 분산할 때.
              </p>
              <p className="text-xs text-zinc-400">
                <strong className="text-zinc-200">클라이언트 입장:</strong>{" "}
                "어떤 서버에서 응답 오는지 몰라" (proxy 뒤의 서버 구조 숨김)
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-5">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3 font-medium">
              한 줄 요약
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">
              누구를 숨기느냐가 다름. <strong>Forward = 클라이언트 숨김.</strong>{" "}
              <strong className="text-amber-200">
                Reverse = 서버 숨김.
              </strong>{" "}
              "Reverse"라는 이름은 "forward의 반대 방향에서 작동"이라는
              뜻이지만, 사용자 입장에선 둘 다 보이지 않는 중간 다리.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — 비유 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ② 비유 — 빌딩 안내 데스크
          </h2>

          <div className={ANALOGY_BOX}>
            <div className="font-bold text-amber-300 mb-2">
              🏢 큰 회사 빌딩에 들어가는 손님
            </div>
            <p>
              회사에 미팅 가는 손님이 1층 안내 데스크에서 안내원과 만남. 손님이
              "김과장님 만나러 왔어요" 하면 안내원이:
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-1 text-amber-100/90">
              <li>김과장이 몇 층 몇 호인지 안내</li>
              <li>방문증 발급 + 보안 검사</li>
              <li>택배가 너무 많이 쌓이면 잠시 보류</li>
              <li>김과장이 바쁘면 박과장이 응대하도록 안내</li>
            </ul>
            <p className="mt-2">
              <strong className="text-amber-200">손님은 김과장 사무실이 어디인지
              모름.</strong> 안내원만 알고 처리. 김과장 사무실이 이사 가도
              안내원만 알면 손님은 영향 없음.
            </p>
            <p className="mt-2">
              <strong className="text-amber-200">안내 데스크 = Reverse Proxy.</strong>{" "}
              김과장 = 실제 서버. 손님 = 사용자. 회사 측이 안내원에게 보안/안내
              일임 → 김과장은 본업(개발/응대)만 집중.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 3 — 왜 쓰나 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ③ 왜 reverse proxy를 쓰나 — 5가지 이유
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                icon: "🌍",
                title: "CDN (Content Delivery Network)",
                desc: "전 세계 200+ 위치에 서버 분산. 한국 사용자는 한국 서버, 미국 사용자는 미국 서버 → 응답 빠름. 정적 파일(이미지, CSS)을 캐싱해서 원본 서버 부담 줄임.",
                color: "blue",
              },
              {
                icon: "🛡️",
                title: "DDoS 방어",
                desc: "공격자가 초당 100만 request 보내도 Cloudflare가 막아냄. 진짜 사용자만 통과. 원본 서버(Lightsail 1GB)는 평소 트래픽만 처리.",
                color: "red",
              },
              {
                icon: "🔒",
                title: "SSL termination",
                desc: "HTTPS 인증서를 Cloudflare에서 처리. 원본 서버는 HTTP로 받음 (내부망). 인증서 갱신/관리 자동.",
                color: "emerald",
              },
              {
                icon: "🤖",
                title: "Bot 차단",
                desc: "스크래퍼, 크롤러 자동 감지/차단. 의심스러운 IP에 CAPTCHA 띄움. 사람만 통과.",
                color: "purple",
              },
              {
                icon: "🚦",
                title: "Rate limiting",
                desc: "한 IP가 분당 100번 이상 보내면 자동 차단. brute force 공격 막음.",
                color: "amber",
              },
              {
                icon: "📊",
                title: "통계/모니터링",
                desc: "트래픽 양, 응답 시간, 에러율 자동 집계. 별도 모니터링 셋업 필요 X (omni-radar는 별개로 더 자세한 정보).",
                color: "zinc",
              },
            ].map((item) => (
              <div key={item.title} className={CARD}>
                <div className="flex items-center gap-2 text-base">
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-semibold text-zinc-100">
                    {item.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-5 text-sm text-emerald-100">
            <div className="font-bold text-emerald-300 mb-2">
              💰 비용 절감 효과가 가장 큰 이유
            </div>
            <p>
              class-planner는 AWS Lightsail 1GB로 시작. 사용자 10명일 땐
              괜찮지만, 갑자기 100명/1000명이 몰리면 서버 다운 위험. Cloudflare
              앞에 두면:
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-1 text-emerald-200/90">
              <li>정적 파일은 Cloudflare가 캐싱 → 원본 서버 호출 X</li>
              <li>봇/공격은 Cloudflare가 막음 → 원본 서버 호출 X</li>
              <li>
                결과적으로 1GB 서버가 1000+ 사용자도 견딤 (캐시 적중률에 따라)
              </li>
            </ul>
            <p className="mt-2 text-emerald-200/80">
              Cloudflare 무료 플랜으로 위 대부분 가능.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 4 — HTTP header 변환 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ④ HTTP header가 어떻게 바뀌나
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            Reverse proxy를 통과하면 서버가 받는 HTTP request의 일부 header가
            바뀝니다. 옵션 C가 깨질 수 있는 이유가 여기 있음.
          </p>

          {/* No proxy */}
          <div className={CARD}>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              경우 A — Proxy 없음 (개발 환경)
            </div>
            <div className="font-mono text-xs text-zinc-300 bg-zinc-950/50 p-3 rounded border border-white/5">
              사용자 (Chrome) → 직접 → Lightsail (localhost:3000)
            </div>
            <pre className={CODE_BLOCK}>
              <span className="text-zinc-500">// 서버가 받는 header</span>
              {"\n"}
              Host:{" "}
              <span className="text-emerald-300">localhost:3000</span>
              {"\n"}
              Origin:{" "}
              <span className="text-emerald-300">http://localhost:3000</span>
            </pre>
            <p className="text-xs text-zinc-400">
              사용자가 보고 있는 진짜 URL이 Host에 그대로 옴.{" "}
              <code className="text-amber-300">
                request.headers.get("host")
              </code>
              로 추출 → 정확.
            </p>
          </div>

          {/* With proxy */}
          <div className={CARD + " border-amber-400/40"}>
            <div className="text-xs uppercase tracking-wider text-amber-300 font-medium">
              경우 B — Cloudflare 끼어 있음 (production)
            </div>
            <div className="font-mono text-xs text-zinc-300 bg-zinc-950/50 p-3 rounded border border-white/5 leading-7">
              사용자 (Chrome) → <span className="text-amber-300">Cloudflare</span>{" "}
              → Lightsail (origin-server.xxx.cloudflare.com)
            </div>
            <pre className={CODE_BLOCK}>
              <span className="text-zinc-500">// 서버가 받는 header (Cloudflare가 다시 만듦)</span>
              {"\n"}
              Host:{" "}
              <span className="text-red-300">
                origin-server.xxx.cloudflare.com
              </span>{" "}
              <span className="text-red-400">{"// ←"}</span>
              {"\n"}
              {"   "}
              <span className="text-red-400">
                {"// 진짜 사용자가 본 URL 아님!"}
              </span>
              {"\n"}
              <span className="text-emerald-300">X-Forwarded-Host</span>:{" "}
              <span className="text-emerald-300">
                class-planner.info365.studio
              </span>{" "}
              <span className="text-emerald-400">{"// ←"}</span>
              {"\n"}
              {"   "}
              <span className="text-emerald-400">
                {"// 진짜 사용자 host는 여기 보존"}
              </span>
              {"\n"}
              <span className="text-emerald-300">X-Forwarded-Proto</span>:{" "}
              <span className="text-emerald-300">https</span>{" "}
              <span className="text-zinc-500">{"// http/https"}</span>
              {"\n"}
              <span className="text-emerald-300">X-Forwarded-For</span>:{" "}
              <span className="text-emerald-300">203.0.113.42</span>{" "}
              <span className="text-zinc-500">{"// 사용자 진짜 IP"}</span>
              {"\n"}
              <span className="text-emerald-300">CF-Connecting-IP</span>:{" "}
              <span className="text-emerald-300">203.0.113.42</span>{" "}
              <span className="text-zinc-500">{"// Cloudflare 전용"}</span>
            </pre>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <code className="text-red-300">request.headers.get("host")</code>{" "}
              하면 <code>origin-server.xxx.cloudflare.com</code> 같은 내부 호스트
              나옴 → 사용자에게 보여줄 URL로 부적절.{" "}
              <code className="text-emerald-300">
                request.headers.get("x-forwarded-host")
              </code>{" "}
              먼저 확인하고 없을 때 host fallback이 정답.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 5 — 옵션 C 깨지는 이유 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ⑤ 그래서 옵션 C가 Cloudflare에서 "깨질 수 있다"의 의미
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            메인 mockup의 옵션 C는 이렇게 적혀 있었음:
          </p>

          <pre className={CODE_BLOCK}>
            <span className="text-blue-300">const</span> origin =
            request.headers.get(<span className="text-emerald-300">"origin"</span>);
            {"\n"}
            <span className="text-blue-300">const</span> appUrl = origin && ALLOWED_ORIGINS.includes(origin)
            {"\n"}{"  "}? origin
            {"\n"}{"  "}: <span className="text-emerald-300">"https://class-planner.info365.studio"</span>;
          </pre>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-red-400/30 bg-red-400/[0.04] p-5 space-y-2">
              <div className="font-semibold text-red-200">
                😱 Cloudflare 끼면 일어날 수 있는 일
              </div>
              <ol className="text-sm text-red-100/90 ml-5 list-decimal space-y-1.5">
                <li>
                  <code>Origin</code> 헤더가 안 올 수도 있음 (Cloudflare 설정에
                  따라). same-origin 요청은 Origin 안 보냄.
                </li>
                <li>
                  대신 <code>Host</code>를 쓰면{" "}
                  <code>origin-server.xxx.cloudflare.com</code>
                </li>
                <li>
                  fallback 발동 → <code>https://class-planner.info365.studio</code>
                </li>
                <li>
                  prod에선 우연히 동작 (allowlist에 prod URL이라). 다른 도메인
                  추가하거나 staging 환경에선 깨짐.
                </li>
              </ol>
            </div>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-5 space-y-2">
              <div className="font-semibold text-emerald-200">
                😎 Cloudflare 알고 쓰면
              </div>
              <ol className="text-sm text-emerald-100/90 ml-5 list-decimal space-y-1.5">
                <li>
                  <code>x-forwarded-host</code> 먼저 확인 (사용자 진짜 host)
                </li>
                <li>없으면 <code>host</code> fallback (proxy 없는 dev 환경)</li>
                <li>
                  <code>x-forwarded-proto</code>로 protocol 결정
                </li>
                <li>
                  여전히 보안 위해 ALLOWED_HOSTS allowlist 검증 (header
                  injection 공격 방어)
                </li>
              </ol>
            </div>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.04] p-5 text-sm text-amber-100">
            <div className="font-bold text-amber-300 mb-2">
              🔐 보안 주의 — Host Header Injection
            </div>
            <p>
              악성 사용자가 <code>Host</code> header를 조작해서 보낼 수 있음.
              만약 서버가 그 host를 그대로 share URL에 박으면:
            </p>
            <pre className="mt-2 text-xs font-mono bg-zinc-950/60 p-3 rounded border border-amber-400/20 text-amber-50">
              {"// 공격자가 보낸 request"}
              {"\n"}Host: attacker-phishing.com
              {"\n"}
              {"\n// 서버가 만든 URL"}
              {"\n"}https://attacker-phishing.com/share/xxx
              {"\n"}
              {"\n// 이게 이메일로 발송되면..."}
              {"\n// 받는 사람이 attacker-phishing.com 클릭 → 피싱"}
            </pre>
            <p className="mt-2 text-amber-200/90">
              그래서 <strong>ALLOWED_HOSTS allowlist 검증 의무</strong>. host가
              allowlist에 없으면 default 사용. 또는 startup 시 명시한{" "}
              <code>PUBLIC_BASE_URL</code> env만 신뢰.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 6 — class-planner 실제 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            ⑥ class-planner는 지금 어떤 환경?
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            ARCHITECTURE.md / CLAUDE.md 기준: AWS Lightsail 1GB + Nginx +
            Let&apos;s Encrypt + Supabase. <strong>Cloudflare는 현재 안 씀.</strong>{" "}
            다만 미래에 트래픽 증가 시 Cloudflare 도입 가능성 큼 (무료).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={CARD}>
              <div className="font-semibold text-zinc-100">현재 (No proxy)</div>
              <div className="font-mono text-xs text-zinc-300 bg-zinc-950/50 p-3 rounded border border-white/5 leading-7">
                사용자 → DNS → Lightsail Nginx → Next.js
              </div>
              <p className="text-xs text-zinc-400">
                Nginx도 일종의 reverse proxy(SSL termination, port 443→3000).
                다만 같은 머신 안이라 header 변환 거의 없음. <code>host</code>
                헤더 그대로 옴.
              </p>
            </div>
            <div className={CARD}>
              <div className="font-semibold text-zinc-100">
                미래 (Cloudflare 추가)
              </div>
              <div className="font-mono text-xs text-zinc-300 bg-zinc-950/50 p-3 rounded border border-white/5 leading-7">
                사용자 → Cloudflare → Lightsail Nginx → Next.js
              </div>
              <p className="text-xs text-zinc-400">
                트래픽 증가하면 자연스러운 추가. 지금 옵션 C 작성해도 미래에 도입
                시 <code>x-forwarded-host</code> 추가 처리 필요. 즉 옵션 C는 "현재
                동작 ✓, 미래 ?" 상태.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-5 text-sm text-emerald-100">
            <div className="font-bold text-emerald-300 mb-2">
              ✓ 결론 — 가장 robust한 방향
            </div>
            <p>
              <code>PUBLIC_BASE_URL</code> env를 명시적으로 두는 게 가장 단순하고
              안전. proxy 환경 무관하게 동작:
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-1 text-emerald-200/90">
              <li>dev: <code>PUBLIC_BASE_URL=http://localhost:3000</code></li>
              <li>
                staging:{" "}
                <code>PUBLIC_BASE_URL=https://staging.class-planner.info365.studio</code>
              </li>
              <li>
                prod:{" "}
                <code>PUBLIC_BASE_URL=https://class-planner.info365.studio</code>
              </li>
            </ul>
            <p className="mt-3 text-emerald-200/90">
              header 추출은 폴리쉬 (선택). env 명시 + header fallback이 가장 견고.
            </p>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* SECTION 7 — 수정 계획 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="space-y-5 scroll-mt-8" id="plan">
          <h2 className="text-2xl font-bold">
            ⑦ 그래서 수정 계획 (server-only 미리 대비)
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            사용자가 "server-only 미리 고려해서 수정 진행"을 원함. 단순 옵션 B
            대신 helper + env로 미래까지 대비.
          </p>

          <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.06] p-6 space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-medium border border-amber-400/40">
                ★ 추천 계획
              </span>
              <h3 className="text-lg font-semibold">
                옵션 B (client build) + helper + env (~25분)
              </h3>
            </div>

            <ol className="text-sm text-zinc-200 space-y-3 ml-5 list-decimal">
              <li>
                <strong className="text-zinc-100">새 helper 파일</strong>{" "}
                <code className="text-amber-300">src/lib/getPublicBaseUrl.ts</code>{" "}
                생성:
                <ul className="ml-5 list-disc text-zinc-400 text-xs mt-1 space-y-0.5">
                  <li>
                    <code>getClientBaseUrl()</code> — 브라우저용 (
                    <code>window.location.origin</code> wrap)
                  </li>
                  <li>
                    <code>getServerBaseUrl(request?)</code> — 서버용 (env 우선,
                    <code>x-forwarded-host</code> fallback, allowlist 검증)
                  </li>
                </ul>
              </li>
              <li>
                <code className="text-amber-300">
                  src/app/api/share-tokens/from-invite/route.ts
                </code>{" "}
                수정:
                <ul className="ml-5 list-disc text-zinc-400 text-xs mt-1 space-y-0.5">
                  <li>
                    hardcode fallback 제거 →{" "}
                    <code>getServerBaseUrl(request)</code> 사용
                  </li>
                  <li>shareUrl 그대로 반환 (구조 유지)</li>
                </ul>
              </li>
              <li>
                <code className="text-amber-300">
                  src/app/api/invites/route.ts
                </code>{" "}
                만료 env 변수화 → <code>INVITE_EXPIRES_HOURS</code> (default 24)
              </li>
              <li>
                <code className="text-amber-300">.env.example</code> /{" "}
                <code className="text-amber-300">.env.local</code> 추가:
                <pre className="text-xs font-mono bg-zinc-950/50 p-2 rounded mt-1 text-zinc-300 border border-white/5">
                  PUBLIC_BASE_URL=http://localhost:3000
                  {"\n"}INVITE_EXPIRES_HOURS=168
                </pre>
              </li>
              <li>
                관련 테스트 업데이트 + 새 helper unit test 작성 (3-4 case)
              </li>
              <li>
                <code className="text-amber-300">
                  src/middleware/cors.ts
                </code>{" "}
                의 ALLOWED_ORIGINS도 같은 env 기반으로 통일 (선택, 별 PR 가능)
              </li>
            </ol>

            <div className="pt-3 border-t border-amber-400/20 text-xs text-amber-200/80 leading-relaxed">
              <strong className="text-amber-100">왜 이 방향?</strong>
              <ul className="mt-1 ml-5 list-disc space-y-0.5">
                <li>
                  client flow는{" "}
                  <code className="text-amber-200">getClientBaseUrl()</code>{" "}
                  자체로 OK (지금 share-link flow)
                </li>
                <li>
                  미래 이메일/SMS/cron 추가 시{" "}
                  <code className="text-amber-200">getServerBaseUrl()</code> 그냥
                  사용 — 추가 작업 0
                </li>
                <li>
                  Cloudflare 추가해도{" "}
                  <code>x-forwarded-host</code> 자동 처리
                </li>
                <li>
                  hardcode fallback 영영 사라짐
                </li>
              </ul>
            </div>
          </div>

          <div className="text-sm text-zinc-400 text-center pt-3">
            계획 OK면 메인 응답에서 "GO" 해주세요. 다른 방향이면 자유 답변.
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
