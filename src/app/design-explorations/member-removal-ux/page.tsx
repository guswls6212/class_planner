"use client";

import { useState } from "react";
import {
  Crown,
  Shield,
  GraduationCap,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Undo2,
  UserX,
  UserMinus,
  Calendar,
  Keyboard,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";

/**
 * 멤버 삭제 (kick / remove) UX 재설계 mockup.
 *
 * 사용자 의문 (2026-05-23):
 *   현재 ⋯ 메뉴에 "초대 취소" 만 있고 가입 멤버 삭제 (academy_members DELETE) 액션이
 *   메뉴에 없음. 어떻게 우아하게 설계할 것인가?
 *
 * 진단 (코드):
 *   - settings/page.tsx getMenuItems("active") 의 "kick" 항목은 disabled placeholder
 *   - 의도된 액션: 가입된 admin/member 의 academy_members row 삭제
 *   - 영향: 멤버는 학원 접근 권한 잃음, 강사 row (teachers) 는 보존 가능 (user_id = null 로 복원)
 *
 * 초대 취소 vs 멤버 삭제 차이:
 *   - 초대 취소: invite_tokens DELETE (수락 전, 가입 안 됨, 가벼움)
 *   - 멤버 삭제: academy_members DELETE (수락 후, 가입됨, 권한 회수 + 데이터 영향)
 */

export default function MemberRemovalUxPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Header />
        <Diagnosis />
        <Section variants={["A", "B", "C", "D"]} />
        <SectionE_Bonus />
        <FinalRecommendation />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold mb-2">멤버 삭제 UX 재설계</h1>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
        가입된 관리자/강사를 학원에서 제외하는 액션의 인터랙션 디자인. 영향이 크므로
        실수 방지 + 회복 가능성 + 데이터 보존을 동시에 충족하는 패턴 비교.
      </p>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
        <Info className="w-3.5 h-3.5" /> 적용 대상 — <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)]">/settings</code>의 active 멤버 row (kick 액션). 초대 취소(invite_tokens) 와는 다른 액션
      </div>
    </header>
  );
}

function Diagnosis() {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-4">현재 상태 + 핵심 고려 사항</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <h3 className="text-[14px] font-semibold">현재 코드 상태</h3>
          </div>
          <ul className="text-[12px] space-y-1.5 text-[var(--color-text-secondary)]">
            <li>• <code>getMenuItems(&quot;active&quot;)</code> 의 <code>kick</code> 항목 — <strong>disabled placeholder</strong></li>
            <li>• 메뉴: 권한 변경 / 강사 정보(disabled) / 팀에서 제외(disabled)</li>
            <li>• API endpoint 미구현 — <code>DELETE /api/academy/members/[userId]</code> 등 필요</li>
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-indigo-300" />
            <h3 className="text-[14px] font-semibold">초대 취소 vs 멤버 삭제 — 명확히 분리</h3>
          </div>
          <table className="w-full text-[12px]">
            <thead className="text-[var(--color-text-muted)]">
              <tr><th className="text-left font-medium pb-1">액션</th><th className="text-left font-medium pb-1">대상</th><th className="text-left font-medium pb-1">DB</th></tr>
            </thead>
            <tbody className="text-[var(--color-text-secondary)]">
              <tr><td className="py-0.5">초대 취소</td><td>수락 전</td><td>invite_tokens DELETE</td></tr>
              <tr><td className="py-0.5">멤버 삭제</td><td>가입 멤버</td><td>academy_members DELETE</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 p-4">
        <h3 className="text-[14px] font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-300" />
          설계 시 고려 사항 (5)
        </h3>
        <ol className="text-[13px] space-y-1.5 text-[var(--color-text-secondary)] list-decimal pl-5">
          <li><strong>영향 가시화</strong> — 멤버가 만든 데이터(담당 수업, 강사 row, 공유 링크) 어떻게 처리되는지 명시</li>
          <li><strong>실수 방지</strong> — 영구 액션. 한 번 클릭으로 끝나면 위험</li>
          <li><strong>회복 가능성</strong> — Undo 또는 재초대 흐름 (잘못 눌렀을 때 5초 안에 되돌리기)</li>
          <li><strong>데이터 보존</strong> — academy_members 만 끊고 teachers row 는 유지 (user_id=null) 또는 함께 삭제 선택지</li>
          <li><strong>권한 안전</strong> — owner 만 가능? admin 도 admin/member 제외 가능? 원장 자신은 제외 불가</li>
        </ol>
      </div>
    </section>
  );
}

function Section({ variants }: { variants: ("A" | "B" | "C" | "D")[] }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-5">Variant A / B / C / D</h2>
      <div className="space-y-5">
        {variants.includes("A") && <VariantA />}
        {variants.includes("B") && <VariantB />}
        {variants.includes("C") && <VariantC />}
        {variants.includes("D") && <VariantD />}
      </div>
    </section>
  );
}

function VariantHeader({
  letter,
  title,
  tagline,
  recommended,
  pros,
  cons,
}: {
  letter: string;
  title: string;
  tagline: string;
  recommended?: boolean;
  pros: string[];
  cons: string[];
}) {
  return (
    <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30 rounded-t-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-indigo-400/15 text-indigo-300 text-xs font-bold">
          {letter}
        </span>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {recommended && (
          <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Recommended
          </span>
        )}
      </div>
      <p className="text-[12px] text-[var(--color-text-muted)] mb-2">{tagline}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-[12px]">
        <ul className="space-y-1">
          {pros.map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-emerald-300/90">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <ul className="space-y-1">
          {cons.map((c) => (
            <li key={c} className="flex items-start gap-1.5 text-amber-300/80">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ===== Variant A — Confirm modal + 영향 미리보기 ===== */
function VariantA() {
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="A"
        title="Confirm modal + 영향 미리보기"
        tagline="단순 확인. 멤버 정보 + 잃는 권한 + 보존 데이터 명시"
        pros={["일반적이고 친숙", "데이터 영향 한눈에", "구현 단순"]}
        cons={["실수 방지 약함 (한 번 클릭이면 끝)", "undo 없음"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)]">
        {/* mock confirm modal */}
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400 flex-shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">박관리자님을 학원에서 제외하시겠습니까?</h3>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1">관리자 권한 · 가입 2026-04-15</p>
            </div>
          </div>

          <div className="rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] p-3 mb-4 space-y-1.5 text-[12px]">
            <p className="text-[var(--color-text-muted)] uppercase tracking-wide text-[10px] font-semibold mb-1">제외 시 영향</p>
            <p className="flex items-start gap-1.5"><span className="text-amber-300">!</span> 학원 데이터 접근 권한 즉시 차단</p>
            <p className="flex items-start gap-1.5"><span className="text-emerald-300">✓</span> 박관리자가 만든 수업 12개 — 그대로 보존</p>
            <p className="flex items-start gap-1.5"><span className="text-emerald-300">✓</span> 연결된 강사 row "박코치" — 보존 (user_id 만 초기화)</p>
            <p className="flex items-start gap-1.5"><span className="text-[var(--color-text-muted)]">i</span> 재가입은 새 초대 발급 필요</p>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm">취소</button>
            <button className="flex-1 py-2 bg-red-500/90 text-white rounded-lg text-sm font-semibold">제외하기</button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ===== Variant B — Typing confirmation ===== */
function VariantB() {
  const [typed, setTyped] = useState("");
  const target = "박관리자";
  const match = typed === target;
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="B"
        title="이름 타이핑 확인 (GitHub repo delete 패턴)"
        tagline="멤버 이름을 정확히 타이핑해야 활성화. 최고 안전성."
        pros={["실수 0", "사용자에게 무게감 인지", "권한 회수의 영구성 강조"]}
        cons={["프리미엄/대형 팀 느낌 (소규모엔 과함)", "발음 어려운 이름 typing 불편"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)]">
        <div className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-[var(--color-bg-secondary)] p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400 flex-shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">박관리자님을 제외하시겠습니까?</h3>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1">관리자 권한 즉시 회수 · 12개 수업 보존</p>
            </div>
          </div>

          <p className="text-[12px] text-[var(--color-text-secondary)] mb-2">
            확인을 위해 <code className="px-1.5 py-0.5 rounded bg-black/30 text-red-300">{target}</code> 를 정확히 입력해주세요:
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm mb-3 font-mono"
            placeholder={target}
          />

          <div className="flex gap-2">
            <button className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm">취소</button>
            <button
              disabled={!match}
              className="flex-1 py-2 bg-red-500/90 text-white rounded-lg text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {match ? "박관리자 제외하기" : "이름을 정확히 입력하세요"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ===== Variant C — Sticky undo banner (soft delete + Gmail pattern) ===== */
function VariantC() {
  const [removed, setRemoved] = useState(false);
  return (
    <article className="rounded-xl border border-emerald-400/30 overflow-hidden ring-1 ring-emerald-400/20">
      <VariantHeader
        letter="C"
        title="즉시 제거 + 5초 undo banner (Gmail 패턴, Recommended)"
        tagline="confirm 없이 클릭 즉시 dimming + 토스트 'X님이 제외되었습니다 · 되돌리기'. 5초 안 클릭하면 회복"
        recommended
        pros={[
          "1-click 빠른 흐름 + 안전성 (5초 회복)",
          "모던하고 우아한 패턴 (Gmail/Slack/Notion 채택)",
          "modal 인터럽트 없음",
          "실수해도 즉시 복구 가능",
        ]}
        cons={[
          "5초 안 페이지 떠나면 회복 불가 (네비게이션 가드 필요)",
          "DELETE 후 5초 안 undo → server side soft-delete 또는 deferred-commit 패턴 필요",
        ]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)] space-y-3">
        <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
          1) 사용자 클릭 — row 즉시 dimming + 토스트 출현 (5초 카운트다운)
        </p>
        <div className="space-y-2">
          {/* dimmed admin row */}
          <div
            className={`flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] transition-opacity ${removed ? "opacity-40" : ""}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-400/15 text-blue-300 text-sm font-bold flex-shrink-0">
                박
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">박관리자</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-300 font-semibold">관리자</span>
                  {removed && <span className="text-[11px] text-red-400">· 제외됨</span>}
                </div>
                <p className="text-[12px] text-[var(--color-text-muted)]">park@example.com</p>
              </div>
            </div>
            {!removed && (
              <button
                onClick={() => setRemoved(true)}
                className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* sticky undo banner */}
        {removed && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 text-[13px]">
              <UserMinus className="w-4 h-4 text-red-400" />
              <span>박관리자님이 학원에서 제외되었습니다 · 5초 내 되돌리기 가능</span>
            </div>
            <button
              onClick={() => setRemoved(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-amber-400/15 text-amber-300 text-[12px] font-semibold"
            >
              <Undo2 className="w-3.5 h-3.5" /> 되돌리기
            </button>
          </div>
        )}

        {!removed && (
          <p className="text-[11px] text-[var(--color-text-muted)] mt-3">
            <span className="text-emerald-300">▶</span> 위 박관리자 행의 ⋯ 메뉴에서 "팀에서 제외" 클릭 후 시뮬레이션
          </p>
        )}

        <div className="mt-4 p-3 rounded-lg bg-[var(--color-bg-secondary)]/40 text-[11px] text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text-secondary)]">구현 메모</strong> — server 측 <code>deleted_at</code> 컬럼 추가 (soft delete) + 5초 cron 또는 client deferred commit. dev-pack ADR-012 의 deferred-commit + await 패턴 그대로 응용 가능.
        </div>
      </div>
    </article>
  );
}

/* ===== Variant D — Down-grade trio (제외 + 강사로 좌천 + 강사도 삭제) ===== */
function VariantD() {
  return (
    <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <VariantHeader
        letter="D"
        title="단계적 다운그레이드 옵션"
        tagline="삭제 대신 권한 축소 선택지 제공 — admin → member, member → 강사 정보만 보존"
        pros={["부드러운 transition", "데이터 보존 명확히 선택", "협업 친화적"]}
        cons={["선택지 늘어남 (학습 비용)", "C 와 결합 시 복잡도 ↑"]}
      />
      <div className="p-5 bg-[var(--color-bg-primary)]">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-bold mb-1">박관리자 처리 방식 선택</h3>
          <p className="text-[12px] text-[var(--color-text-muted)] mb-4">단계적으로 권한을 줄이거나 완전히 제외할 수 있습니다</p>

          <div className="space-y-2.5">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border)] cursor-pointer hover:bg-white/5">
              <input type="radio" name="action" defaultChecked className="mt-1 accent-amber-400" />
              <div>
                <p className="font-medium text-sm">권한만 강사로 다운그레이드 <span className="text-amber-300 text-[11px]">(추천)</span></p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">관리자 권한 회수. 본인 시간표만 조회 가능. 계정·데이터 그대로</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border)] cursor-pointer hover:bg-white/5">
              <input type="radio" name="action" className="mt-1 accent-amber-400" />
              <div>
                <p className="font-medium text-sm">학원에서 제외 (강사 row 보존)</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">계정 연결 해제. 강사 "박코치" 정보·담당 수업 데이터는 보존</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-red-500/30 cursor-pointer hover:bg-red-500/5">
              <input type="radio" name="action" className="mt-1 accent-red-400" />
              <div>
                <p className="font-medium text-sm text-red-400">완전 제외 + 강사 row 삭제</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">계정 + 강사 + 담당 수업 모두 영구 삭제 · 복구 불가</p>
              </div>
            </label>
          </div>

          <div className="flex gap-2 mt-5">
            <button className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm">취소</button>
            <button className="flex-1 py-2 bg-amber-400 text-black rounded-lg text-sm font-semibold">진행</button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ===== Variant E (bonus) — Scheduled removal ===== */
function SectionE_Bonus() {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-3">Variant E — 보너스 (예약 제외)</h2>

      <article className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <VariantHeader
          letter="E"
          title="예약 제외 + 자동 알림 (퇴사·해고 시나리오)"
          tagline="7일 후 자동 제외 + 본인에게 알림. HR/조직 흐름"
          pros={["멤버에게 인지 시간 보장", "데이터 인수인계 가능", "조직 문화 친화"]}
          cons={["소규모 학원엔 과함", "구현 복잡 (cron + 알림 인프라)", "원장 마음 바뀌면 7일 동안 어색"]}
        />
        <div className="p-5 bg-[var(--color-bg-primary)]">
          <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <div className="flex items-center gap-2 mb-3 text-[12px] text-amber-300">
              <Calendar className="w-4 h-4" />
              <span className="uppercase tracking-wide font-semibold">예약 제외</span>
            </div>
            <h3 className="font-bold text-sm mb-2">박관리자 자동 제외 일자</h3>
            <input type="date" defaultValue="2026-05-30" className="w-full px-3 py-2 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm mb-3" />
            <label className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)] mb-3">
              <input type="checkbox" defaultChecked className="accent-amber-400" />
              본인에게 알림 보내기 (인수인계 안내)
            </label>
            <button className="w-full py-2 bg-amber-400 text-black rounded-lg text-sm font-semibold">7일 후 제외 예약</button>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20 text-[12px] text-amber-200/90">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                Phase 2 이상 (조직 규모 커진 후). 본 MVP 스코프에는 과한 솔루션 — 추천 X.
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

/* ===== Final ===== */
function FinalRecommendation() {
  return (
    <section className="mt-12 p-6 rounded-xl border border-emerald-400/30 bg-emerald-400/5">
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-300" />
        통합 추천안 — C (1-click + 5초 undo) + 권한 안전 가드
      </h2>
      <div className="space-y-3 text-[13px] leading-relaxed">
        <p>
          <strong>핵심</strong>: Gmail/Slack 풍 1-click + 5초 undo banner (Variant C). modal 인터럽트 없이 빠르지만 실수 회복 가능.
        </p>
        <p>
          <strong>권한 가드 (필수)</strong>:
        </p>
        <ul className="space-y-1 text-[12px] text-[var(--color-text-secondary)] list-disc pl-5">
          <li>원장 자신 제외 불가 (UI + API 양쪽 차단)</li>
          <li>admin 은 같은 admin 제외 불가 (owner만 admin 제외)</li>
          <li>admin 은 member 제외 가능 (owner도 가능)</li>
          <li>데이터 보존: academy_members DELETE 만 — teachers row 는 user_id=NULL 로 복원, 담당 수업·공유 링크 그대로</li>
        </ul>
        <p>
          <strong>강한 위험성 시나리오</strong>: 마지막 owner 가 자기 자신 제외 시도 — 학원 무권한 상태. 추가 guard <code>last_owner_check</code>.
        </p>
        <p>
          <strong>실패 처리</strong>: 5초 안 undo 클릭 시 client deferred-commit cancel → academy_members INSERT rollback. ADR-012 패턴 재활용.
        </p>
      </div>

      <div className="mt-5 p-4 rounded-lg bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)]">
        <p className="text-[12px] font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-wide">구현 영향 범위</p>
        <ul className="space-y-1.5 text-[12px] text-[var(--color-text-muted)]">
          <li className="flex items-start gap-2">
            <span className="text-emerald-300 flex-shrink-0">API</span>
            <code className="text-[11px]">DELETE /api/academy/members/[userId]</code> 추가 (owner/admin 권한 검증 + 자기 자신 차단 + last_owner_check)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-300 flex-shrink-0">UI</span>
            <code className="text-[11px]">getMenuItems(&quot;active&quot;).kick</code> disabled 제거, 5초 undo banner 컴포넌트 추가, deferred-commit 패턴
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-300 flex-shrink-0">test</span>
            unit (API 권한 가드) + e2e (UI 흐름 + undo)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-300 flex-shrink-0">ADR</span>
            (선택) 멤버 제거 흐름 ADR — 데이터 보존 정책 + 권한 매트릭스 명시
          </li>
        </ul>
      </div>

      <details className="mt-6 group">
        <summary className="cursor-pointer text-[12px] text-[var(--color-text-muted)] inline-flex items-center gap-1">
          <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
          Devil&apos;s Advocate — C 의 약점
        </summary>
        <div className="mt-3 p-4 rounded-lg bg-[var(--color-bg-secondary)]/40 text-[12px] text-[var(--color-text-muted)] space-y-2">
          <p>
            <strong>1. 페이지 떠나면 undo 못 함</strong> — 멤버 제외 후 즉시 다른 페이지 → undo banner 사라짐. <code>beforeunload</code> warning 또는 sessionStorage queue 필요.
          </p>
          <p>
            <strong>2. 5초 timing 결정 — 너무 짧으면 실수 회복 못 함</strong>, 너무 길면 page state 부담. Gmail 은 5s default, 30s 까지 옵션. class-planner 는 5s 시작 후 사용 데이터 분석.
          </p>
          <p>
            <strong>3. modal 없으면 영향 정보 (A 의 강점) 못 보여줌</strong> — toast 안에 미니 영향 라인 1줄 추가 (예: &quot;12개 수업·1개 강사 row 보존&quot;).
          </p>
          <p>
            <strong>4. 대안 B (typing)</strong> — owner 가 자기 자신을 안 제외하도록 guard 시 함께 활용 가능. last_owner 제외 시도 시 B 의 typing 보완.
          </p>
          <p>
            <strong>Rejected</strong> — Variant E (예약 제외) — class-planner MVP 스코프 과함. 30+ 명 운영 시 재고려.
          </p>
        </div>
      </details>
    </section>
  );
}
