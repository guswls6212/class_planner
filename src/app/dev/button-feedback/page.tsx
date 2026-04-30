"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { Check, Copy, X, Loader2 } from "lucide-react";
import { showSuccess } from "@/lib/toast";

if (process.env.NODE_ENV === "production") {
  notFound();
}

const MOCK_ROWS = [
  { id: "1", label: null, owner: "이현진", expiry: "2026. 5. 29." },
  { id: "2", label: "수학 기초반", owner: "강지원", expiry: "2026. 5. 30." },
];

/* ──────────────────────────────────────────────────────────
   Shared layout for a demo row (모사: 공유 링크 카드 한 줄)
────────────────────────────────────────────────────────── */
function DemoRow({
  row,
  copyButton,
  cancelButton,
}: {
  row: (typeof MOCK_ROWS)[number];
  copyButton: React.ReactNode;
  cancelButton: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-bg-primary)]">
      <div className="min-w-0 flex-1 mr-3">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {row.label ? (
            row.label
          ) : (
            <span className="italic text-[var(--color-text-muted)]">(제목 없음)</span>
          )}
          <span className="ml-2 text-xs text-[var(--color-text-secondary)]">· {row.owner}</span>
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">만료: {row.expiry}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        {copyButton}
        {cancelButton}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Variant card wrapper
────────────────────────────────────────────────────────── */
function VariantCard({
  letter,
  name,
  desc,
  recommended,
  children,
}: {
  letter: string;
  name: string;
  desc: string;
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-[var(--color-bg-secondary)] rounded-xl p-5 border flex flex-col gap-4 ${
        recommended
          ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30"
          : "border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-overlay-light)] text-[var(--color-text-muted)]">
              시안 {letter}
            </span>
            {recommended && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                권장
              </span>
            )}
          </div>
          <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{name}</p>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{desc}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
          직접 눌러보세요 ↓
        </p>
        {children}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   시안 A — Inline Label Swap (Linear / Stripe 스타일)
   복사 클릭 → 텍스트가 "✓ 복사됨"으로 1.5s 변신
────────────────────────────────────────────────────────── */
function VariantA() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <>
      {MOCK_ROWS.map((row) => (
        <DemoRow
          key={row.id}
          row={row}
          copyButton={
            <button
              onClick={() => handleCopy(row.id)}
              aria-live="polite"
              className={`text-xs px-3 py-1 rounded-md border transition-colors duration-200 min-w-[72px] text-center ${
                copiedId === row.id
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              {copiedId === row.id ? (
                <span className="flex items-center justify-center gap-1">
                  <Check size={11} strokeWidth={2.5} /> 복사됨
                </span>
              ) : (
                "복사"
              )}
            </button>
          }
          cancelButton={
            <button
              onClick={() => window.confirm("이 공유 링크를 취소하시겠습니까?")}
              className="text-xs px-3 py-1 border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-md hover:border-red-400/60 hover:text-red-400 transition-colors duration-200"
            >
              취소
            </button>
          }
        />
      ))}
    </>
  );
}

/* ──────────────────────────────────────────────────────────
   시안 B — Toast Notification (GitHub 스타일)
   복사 클릭 → 화면 우상단 toast만 발화. 버튼은 press 외 변화 없음.
────────────────────────────────────────────────────────── */
function VariantB() {
  const handleCopy = () => {
    showSuccess("링크가 복사되었습니다");
  };

  return (
    <>
      {MOCK_ROWS.map((row) => (
        <DemoRow
          key={row.id}
          row={row}
          copyButton={
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-md hover:bg-[var(--color-bg-secondary)] transition-colors duration-200"
            >
              <span className="flex items-center gap-1">
                <Copy size={11} /> 복사
              </span>
            </button>
          }
          cancelButton={
            <button
              onClick={() => window.confirm("이 공유 링크를 취소하시겠습니까?")}
              className="text-xs px-3 py-1 border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-md hover:border-red-400/60 hover:text-red-400 transition-colors duration-200"
            >
              취소
            </button>
          }
        />
      ))}
    </>
  );
}

/* ──────────────────────────────────────────────────────────
   시안 C — Tactile Press + Inline Swap (권장)
   누르는 순간 scale 0.97 + inset shadow (물리 버튼 느낌)
   떼는 순간 ✓ 체크 + success tint (1.5s) → 원래
   취소 버튼도 press 피드백 적용
────────────────────────────────────────────────────────── */
function VariantC() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <>
      {MOCK_ROWS.map((row) => (
        <DemoRow
          key={row.id}
          row={row}
          copyButton={
            <button
              onClick={() => handleCopy(row.id)}
              aria-live="polite"
              className={`text-xs px-3 py-1 rounded-md border transition-all duration-150 min-w-[72px] text-center
                active:scale-[0.93] active:[box-shadow:inset_0_1px_3px_rgba(0,0,0,0.18)]
                ${
                  copiedId === row.id
                    ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/30 scale-100"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                }`}
            >
              {copiedId === row.id ? (
                <span className="flex items-center justify-center gap-1">
                  <Check size={11} strokeWidth={2.5} /> 복사됨
                </span>
              ) : (
                "복사"
              )}
            </button>
          }
          cancelButton={
            <button
              onClick={() => window.confirm("이 공유 링크를 취소하시겠습니까?")}
              className="text-xs px-3 py-1 border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-md
                hover:border-red-400/60 hover:text-red-400
                active:scale-[0.93] active:[box-shadow:inset_0_1px_3px_rgba(0,0,0,0.18)]
                transition-all duration-150"
            >
              취소
            </button>
          }
        />
      ))}
    </>
  );
}

/* ──────────────────────────────────────────────────────────
   시안 D — Hybrid: C (Tactile + Swap) + Toast
   접근성 ↑ — 스크린 리더도 toast로 안내받음
   단점: 클릭 폭주 시 토스트 쌓일 수 있음
────────────────────────────────────────────────────────── */
function VariantD() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    showSuccess("링크가 복사되었습니다");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <>
      {MOCK_ROWS.map((row) => (
        <DemoRow
          key={row.id}
          row={row}
          copyButton={
            <button
              onClick={() => handleCopy(row.id)}
              aria-live="polite"
              className={`text-xs px-3 py-1 rounded-md border transition-all duration-150 min-w-[72px] text-center
                active:scale-[0.93] active:[box-shadow:inset_0_1px_3px_rgba(0,0,0,0.18)]
                ${
                  copiedId === row.id
                    ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/30 scale-100"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                }`}
            >
              {copiedId === row.id ? (
                <span className="flex items-center justify-center gap-1">
                  <Check size={11} strokeWidth={2.5} /> 복사됨
                </span>
              ) : (
                "복사"
              )}
            </button>
          }
          cancelButton={
            <button
              onClick={() => window.confirm("이 공유 링크를 취소하시겠습니까?")}
              className="text-xs px-3 py-1 border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-md
                hover:border-red-400/60 hover:text-red-400
                active:scale-[0.93] active:[box-shadow:inset_0_1px_3px_rgba(0,0,0,0.18)]
                transition-all duration-150"
            >
              취소
            </button>
          }
        />
      ))}
    </>
  );
}

/* ──────────────────────────────────────────────────────────
   Page
────────────────────────────────────────────────────────── */
export default function ButtonFeedbackDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] p-6">
      <div className="max-w-5xl mx-auto">
        {/* header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-overlay-light)] border border-[var(--color-border)] mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Dev only · 프로덕션 미노출</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            버튼 클릭 피드백 시안 비교
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 max-w-lg">
            각 시안의 "복사" 버튼을 실제로 클릭해 체감 차이를 확인하세요.
            결정 후 학원 설정 페이지와 공통 Button 컴포넌트에 일괄 적용됩니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[var(--color-border)]" /> 눌림 인지 = <strong className="text-[var(--color-text-secondary)]">Press state (Affordance)</strong></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/20" /> 성공 알림 = <strong className="text-[var(--color-text-secondary)]">Confirmation / Micro-interaction</strong></span>
            <span className="flex items-center gap-1.5"><Loader2 size={12} /> 배경 알림 = <strong className="text-[var(--color-text-secondary)]">Toast / Snackbar</strong></span>
          </div>
        </div>

        {/* 4 variants grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VariantCard
            letter="A"
            name="인라인 라벨 교체"
            desc="클릭 시 버튼 텍스트만 '✓ 복사됨'으로 바뀜. 심플, 모던 (Linear · Stripe 패턴)"
          >
            <VariantA />
          </VariantCard>

          <VariantCard
            letter="B"
            name="토스트 알림"
            desc="클릭 시 화면 우상단에 toast만 표시. 버튼은 변화 없음 (GitHub 패턴)"
          >
            <VariantB />
          </VariantCard>

          <VariantCard
            letter="C"
            name="촉각 프레스 + 인라인 교체"
            desc="누르는 순간 scale 수축 + 그림자로 '물리 버튼' 느낌. 떼는 순간 ✓ 스왑 (Apple · Material 하이브리드)"
            recommended
          >
            <VariantC />
          </VariantCard>

          <VariantCard
            letter="D"
            name="하이브리드 (C + Toast)"
            desc="C의 촉각 피드백에 toast까지 동시 발화. 접근성 ↑, 단 토스트 노이즈 위험"
          >
            <VariantD />
          </VariantCard>
        </div>

        {/* comparison table */}
        <div className="mt-8 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">시안 비교 요약</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] text-[var(--color-text-secondary)]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/50">
                  <th className="text-left px-4 py-2.5 font-semibold text-[var(--color-text-muted)]">항목</th>
                  {["A", "B", "C ★", "D"].map((v) => (
                    <th key={v} className="px-4 py-2.5 font-semibold text-center text-[var(--color-text-muted)]">{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["버튼이 눌렸는지 알 수 있음", "✓", "—", "✓✓", "✓✓"],
                  ["복사 성공을 버튼에서 확인", "✓", "—", "✓", "✓"],
                  ["복사 성공을 화면에서 확인", "—", "✓", "—", "✓"],
                  ["스크린 리더 안내", "△ aria-live", "✓ toast", "△ aria-live", "✓ toast"],
                  ["구현 복잡도", "낮음", "낮음", "중간", "중간"],
                  ["토스트 폭주 위험", "없음", "있음", "없음", "있음"],
                ].map(([label, ...vals]) => (
                  <tr key={label as string} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{label}</td>
                    {vals.map((v, i) => (
                      <td
                        key={i}
                        className={`px-4 py-2.5 text-center ${
                          (v as string).startsWith("✓") ? "text-emerald-400" : (v as string) === "—" ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {v as string}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-[var(--color-text-muted)] text-center">
          선택 후 이 페이지는 삭제하거나 디자인 시스템 문서로 보존할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
