"use client";

import { useState } from "react";
import {
  Crown,
  Shield,
  GraduationCap,
  Info,
  Check,
  X,
  Mail,
  UserPlus,
  Users,
  HelpCircle,
  ChevronRight,
} from "lucide-react";

/**
 * design-explorations: 학원 설정 팀 섹션 + /teachers 페이지 진입점 · 명칭 · 권한 표시.
 *
 * 사용자 의문 (2026-05-20):
 *   - /teachers 와 /settings 팀 섹션 둘 다 "강사 추가" 라벨 → 중복?
 *   - settings에서 추가하는 건 admin/member 초대 → "멤버 초대" 가 맞지 않나?
 *   - 권한별 가능 작업을 i icon tooltip 등으로 명확히 보여주면 좋겠음.
 *
 * 진단:
 *   - /teachers: 학원 강사 목록 관리 (계정 미연동 강사도 포함, 이름·색상·연락처 CRUD)
 *   - /settings 팀 섹션: 멤버 초대 발송 (Supabase 계정 + role + invite_token)
 *   - 같은 "강사 추가" 라벨 → 의미 충돌. 라벨/UI 정리 필요.
 *
 * Variants:
 *   A — 라벨만 통일 ("강사 추가" → "멤버 초대"). 최소 변경.
 *   B — i icon tooltip (각 멤버 role chip 옆 hover popover)
 *   C — 권한 매트릭스 카드 (팀 섹션 상단에 owner/admin/member 카드)
 *   D — InviteModal 안 권한 미리보기 (role 선택 시 가능 작업 chip)
 *   E — 진입점 명확화 (/teachers vs /settings 라벨링 + 구조 분리)
 *   F — A+B+C+D 통합 (가장 풍부)
 */

type Variant = "A" | "B" | "C" | "D" | "E" | "F";

const VARIANT_INFO: Record<Variant, { title: string; tagline: string }> = {
  A: { title: "A — 라벨 통일", tagline: "최소 변경 (강사 추가 → 멤버 초대)" },
  B: { title: "B — i icon tooltip", tagline: "role chip 옆 호버 popover" },
  C: { title: "C — 권한 카드", tagline: "팀 섹션 상단 매트릭스 (image #6 변형)" },
  D: { title: "D — Modal 권한 미리보기", tagline: "InviteModal 안 role 선택 시 칩" },
  E: { title: "E — 진입점 분리", tagline: "/teachers vs /settings 구조 명확화" },
  F: { title: "F — 통합 (Recommended)", tagline: "A + B + C + D 모두" },
};

interface RoleInfo {
  key: "owner" | "admin" | "member";
  label: string;
  Icon: typeof Crown;
  color: string;
  gradient: string;
  border: string;
  description: string;
  permissions: { ok: boolean; text: string }[];
}

const ROLES: RoleInfo[] = [
  {
    key: "owner",
    label: "원장",
    Icon: Crown,
    color: "text-amber-300",
    gradient: "from-amber-500/15 to-amber-500/[0.04]",
    border: "border-amber-400/30",
    description: "학원 전체 관리",
    permissions: [
      { ok: true, text: "학원 이름 · 학원 주소 변경" },
      { ok: true, text: "관리자 · 강사 초대" },
      { ok: true, text: "팀 멤버 역할 변경 · 내보내기" },
      { ok: true, text: "학생 · 강사 · 과목 · 수업 전체 관리" },
      { ok: true, text: "학부모 공유 링크 · 접속 코드 발급" },
    ],
  },
  {
    key: "admin",
    label: "관리자",
    Icon: Shield,
    color: "text-blue-300",
    gradient: "from-blue-500/12 to-blue-500/[0.03]",
    border: "border-blue-400/25",
    description: "수업 운영 + 강사 초대",
    permissions: [
      { ok: true, text: "학생 · 강사 · 과목 · 수업 추가 · 편집 · 삭제" },
      { ok: true, text: "강사 초대 (관리자 권한 부여는 원장만)" },
      { ok: true, text: "학부모 공유 링크 · 접속 코드 발급" },
      { ok: false, text: "학원 이름 · 학원 주소 변경 (원장 전용)" },
      { ok: false, text: "원장 · 관리자 역할 변경 불가" },
    ],
  },
  {
    key: "member",
    label: "강사",
    Icon: GraduationCap,
    color: "text-emerald-300",
    gradient: "from-emerald-500/12 to-emerald-500/[0.03]",
    border: "border-emerald-400/25",
    description: "본인 시간표 조회",
    permissions: [
      { ok: true, text: "본인 시간표 조회" },
      { ok: true, text: "본인 연락처 · 메모 편집" },
      { ok: false, text: "다른 강사 정보 편집 불가" },
      { ok: false, text: "학생 · 과목 · 수업 관리 불가" },
      { ok: false, text: "초대 발송 불가" },
    ],
  },
];

export default function RolePermissionsUIPage() {
  const [variant, setVariant] = useState<Variant>("F");
  const [showInviteModalMock, setShowInviteModalMock] = useState(false);
  const [selectedRoleInModal, setSelectedRoleInModal] = useState<
    "admin" | "member"
  >("member");
  const [tooltipOpenFor, setTooltipOpenFor] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            팀 · 권한 UI — 6 Variants
          </h1>
          <p className="text-sm text-zinc-400">
            진입점 중복 (/teachers vs /settings) · 라벨 정확성 (강사 추가 vs
            멤버 초대) · 권한별 가능 작업 표시 — 6 가지 대안.
          </p>
        </header>

        {/* Variant selector */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
          {(Object.keys(VARIANT_INFO) as Variant[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                setVariant(v);
                setShowInviteModalMock(false);
                setTooltipOpenFor(null);
              }}
              className={`p-3 rounded-lg border text-left transition-all ${
                variant === v
                  ? "border-amber-400/60 bg-amber-400/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/30"
              }`}
            >
              <div
                className={`font-semibold text-sm ${
                  variant === v ? "text-amber-300" : "text-zinc-200"
                }`}
              >
                {VARIANT_INFO[v].title}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {VARIANT_INFO[v].tagline}
              </div>
            </button>
          ))}
        </div>

        {/* Variant E: 진입점 분리 */}
        {variant === "E" && (
          <div className="grid md:grid-cols-2 gap-6">
            <SettingsTeamMockup
              title="/settings — 팀 · 권한"
              subtitle="계정 연동 멤버 (원장/관리자/강사) 초대 + 역할 관리"
              showRoleMatrix={false}
              showLabelChange={true}
              showTooltip={false}
              tooltipOpenFor={tooltipOpenFor}
              setTooltipOpenFor={setTooltipOpenFor}
              onInviteClick={() => setShowInviteModalMock(true)}
            />
            <TeachersListMockup
              title="/teachers — 강사 목록"
              subtitle="학원의 모든 강사 (계정 미연동 강사 포함). CUD · 색상 · 연락처"
            />
            <div className="md:col-span-2 rounded-xl border border-blue-400/20 bg-blue-400/[0.04] p-5 text-xs">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-300 mt-0.5 shrink-0" />
                <div>
                  <p className="text-blue-200 font-medium mb-2">
                    Variant E 핵심
                  </p>
                  <ul className="space-y-1 text-zinc-300">
                    <li>
                      • <code className="text-blue-300">/settings</code>: 계정
                      연동 멤버 (Supabase user) ↔ academy_members 관계.{" "}
                      <strong>"멤버 초대"</strong> 라벨.
                    </li>
                    <li>
                      • <code className="text-blue-300">/teachers</code>: 학원
                      운영의 강사 목록 (계정 X 강사 포함, "외부 강사"·시간제
                      등). <strong>"강사 추가"</strong> 라벨 유지.
                    </li>
                    <li>
                      • 계정 연동 강사는 settings 멤버 row 옆에 "강사 페이지에서
                      편집" 링크.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Variant A/B/C/D/F: /settings 팀 섹션 변형 */}
        {variant !== "E" && (
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <SettingsTeamMockup
              title="/settings — 팀 섹션"
              subtitle={
                variant === "A"
                  ? '라벨만 "멤버 초대"로 통일'
                  : variant === "B"
                    ? "각 role chip 옆 i icon → tooltip popover"
                    : variant === "C"
                      ? "상단에 3-role 권한 카드 표시"
                      : variant === "D"
                        ? "InviteModal 안에 role별 권한 미리보기"
                        : "A+B+C+D 통합 (가장 풍부)"
              }
              showRoleMatrix={variant === "C" || variant === "F"}
              showLabelChange={
                variant === "A" || variant === "F" || variant === "B"
              }
              showTooltip={variant === "B" || variant === "F"}
              tooltipOpenFor={tooltipOpenFor}
              setTooltipOpenFor={setTooltipOpenFor}
              onInviteClick={() => setShowInviteModalMock(true)}
            />
            <div>
              <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">
                3-Role 매트릭스 (참고)
              </h2>
              <div className="space-y-2.5">
                {ROLES.map((r) => (
                  <RoleCard key={r.key} role={r} compact />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* InviteModal mock (Variant D/F만 권한 미리보기) */}
        {showInviteModalMock && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInviteModalMock(false)}
          >
            <div
              className="bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  멤버 초대
                </h3>
                <button
                  onClick={() => setShowInviteModalMock(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
                초대 이메일
              </label>
              <input
                type="email"
                placeholder="invitee@example.com"
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm mb-4"
                defaultValue=""
              />

              <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
                역할
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(["admin", "member"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoleInModal(r)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedRoleInModal === r
                        ? "border-amber-400/60 bg-amber-400/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {r === "admin" ? (
                        <Shield className="w-3.5 h-3.5 text-blue-300" />
                      ) : (
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
                      )}
                      <span className="font-semibold text-sm text-white">
                        {r === "admin" ? "관리자" : "강사"}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {r === "admin"
                        ? "수업 운영 + 초대"
                        : "본인 시간표 조회"}
                    </p>
                  </button>
                ))}
              </div>

              {/* Variant D / F — 권한 미리보기 칩 */}
              {(variant === "D" || variant === "F") && (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="w-3 h-3 text-zinc-400" />
                    <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wide">
                      {selectedRoleInModal === "admin" ? "관리자" : "강사"} 권한
                      미리보기
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-zinc-300">
                    {ROLES.find((r) => r.key === selectedRoleInModal)
                      ?.permissions.slice(0, 4)
                      .map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          {p.ok ? (
                            <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                          ) : (
                            <X className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                          )}
                          <span
                            className={p.ok ? "" : "text-zinc-500 line-through"}
                          >
                            {p.text}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowInviteModalMock(false)}
                  className="flex-1 py-2 rounded-lg border border-white/10 text-zinc-300 text-sm"
                >
                  취소
                </button>
                <button className="flex-1 py-2 rounded-lg bg-amber-400 text-zinc-900 font-bold text-sm">
                  초대 링크 보내기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decision matrix */}
        <section className="mt-12 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">
            결정 매트릭스 — 어느 variant?
          </h2>
          <table className="w-full text-xs">
            <thead className="text-zinc-400 border-b border-white/10">
              <tr>
                <th className="text-left py-2 px-3">Variant</th>
                <th className="text-left py-2 px-3">장점</th>
                <th className="text-left py-2 px-3">단점</th>
                <th className="text-left py-2 px-3">권장 케이스</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 font-semibold text-white">A</td>
                <td className="py-3 px-3">최소 변경 (1줄 텍스트만)</td>
                <td className="py-3 px-3">권한 표시 없음 — 사용자 학습 비용 그대로</td>
                <td className="py-3 px-3">빠른 일관성 fix 만 원할 때</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 font-semibold text-white">B</td>
                <td className="py-3 px-3">필요 시점에만 학습 (i icon hover)</td>
                <td className="py-3 px-3">모바일에서 hover 불가 — tap toggle 필요</td>
                <td className="py-3 px-3">화면 공간 절약 우선 + 가벼움 원할 때</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 font-semibold text-white">C</td>
                <td className="py-3 px-3">한눈에 권한 비교 가능</td>
                <td className="py-3 px-3">상단 공간 점유 — 익숙해진 사용자엔 노이즈</td>
                <td className="py-3 px-3">교육적 onboarding 중시 · 1st-time 사용 가이드</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 font-semibold text-white">D</td>
                <td className="py-3 px-3">실제 선택 맥락에 권한 표시</td>
                <td className="py-3 px-3">팀 멤버 row 에서는 권한 표시 X</td>
                <td className="py-3 px-3">초대 시점 의사결정 도움 + B/C 미적용</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 font-semibold text-white">E</td>
                <td className="py-3 px-3">진입점 책임 명확 분리</td>
                <td className="py-3 px-3">구조 변경 큼 (라우트/네비/문서)</td>
                <td className="py-3 px-3">/teachers 와 /settings 의미 혼동 비명시 시</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-amber-300">F ⭐</td>
                <td className="py-3 px-3 text-amber-200">
                  모든 시점에 권한 정보 + 라벨 정확성
                </td>
                <td className="py-3 px-3">텍스트 양 ↑ — 익숙한 사용자엔 약간 노이즈</td>
                <td className="py-3 px-3 text-amber-200">
                  현재 상황 권장 (사용자 {"<"} 10명, 학습 곡선 낮춤 우선)
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Additional notes */}
        <section className="mt-8 rounded-xl border border-blue-400/20 bg-blue-400/[0.04] p-6">
          <h2 className="text-sm font-semibold text-blue-200 mb-3 uppercase tracking-wide">
            추가 검토 필요
          </h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">①</span>
              <span>
                <strong className="text-white">계정 연동 강사 → /teachers + /settings 양쪽 노출</strong>:
                /teachers 의 강사 row 옆에 <code className="text-amber-300">"계정 연동됨"</code> chip
                + "팀 권한 보기" 링크. /settings 멤버 row 옆에 "강사 페이지" 링크.
                → 사용자가 "이 강사 = 이 멤버" 즉시 파악.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">②</span>
              <span>
                <strong className="text-white">초대 발송 권한 (ADR-019 정책 2 참고)</strong>:
                admin 은 강사(member) 만 초대, 다른 admin 초대는 owner 만.
                InviteModal 의 role 선택지를 현재 사용자 role 에 따라 필터링.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">③</span>
              <span>
                <strong className="text-white">UAT S-10.x 갱신</strong>:
                Variant 채택 후 시나리오 본문에 "권한 카드 표시" / "tooltip 표시" 등 검증 추가.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SettingsTeamMockup({
  title,
  subtitle,
  showRoleMatrix,
  showLabelChange,
  showTooltip,
  tooltipOpenFor,
  setTooltipOpenFor,
  onInviteClick,
}: {
  title: string;
  subtitle: string;
  showRoleMatrix: boolean;
  showLabelChange: boolean;
  showTooltip: boolean;
  tooltipOpenFor: string | null;
  setTooltipOpenFor: (s: string | null) => void;
  onInviteClick: () => void;
}) {
  const ctaLabel = showLabelChange ? "+ 멤버 초대" : "+ 강사 추가";

  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">
        {title}
      </h2>
      <p className="text-xs text-zinc-500 mb-3">{subtitle}</p>
      <div
        className="rounded-2xl p-5"
        style={{
          background:
            "radial-gradient(circle at top, rgba(245,158,11,0.06), transparent 60%), linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Variant C: 권한 매트릭스 카드 상단에 */}
        {showRoleMatrix && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                역할별 권한
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <RoleCard key={r.key} role={r} compact />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white">팀</h3>
              <span className="text-xs text-zinc-400">2명</span>
            </div>
            <p className="text-xs text-zinc-400">
              {showLabelChange
                ? "멤버를 초대해 학원 운영을 함께하세요"
                : "강사를 초대해 시간표를 함께 편집하세요"}
            </p>
          </div>
          <button
            onClick={onInviteClick}
            className="px-4 py-2 rounded-lg bg-amber-400 text-zinc-900 text-xs font-bold shrink-0 hover:bg-amber-300 transition-colors"
          >
            {ctaLabel}
          </button>
        </div>

        {/* Member row 1 — owner */}
        <MemberRow
          name="HYUNJIN LEE"
          email="project90.challenge@gmail.com"
          role="owner"
          status="me"
          showTooltip={showTooltip}
          tooltipOpenFor={tooltipOpenFor}
          setTooltipOpenFor={setTooltipOpenFor}
        />

        {/* Member row 2 — pending invite */}
        <MemberRow
          name="김학성"
          email="이메일 미입력"
          role="member"
          status="pending"
          showTooltip={showTooltip}
          tooltipOpenFor={tooltipOpenFor}
          setTooltipOpenFor={setTooltipOpenFor}
        />
      </div>
    </section>
  );
}

function MemberRow({
  name,
  email,
  role,
  status,
  showTooltip,
  tooltipOpenFor,
  setTooltipOpenFor,
}: {
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "me" | "pending" | "active";
  showTooltip: boolean;
  tooltipOpenFor: string | null;
  setTooltipOpenFor: (s: string | null) => void;
}) {
  const roleInfo = ROLES.find((r) => r.key === role)!;
  const initial = name[0];
  const tooltipKey = `${name}-${role}`;
  const isOpen = tooltipOpenFor === tooltipKey;

  return (
    <div
      className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors relative"
      data-testid={`member-row-${role}`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
          role === "owner"
            ? "bg-amber-500/20 text-amber-200"
            : "bg-blue-500/20 text-blue-200"
        }`}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white text-sm">{name}</span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.color} ${roleInfo.border}`}
          >
            <roleInfo.Icon className="w-2.5 h-2.5" />
            {roleInfo.label}
          </span>
          {status === "me" && (
            <span className="text-[10px] text-zinc-500">본인</span>
          )}
          {status === "pending" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-700/60 text-zinc-400">
              미초대
            </span>
          )}

          {/* Variant B / F — i icon tooltip */}
          {showTooltip && (
            <button
              onMouseEnter={() => setTooltipOpenFor(tooltipKey)}
              onMouseLeave={() => setTooltipOpenFor(null)}
              onClick={() =>
                setTooltipOpenFor(isOpen ? null : tooltipKey)
              }
              className="text-zinc-500 hover:text-amber-300 transition-colors"
              data-testid={`role-tooltip-trigger-${role}`}
              aria-label={`${roleInfo.label} 권한 보기`}
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">{email}</p>
      </div>
      {status === "pending" && (
        <button className="px-3 py-1.5 rounded-md bg-amber-500/20 text-amber-200 text-[11px] font-semibold border border-amber-400/30 shrink-0">
          초대 보내기
        </button>
      )}

      {/* Tooltip popover */}
      {showTooltip && isOpen && (
        <div
          className="absolute left-[140px] top-[68px] z-10 w-[280px] rounded-lg border bg-zinc-900/95 backdrop-blur-md shadow-xl p-3"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
          data-testid={`role-tooltip-${role}`}
        >
          <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/5">
            <roleInfo.Icon className={`w-3.5 h-3.5 ${roleInfo.color}`} />
            <span className={`font-semibold text-xs ${roleInfo.color}`}>
              {roleInfo.label} 권한
            </span>
          </div>
          <ul className="space-y-1 text-[11px] text-zinc-300">
            {roleInfo.permissions.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5">
                {p.ok ? (
                  <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <X className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                )}
                <span className={p.ok ? "" : "text-zinc-500 line-through"}>
                  {p.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoleCard({ role, compact = false }: { role: RoleInfo; compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br ${role.gradient} ${role.border} ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <role.Icon className={`w-3.5 h-3.5 ${role.color}`} />
        <span className={`font-bold text-xs ${role.color}`}>{role.label}</span>
      </div>
      <p className="text-[11px] text-zinc-400 mb-2">{role.description}</p>
      <ul className="space-y-1 text-[10px] text-zinc-300">
        {role.permissions.slice(0, compact ? 3 : 5).map((p, i) => (
          <li key={i} className="flex items-start gap-1">
            {p.ok ? (
              <Check className="w-2.5 h-2.5 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <X className="w-2.5 h-2.5 text-zinc-600 mt-0.5 shrink-0" />
            )}
            <span className={p.ok ? "" : "text-zinc-500 line-through"}>
              {p.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeachersListMockup({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">
        {title}
      </h2>
      <p className="text-xs text-zinc-500 mb-3">{subtitle}</p>
      <div
        className="rounded-2xl p-5"
        style={{
          background:
            "radial-gradient(circle at top, rgba(245,158,11,0.06), transparent 60%), linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <h3 className="font-bold text-white text-sm">강사 목록 (5명)</h3>
          <button className="px-3 py-1.5 rounded-lg bg-amber-400 text-zinc-900 text-xs font-bold">
            + 강사 추가
          </button>
        </div>

        {[
          { name: "김민철", color: "#a78bfa", linked: true },
          { name: "김선생", color: "#22d3ee", linked: false },
          { name: "이선생", color: "#fb923c", linked: false },
          { name: "박선생", color: "#f87171", linked: true },
          { name: "지선생", color: "#a855f7", linked: false },
        ].map((t) => (
          <div
            key={t.name}
            className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/[0.03]"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: t.color }}
            />
            <span className="flex-1 text-sm text-white">{t.name}</span>
            {t.linked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                <Check className="w-2.5 h-2.5" />
                계정 연동
              </span>
            )}
            {t.linked && (
              <button className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-0.5">
                팀 권한 보기 <ChevronRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}

        <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2 text-[11px] text-zinc-500">
          <HelpCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <p>
            계정 미연동 강사도 등록 가능 — 외부 강사·시간제 등. 계정 연동은
            settings → 멤버 초대로.
          </p>
        </div>
      </div>
    </section>
  );
}
