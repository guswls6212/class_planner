"use client";

import { useState } from "react";
import {
  School,
  Crown,
  Shield,
  GraduationCap,
  Mail,
  Sparkles,
  ArrowRight,
  Info,
  Check,
} from "lucide-react";

/**
 * design-explorations: Onboarding 역할 선택 흐름 5 variants.
 *
 * 사용자 의문 (2026-05-20):
 *   "처음 학원이름정하는 유저인거면 원장만 관리 가능해야하는거 아니야?"
 *   "S1.5에서 관리자나 강사로 시작하기 누르면 원장이 없는 유령학원이 되는건가?"
 *
 * 진단:
 *   - 현재 onboarding page는 owner/admin/member 3-라디오를 노출 → owner-less 유령 학원 위험.
 *   - 올바른 모델: invite 없는 첫 진입은 **owner 강제**, 그 외 role은 invite 흐름.
 *
 * Variants:
 *   A — 라디오 제거 + 원장 자동 (최소 변경)
 *   B — 진입 분기 2-step (학원 만들기 / 초대 합류)
 *   C — 원장 자동 + 권한 미리보기 카드 (사용자 권한 이해)
 *   D — 단일 input smart detect (학원명 OR 초대코드)
 *   E — A 베이스 + secondary "초대 받았어요" link (escape hatch)
 *
 * Invite preview (B1/B2):
 *   B1 — 현재 그대로 (역할 chip만)
 *   B2 — 권한 미리보기 chip 추가
 */

type Variant = "A" | "B" | "C" | "D" | "E";
type InvitePreview = "B1" | "B2";
type Viewport = "desktop" | "mobile";

const VARIANT_INFO: Record<Variant, { title: string; tagline: string }> = {
  A: { title: "A — 라디오 제거", tagline: "원장 자동 + 안내문 (최소 변경)" },
  B: { title: "B — 2-step 분기", tagline: "학원 만들기 / 초대 합류 분기" },
  C: { title: "C — 권한 카드", tagline: "원장 자동 + 권한 미리보기" },
  D: { title: "D — 스마트 input", tagline: "학원명 OR 초대코드 (smart detect)" },
  E: { title: "E — Secondary link", tagline: "A + 초대 escape hatch" },
};

export default function OnboardingRoleExplorationsPage() {
  const [variant, setVariant] = useState<Variant>("E");
  const [invitePreview, setInvitePreview] = useState<InvitePreview>("B2");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [academyName, setAcademyName] = useState("");
  const [bStep, setBStep] = useState<1 | 2>(1);
  const [bChoice, setBChoice] = useState<"create" | "join" | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [showInviteSection, setShowInviteSection] = useState(false);

  const containerWidth = viewport === "desktop" ? "max-w-[480px]" : "max-w-[360px]";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Onboarding 역할 흐름 — 5 Variants
          </h1>
          <p className="text-sm text-zinc-400">
            첫 학원 생성 시 owner 자동 강제. invite 없는 진입에서 admin/member
            선택지를 노출하지 않도록 5가지 대안 비교.
          </p>
        </header>

        {/* Variant selector */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-6">
          {(Object.keys(VARIANT_INFO) as Variant[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                setVariant(v);
                setBStep(1);
                setBChoice(null);
                setShowInviteSection(false);
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

        {/* Viewport + invite preview toggles */}
        <div className="flex flex-wrap gap-3 mb-8 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/10">
            <span className="text-zinc-400">Viewport:</span>
            {(["desktop", "mobile"] as Viewport[]).map((vp) => (
              <button
                key={vp}
                onClick={() => setViewport(vp)}
                className={`px-2 py-0.5 rounded ${
                  viewport === vp ? "bg-amber-400 text-zinc-900 font-semibold" : "text-zinc-400"
                }`}
              >
                {vp}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/10">
            <span className="text-zinc-400">Invite preview:</span>
            {(["B1", "B2"] as InvitePreview[]).map((ip) => (
              <button
                key={ip}
                onClick={() => setInvitePreview(ip)}
                className={`px-2 py-0.5 rounded ${
                  invitePreview === ip ? "bg-amber-400 text-zinc-900 font-semibold" : "text-zinc-400"
                }`}
              >
                {ip}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-side: Onboarding variant + Invite preview */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Onboarding variant card */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">
              ① Onboarding — {VARIANT_INFO[variant].title}
            </h2>
            <div
              className={`mx-auto bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-2xl shadow-2xl shadow-amber-500/5 ${containerWidth} p-8`}
              style={{
                background:
                  "radial-gradient(circle at top, rgba(245,158,11,0.08), transparent 60%), linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
              }}
            >
              {/* Variant A — 라디오 제거 + 원장 자동 + 안내문 */}
              {variant === "A" && (
                <div>
                  <h1 className="text-2xl font-extrabold text-white mb-1.5">
                    학원 정보 설정
                  </h1>
                  <p className="text-[13px] text-zinc-400 mb-7">
                    <b className="text-amber-400">HYUNJIN LEE</b>님, 환영합니다
                  </p>
                  <div className="mb-5">
                    <label className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-300 mb-2">
                      학원명
                    </label>
                    <input
                      type="text"
                      value={academyName}
                      onChange={(e) => setAcademyName(e.target.value)}
                      placeholder="예: 해피수학학원"
                      className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-start gap-2.5 mb-6 p-3 rounded-lg bg-amber-500/[0.07] border border-amber-400/20">
                    <Crown className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] text-amber-200 font-medium">
                        원장으로 자동 등록됩니다
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        학원을 직접 생성하므로 원장(owner) 권한을 받습니다.
                        관리자·강사는 학원 생성 후 초대로 추가하세요.
                      </p>
                    </div>
                  </div>
                  <button className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold rounded-lg transition-colors">
                    학원 만들기
                  </button>
                </div>
              )}

              {/* Variant B — 2-step 분기 */}
              {variant === "B" && (
                <div>
                  {bStep === 1 && (
                    <>
                      <h1 className="text-2xl font-extrabold text-white mb-1.5">
                        시작하기
                      </h1>
                      <p className="text-[13px] text-zinc-400 mb-7">
                        <b className="text-amber-400">HYUNJIN LEE</b>님, 환영합니다
                      </p>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => {
                            setBChoice("create");
                            setBStep(2);
                          }}
                          className="text-left p-5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-amber-400/40 hover:bg-amber-400/5 transition-all group"
                        >
                          <div className="flex items-center gap-3 mb-1.5">
                            <School className="w-5 h-5 text-amber-400" />
                            <span className="font-semibold text-white">
                              새 학원 만들기
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 ml-8">
                            처음 학원을 운영합니다. 원장으로 등록됩니다.
                          </p>
                          <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-300 absolute right-6 top-1/2 -mt-2" />
                        </button>
                        <button
                          onClick={() => {
                            setBChoice("join");
                            setBStep(2);
                          }}
                          className="text-left p-5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-amber-400/40 hover:bg-amber-400/5 transition-all"
                        >
                          <div className="flex items-center gap-3 mb-1.5">
                            <Mail className="w-5 h-5 text-amber-400" />
                            <span className="font-semibold text-white">
                              초대로 합류하기
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 ml-8">
                            원장/관리자에게서 초대 링크를 받았습니다.
                          </p>
                        </button>
                      </div>
                    </>
                  )}
                  {bStep === 2 && bChoice === "create" && (
                    <>
                      <button
                        onClick={() => setBStep(1)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 mb-4"
                      >
                        ← 이전
                      </button>
                      <h1 className="text-2xl font-extrabold text-white mb-1.5">
                        학원 정보 설정
                      </h1>
                      <p className="text-[13px] text-zinc-400 mb-7">
                        원장으로 등록됩니다.
                      </p>
                      <label className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-300 mb-2">
                        학원명
                      </label>
                      <input
                        type="text"
                        value={academyName}
                        onChange={(e) => setAcademyName(e.target.value)}
                        placeholder="예: 해피수학학원"
                        className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none mb-6"
                      />
                      <button className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold rounded-lg">
                        학원 만들기
                      </button>
                    </>
                  )}
                  {bStep === 2 && bChoice === "join" && (
                    <>
                      <button
                        onClick={() => setBStep(1)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 mb-4"
                      >
                        ← 이전
                      </button>
                      <h1 className="text-2xl font-extrabold text-white mb-1.5">
                        초대 코드 입력
                      </h1>
                      <p className="text-[13px] text-zinc-400 mb-7">
                        받은 초대 링크나 코드를 입력하세요.
                      </p>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="예: https://.../invite/abc... 또는 abc..."
                        className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none mb-3"
                      />
                      <p className="text-xs text-zinc-500 mb-6">
                        초대 링크를 받지 못했다면 원장이나 관리자에게 문의하세요.
                      </p>
                      <button className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold rounded-lg">
                        초대 확인하기
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Variant C — 권한 카드 */}
              {variant === "C" && (
                <div>
                  <h1 className="text-2xl font-extrabold text-white mb-1.5">
                    학원 정보 설정
                  </h1>
                  <p className="text-[13px] text-zinc-400 mb-6">
                    <b className="text-amber-400">HYUNJIN LEE</b>님, 환영합니다
                  </p>
                  <label className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-300 mb-2">
                    학원명
                  </label>
                  <input
                    type="text"
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    placeholder="예: 해피수학학원"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none mb-5"
                  />
                  <div className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-amber-400/5 p-4 mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="w-4 h-4 text-amber-300" />
                      <span className="font-bold text-amber-200 text-sm">
                        원장 권한
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-3 h-3 text-amber-400 mt-1 shrink-0" />
                        <span>학원 전체 관리 · 학원명/slug 변경</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3 h-3 text-amber-400 mt-1 shrink-0" />
                        <span>관리자/강사 초대 · 멤버 역할 변경</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3 h-3 text-amber-400 mt-1 shrink-0" />
                        <span>학생/강사/과목/수업 모든 데이터 관리</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3 h-3 text-amber-400 mt-1 shrink-0" />
                        <span>학부모 공유 링크 · 접속 코드 발급</span>
                      </li>
                    </ul>
                  </div>
                  <button className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold rounded-lg">
                    원장으로 학원 만들기
                  </button>
                  <p className="text-xs text-zinc-500 text-center mt-3">
                    초대를 받으셨나요?{" "}
                    <button className="text-amber-400 hover:text-amber-300 underline">
                      초대 코드 입력
                    </button>
                  </p>
                </div>
              )}

              {/* Variant D — 스마트 input */}
              {variant === "D" && (
                <div>
                  <h1 className="text-2xl font-extrabold text-white mb-1.5">
                    시작하기
                  </h1>
                  <p className="text-[13px] text-zinc-400 mb-7">
                    <b className="text-amber-400">HYUNJIN LEE</b>님, 환영합니다
                  </p>
                  <label className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-300 mb-2">
                    학원명 또는 초대 코드
                  </label>
                  <input
                    type="text"
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    placeholder="예: 해피수학학원, 또는 초대 코드"
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none mb-3"
                  />
                  <div className="flex items-start gap-2 mb-5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-400">
                      학원명 입력 시 새 학원이 만들어지고 원장으로 등록됩니다.
                      초대 코드는 자동 감지해 초대 흐름으로 이동합니다.
                    </p>
                  </div>
                  <button className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold rounded-lg">
                    {academyName.length > 20 || /^[a-z0-9-]{8,}$/.test(academyName)
                      ? "초대 확인하기"
                      : "학원 만들기"}
                  </button>
                </div>
              )}

              {/* Variant E — A + secondary link */}
              {variant === "E" && (
                <div>
                  <h1 className="text-2xl font-extrabold text-white mb-1.5">
                    학원 정보 설정
                  </h1>
                  <p className="text-[13px] text-zinc-400 mb-7">
                    <b className="text-amber-400">HYUNJIN LEE</b>님, 환영합니다
                  </p>
                  <div className="mb-5">
                    <label className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-300 mb-2">
                      학원명
                    </label>
                    <input
                      type="text"
                      value={academyName}
                      onChange={(e) => setAcademyName(e.target.value)}
                      placeholder="예: 해피수학학원"
                      className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-start gap-2.5 mb-5 p-3 rounded-lg bg-amber-500/[0.07] border border-amber-400/20">
                    <Crown className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] text-amber-200 font-medium">
                        원장으로 등록됩니다
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        직접 생성한 학원의 owner 권한을 받습니다.
                      </p>
                    </div>
                  </div>
                  <button className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold rounded-lg mb-3">
                    원장으로 학원 만들기
                  </button>

                  {/* Secondary escape hatch */}
                  {!showInviteSection ? (
                    <button
                      onClick={() => setShowInviteSection(true)}
                      className="w-full text-center py-2 text-xs text-zinc-400 hover:text-amber-300 transition-colors"
                    >
                      초대 받았어요 — 코드 입력하기 →
                    </button>
                  ) : (
                    <div className="pt-3 mt-3 border-t border-white/5">
                      <label className="block text-xs font-medium uppercase tracking-[0.06em] text-zinc-400 mb-2">
                        초대 코드
                      </label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="초대 링크의 코드 부분"
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none mb-2"
                      />
                      <button className="w-full py-2 border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 font-medium rounded-lg text-sm">
                        초대 확인
                      </button>
                      <button
                        onClick={() => setShowInviteSection(false)}
                        className="w-full text-center py-1.5 mt-1 text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        닫기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Invite preview card */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">
              ② Invite 페이지 — {invitePreview === "B1" ? "B1 (현재)" : "B2 (권한 미리보기)"}
            </h2>
            <div
              className={`mx-auto bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-2xl shadow-2xl shadow-amber-500/5 ${containerWidth} p-8`}
              style={{
                background:
                  "radial-gradient(circle at top, rgba(245,158,11,0.08), transparent 60%), linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
              }}
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎓</div>
                <h2 className="text-2xl font-bold text-white mb-2">학원 초대</h2>
                <p className="text-sm text-zinc-300">
                  <strong className="text-white">해피과학학원</strong>에서{" "}
                  <span className="inline-block bg-amber-400/15 text-amber-400 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    관리자
                  </span>{" "}
                  역할로 초대했습니다
                </p>
              </div>

              {/* B2: 권한 미리보기 추가 */}
              {invitePreview === "B2" && (
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-xs font-semibold text-amber-200">
                      관리자 권한
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                      <span>학생/강사/과목/수업 관리</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                      <span>강사 초대 · 학부모 공유 링크 발급</span>
                    </li>
                    <li className="flex items-start gap-1.5 text-zinc-400">
                      <Info className="w-3 h-3 text-zinc-500 mt-0.5 shrink-0" />
                      <span>학원 설정 · 원장 권한은 변경 불가</span>
                    </li>
                  </ul>
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg text-sm mb-4">
                <strong className="text-emerald-300">teacher@happyacademy.com</strong>{" "}
                계정으로 로그인됨
              </div>
              <button className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold rounded-lg">
                초대 수락
              </button>

              <p className="text-xs text-zinc-500 mt-5 text-center">
                만료: 2026. 5. 27.
              </p>
            </div>

            {/* Role comparison reference */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                3 Role 권한 매트릭스 (참고)
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <Crown className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-200">
                      원장 (owner)
                    </div>
                    <div className="text-zinc-400">
                      전체 관리 · 학원 설정 · 모든 역할 변경 · 멤버 추방
                    </div>
                    <div className="text-amber-300/70 mt-0.5">
                      ⮕ 진입: <span className="font-mono">첫 학원 생성자만</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-200">관리자 (admin)</div>
                    <div className="text-zinc-400">
                      학생/강사/과목/수업 CUD · 강사 초대 · 공유 링크 발급
                    </div>
                    <div className="text-blue-300/70 mt-0.5">
                      ⮕ 진입: <span className="font-mono">원장의 초대만</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-200">강사 (member)</div>
                    <div className="text-zinc-400">
                      본인 시간표 조회 · 본인 contact 편집 (RLS member_own)
                    </div>
                    <div className="text-emerald-300/70 mt-0.5">
                      ⮕ 진입: <span className="font-mono">원장/관리자의 초대</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

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
                <td className="py-3 px-3">최소 변경, 명확</td>
                <td className="py-3 px-3">초대 받은 사용자 발견성 낮음</td>
                <td className="py-3 px-3">초대 흐름이 100% URL 진입 보장 시</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 font-semibold text-white">B</td>
                <td className="py-3 px-3">의도 분리 명확</td>
                <td className="py-3 px-3">step 추가 → 90% (학원 만들기) 케이스 마찰</td>
                <td className="py-3 px-3">유저 풀 다양 (학원장 vs 강사 50:50)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 font-semibold text-white">C</td>
                <td className="py-3 px-3">권한 이해도 ↑</td>
                <td className="py-3 px-3">텍스트 많음, 폼 길어짐</td>
                <td className="py-3 px-3">교육적 onboarding · 1st-time UX 중시</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-3 font-semibold text-white">D</td>
                <td className="py-3 px-3">통합 UX, input 1개</td>
                <td className="py-3 px-3">의도 ambiguous, smart detect 오작동 시 혼란</td>
                <td className="py-3 px-3">초대 코드가 짧고 학원명과 구분 쉬울 때</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-amber-300">E ⭐</td>
                <td className="py-3 px-3 text-amber-200">
                  Main 흐름 마찰 0 + escape hatch
                </td>
                <td className="py-3 px-3">초대 link 정상 동작 시 secondary CTA 거의 미사용</td>
                <td className="py-3 px-3 text-amber-200">
                  현재 상황 권장 (95% owner + 5% link-share-only)
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Additional considerations */}
        <section className="mt-8 rounded-xl border border-blue-400/20 bg-blue-400/[0.04] p-6">
          <h2 className="text-sm font-semibold text-blue-200 mb-3 uppercase tracking-wide">
            추가 정정 필요
          </h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">①</span>
              <span>
                <strong className="text-white">`/api/onboarding`</strong>: body의{" "}
                <code className="text-amber-300">role</code> 무시 + 무조건{" "}
                <code className="text-amber-300">role = "owner"</code> 강제. (서버
                안전망)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">②</span>
              <span>
                <strong className="text-white">middleware</strong>: invite_token
                쿠키 감지 시 <code>/onboarding</code> 대신{" "}
                <code>/invite/[token]</code> redirect. (현재는 invite link 직접
                클릭에만 의존)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">③</span>
              <span>
                <strong className="text-white">UAT S-1.5</strong>: 시나리오 본문
                "역할 선택 없음 + 원장 자동 표시" 검증으로 갱신.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">④</span>
              <span>
                <strong className="text-white">ADR</strong>: 첫 학원 생성자
                owner-강제 정책을 ADR로 영구화 (현재 RBAC ADR 부재).
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
