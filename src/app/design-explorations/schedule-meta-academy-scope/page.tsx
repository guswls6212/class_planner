"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Database,
  Key,
  ArrowRight,
  Bell,
  BellOff,
  Building2,
  UserCheck,
  Clock,
} from "lucide-react";

/**
 * "시간표가 새로 갱신되었어요" false-positive 토스트 진단 + fix 시각화
 *
 * 사용자 보고 (2026-05-23):
 *   "처음 관리자로 로그인하니까 '시간표가 새로 갱신되었어요. 새로고침할까요?'
 *    이 토스트메세지가뜨는데 아직 fix가 안된건가?"
 *
 * 검증 데이터 (radar + DB):
 *   - 박관리자 nowastedclicks (user 0611d53a) UAT Test Academy (bcde9c91) admin 가입
 *     joined_at = 2026-05-23 13:58:44 UTC
 *   - UAT Test Academy schedule_updated_at = 2026-05-23 13:57:49 UTC (가입 55초 전)
 *   - 박관리자 localStorage lastViewedAt_schedule = 2026-05-23 12:57:10 UTC
 *     ↳ 다른 academy (e631524b) 에서 1시간 전 set 된 stale value
 *   - 가입 직후 13:58:46 schedule 진입 → fetchMeta 응답 13:57:49 > stale 12:57:10
 *     → hasChanges=true → 토스트 발화
 *
 * Root cause:
 *   `lastViewedKey(userId)` 가 academy 별 분리 X.
 *   multi-academy user 가 academy A → B 로 switch 시, A 의 lastViewed 가
 *   B 의 schedule_updated_at 비교 baseline 으로 잘못 사용됨.
 */
export default function ScheduleMetaAcademyScopePage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Header />
        <UserReport />
        <RealTimeline />
        <RootCause />
        <FixOption1 />
        <FixOption2 />
        <CombinedFix />
        <CodeChanges />
        <FinalRecommendation />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold mb-2">시간표 갱신 토스트 false-positive 진단</h1>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
        PR #458 이후에도 박관리자(invitee admin) 가 schedule 진입 시 토스트가 뜨는
        문제. radar 로그 + DB 직접 확인 결과 — PR #458 의 fix 분기가 우회되는
        다른 경로 발견.
      </p>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
        <Info className="w-3.5 h-3.5" /> 실제 영향 파일 —
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">src/hooks/useScheduleMeta.ts</code>
        +
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">src/app/api/academies/active/schedule-meta/route.ts</code>
      </div>
    </header>
  );
}

function UserReport() {
  return (
    <section className="mb-10">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold mb-1">사용자 보고</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              "처음 관리자로 로그인하니까 '시간표가 새로 갱신되었어요. 새로고침할까요?'
              이 토스트메세지가뜨는데 아직 fix가 안된건가?"
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RealTimeline() {
  const steps = [
    {
      t: "12:57:10 UTC",
      title: "stale lastViewed set",
      detail:
        "박관리자가 다른 academy (e631524b) 에서 schedule 페이지 진입 — useScheduleMeta 가 PR #458 의 (a') 분기 정상 작동, lastViewedAt 키에 그 academy 의 schedule_updated_at 저장",
      kind: "neutral",
    },
    {
      t: "12:58:48 UTC",
      title: "polling 시작",
      detail: "schedule-meta API 첫 GET 200, e631524b 의 schedule_updated_at 응답 = 12:57:10",
      kind: "neutral",
    },
    {
      t: "13:57:49 UTC",
      title: "UAT Test Academy schedule_updated_at bump",
      detail: "owner 가 UAT Test Academy 의 sessions 변경 — schedule_updated_at = 13:57:49 (DB 트리거)",
      kind: "neutral",
    },
    {
      t: "13:58:44 UTC",
      title: "박관리자 UAT Test Academy admin 가입",
      detail:
        "invite accept → academy_members INSERT (academy_id=bcde9c91, role=admin, joined_at=13:58:44). schedule_updated_at 보다 55초 늦음",
      kind: "neutral",
    },
    {
      t: "13:58:46 UTC",
      title: "토스트 false-positive 발화",
      detail:
        "schedule 페이지 진입 → fetchMeta(UAT Test Academy) → next=13:57:49 → lastViewed=12:57:10 (다른 academy 잔존) < next → hasChanges=true → 토스트 발화",
      kind: "bad",
    },
  ];

  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4">실제 사건 타임라인 (radar + DB 직접 검증)</h2>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li
            key={i}
            className={`flex gap-4 rounded-lg border p-4 ${
              s.kind === "bad"
                ? "border-red-500/40 bg-red-500/5"
                : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40"
            }`}
          >
            <div className="flex-shrink-0 w-32">
              <div className="text-[11px] font-mono text-[var(--color-text-muted)]">{s.t}</div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">step {i + 1}</div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm mb-1 flex items-center gap-2">
                {s.kind === "bad" ? (
                  <Bell className="w-4 h-4 text-red-400" />
                ) : (
                  <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                )}
                {s.title}
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RootCause() {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4">Root cause — localStorage key 가 academy 별 분리 안 함</h2>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium">현재 코드 (useScheduleMeta.ts:37-38)</span>
        </div>
        <pre className="text-xs font-mono bg-black/30 rounded p-3 overflow-x-auto mb-4">
{`const lastViewedKey = (userId: string) =>
  \`class_planner_\${userId}_lastViewedAt_schedule\`;`}
        </pre>
        <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
          <p>
            <strong className="text-amber-400">문제:</strong> 키에 userId 만 포함. 같은 user 가
            여러 academy 를 오가도 같은 키 하나만 사용.
          </p>
          <p>
            박관리자가 academy A 에서 schedule 진입 → lastViewedAt(A 의 timestamp) 저장.
            그 후 academy B (UAT Test Academy) invite accept → B 첫 진입 시 PR #458 의{" "}
            <code className="px-1 rounded bg-black/30">if (!lastViewed)</code> 분기가{" "}
            <strong className="text-red-400">우회됨</strong> — lastViewed 는 A 의 stale value
            이지만 키가 같아서 "이미 본 적 있음"으로 인식.
          </p>
          <p>
            결과: A 의 stale baseline 으로 B 의 schedule_updated_at 비교 → false-positive 토스트.
          </p>
        </div>
      </div>
    </section>
  );
}

function FixOption1() {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-emerald-400" />
        Fix 분기 1 — lastViewedKey 에 academyId 포함
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-red-400">
            <BellOff className="w-4 h-4" /> 현재 (bug)
          </div>
          <pre className="text-[11px] font-mono bg-black/30 rounded p-3 overflow-x-auto">
{`localStorage:
  class_planner_{user}_lastViewedAt_schedule
  = "12:57:10" (academy A 시점)

academy B 첫 진입 시:
  if (!lastViewed) → false (key 존재)
  next (B) = "13:57:49"
  lastViewed (A) = "12:57:10"
  13:57:49 > 12:57:10
  → hasChanges = true
  → 토스트 발화 ❌`}
          </pre>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Fix 후
          </div>
          <pre className="text-[11px] font-mono bg-black/30 rounded p-3 overflow-x-auto">
{`localStorage:
  class_planner_{user}_{A}_lastViewedAt_schedule
  = "12:57:10"
  class_planner_{user}_{B}_lastViewedAt_schedule
  = (없음)

academy B 첫 진입 시:
  if (!lastViewed) → true (key 없음)
  → PR #458 ack 분기 작동
  → set lastViewed(B) = next
  → 토스트 안 발화 ✅`}
          </pre>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        효과: academy switch 시 false-positive 차단. 단, 같은 academy 에 탈퇴-재가입 케이스는
        localStorage 잔존으로 여전히 우회됨 → Fix 분기 2 필요.
      </p>
    </section>
  );
}

function FixOption2() {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-emerald-400" />
        Fix 분기 2 — server 의 joined_at 기준 자동 ack
      </h2>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4 mb-3">
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          schedule-meta API response 확장
        </div>
        <pre className="text-[11px] font-mono bg-black/30 rounded p-3 overflow-x-auto">
{`// 현재
{ scheduleUpdatedAt: string | null }

// Fix 후
{
  scheduleUpdatedAt: string | null,
  memberJoinedAt: string | null,  // ← academy_members.joined_at
}`}
        </pre>
      </div>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4">
        <div className="text-sm font-medium mb-2">useScheduleMeta 비교 로직</div>
        <pre className="text-[11px] font-mono bg-black/30 rounded p-3 overflow-x-auto">
{`// 새 분기 — (a") 가입 이전 변동은 알릴 가치 X
if (memberJoinedAt) {
  const joinedTs = new Date(memberJoinedAt).getTime();
  if (serverTs <= joinedTs) {
    // 박관리자 가입 (13:58:44) 이전의 schedule 변동 (13:57:49) →
    // 본인이 알아야 할 가치 없음. 자동 ack.
    localStorage.setItem(lastViewedKey, next);
    return;
  }
}`}
        </pre>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        효과: 같은 academy 에 탈퇴-재가입 + invite accept 직후 stale schedule_updated_at 모두 해결.
        server 가 진실의 source — 클라이언트 localStorage 잔존과 무관하게 강건.
      </p>
    </section>
  );
}

function CombinedFix() {
  const flow = [
    "박관리자 UAT Test Academy invite accept (joined_at = 13:58:44)",
    "schedule 페이지 진입 → fetchMeta(UAT Test Academy)",
    "응답: { scheduleUpdatedAt: '13:57:49', memberJoinedAt: '13:58:44' }",
    "분기 (a\") 검사 — serverTs(13:57:49) <= joinedTs(13:58:44) ✅ → 자동 ack",
    "localStorage.setItem(class_planner_{user}_{UAT}_lastViewedAt_schedule, '13:57:49')",
    "hasChanges 안 set → 토스트 발화 안 함 ✅",
    "(다음 polling) 만약 그 후 owner 가 sessions 변경 → bump → 그건 가입 이후 → 정상 알림",
  ];
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3">두 분기 결합 — 박관리자 시나리오 재현</h2>
      <ol className="space-y-2">
        {flow.map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 px-4 py-2.5"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CodeChanges() {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3">코드 변경 요약</h2>
      <div className="space-y-3">
        <ChangeCard
          file="src/hooks/useScheduleMeta.ts"
          lines="~15 lines"
          desc="lastViewedKey(userId, academyId) 시그니처 변경 + joined_at 자동 ack 분기 추가 + useScheduleMeta(userId, academyId) 시그니처 변경"
        />
        <ChangeCard
          file="src/app/api/academies/active/schedule-meta/route.ts"
          lines="~10 lines"
          desc="academy_members.joined_at SELECT 추가 + response 에 memberJoinedAt + activeAcademyId 포함"
        />
        <ChangeCard
          file="src/app/schedule/page.tsx"
          lines="~3 lines"
          desc="useScheduleMeta(userId) → useScheduleMeta(userId, activeAcademyId) — activeAcademyId 는 ScheduleHeader 가 이미 추적 중"
        />
        <ChangeCard
          file="src/hooks/__tests__/useScheduleMeta.test.ts (신규)"
          lines="~80 lines"
          desc="joined_at ack 분기 단위 테스트 + academy switch 시나리오 + 기존 (a') 분기 회귀 가드"
        />
        <ChangeCard
          file="src/app/api/.../schedule-meta/__tests__/route.test.ts"
          lines="~20 lines"
          desc="memberJoinedAt 반환 검증 + 비멤버 academy 요청 시 동작"
        />
      </div>
    </section>
  );
}

function ChangeCard({ file, lines, desc }: { file: string; lines: string; desc: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <code className="text-xs font-mono text-emerald-300">{file}</code>
        <span className="text-[10px] text-[var(--color-text-muted)]">{lines}</span>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
    </div>
  );
}

function FinalRecommendation() {
  return (
    <section>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-lg mb-2">제안 — 두 분기 같이 도입</h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
              방어 깊이 (defense in depth) — localStorage 잔존 / academy switch / 탈퇴-재가입
              세 가지 케이스 모두 막힘. server-side joined_at 가 단일 진실의 source.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Badge label="useScheduleMeta.ts" />
              <Badge label="schedule-meta/route.ts" />
              <Badge label="schedule/page.tsx" />
              <Badge label="unit tests" />
              <Badge label="ArrowRight" icon={<ArrowRight className="w-3 h-3" />} />
              <Badge label="PR on dev" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[var(--color-text-secondary)]">
      {icon}
      {label}
    </span>
  );
}
