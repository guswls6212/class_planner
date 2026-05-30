"use client";

import { Link2 } from "lucide-react";
import { InfoHint } from "@/components/atoms/InfoHint";
import Button from "@/components/atoms/Button";
import { SHARE_LINK_TOOLTIP } from "@/lib/shareCopy";

/**
 * AcademyShareBar — /students 상단 「학원 전체 공유 링크」 바 (presentational).
 *
 * 한 문장 책임: 학원 전체 공유 링크를 한 줄로 보여주고 복사/생성하게 한다.
 * 데이터·핸들러는 부모(students/page)가 주입 — 본 컴포넌트는 표시만.
 *  - 링크 있음: URL + D-day 만료 + 복사
 *  - 링크 없음: "공유 링크 만들기" (생성 후 부모가 복사까지)
 */
interface AcademyShareBarProps {
  /** /share/<token> 절대 URL — 없으면 생성 버튼 표시 */
  shareUrl: string | null;
  /** ISO expires_at — D-day 계산용 */
  expiresAt: string | null;
  onCreate: () => void;
  onCopy: () => void;
  busy?: boolean;
}

export default function AcademyShareBar({
  shareUrl,
  expiresAt,
  onCreate,
  onCopy,
  busy = false,
}: AcademyShareBarProps) {
  // D-day — formatExpiry 와 동일 계산 (ceil 일 단위). access code 뱃지와 표기 일치.
  const dday =
    expiresAt != null
      ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
      : null;
  const ddayLabel =
    dday == null ? null : dday < 0 ? "만료" : dday === 0 ? "오늘 만료" : `D-${dday}`;

  return (
    <div
      className="mx-3 mb-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2.5"
      data-testid="academy-share-bar"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Link2 size={13} strokeWidth={1.5} className="text-accent flex-shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">
          학원 전체 공유
        </span>
        <InfoHint text={SHARE_LINK_TOOLTIP} label="학원 전체 공유 링크 설명" />
        {ddayLabel && (
          <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
            {ddayLabel}
          </span>
        )}
      </div>

      {shareUrl ? (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 truncate rounded-md bg-[var(--color-bg-primary)] px-2 py-1.5 font-mono text-[11px] text-[var(--color-text-muted)]">
            {shareUrl}
          </div>
          <Button
            variant="tonal"
            size="small"
            feedback="inline"
            successLabel="복사됨"
            toastMessage="학원 전체 공유 링크가 복사됐습니다"
            onClick={onCopy}
            data-testid="academy-share-copy"
          >
            복사
          </Button>
        </div>
      ) : (
        <Button
          variant="accent"
          size="small"
          onClick={onCreate}
          disabled={busy}
          data-testid="academy-share-create"
          className="w-full"
        >
          {busy ? "생성 중..." : "공유 링크 만들기"}
        </Button>
      )}
    </div>
  );
}
