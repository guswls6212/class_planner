"use client";

import React from "react";
import { useModalA11y } from "@/hooks/useModalA11y";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const LIMIT_ROWS = [
  { case: "강사 1명 학원", singlePage: "✅", withSplit: "—", hardLimit: "—" },
  { case: "동시간 최대 lane 2", singlePage: "✅", withSplit: "—", hardLimit: "—" },
  { case: "동시간 최대 lane 3", singlePage: "△ 빠듯", withSplit: "✅ 강사별", hardLimit: "—" },
  { case: "동시간 4건 이상", singlePage: "❌ 텍스트 불가", withSplit: "✅ 강사별", hardLimit: "—" },
  { case: "동시간 5건+", singlePage: "❌", withSplit: "✅ 강사별*", hardLimit: "강사 간 겹침 시 불가" },
  { case: "9시 이전/23시 이후 수업", singlePage: "❌ 누락", withSplit: "—", hardLimit: "현재 버전 제한" },
  { case: "일요일 수업", singlePage: "✅", withSplit: "—", hardLimit: "—" },
];

// PR #429-B: 출력 시간 범위별 1h cell 가독성 표 (D2 data-tight 적용 후)
const RANGE_ROWS = [
  { range: "9-18시 (9h)", cellHeight: "17mm", studentLine: "✅ 여유", note: "—" },
  { range: "9-20시 (11h)", cellHeight: "14mm", studentLine: "✅", note: "—" },
  { range: "9-22시 (13h)", cellHeight: "12mm", studentLine: "⚠ 빠듯", note: "font 작아짐" },
  { range: "9-24시 (15h)", cellHeight: "10mm", studentLine: "△ truncate", note: "1줄만, lineHeight 작음" },
  { range: "≥14h 광범위", cellHeight: "< 11mm", studentLine: "❌ 잘림 위험", note: "preflight 경고" },
];

export default function PdfGuideModal({ isOpen, onClose }: Props) {
  const { containerRef } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-guide-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-bg-primary)] rounded-lg p-6 w-full max-w-[600px] shadow-xl max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            id="pdf-guide-title"
            className="text-base font-semibold text-[var(--color-text-primary)]"
          >
            PDF 출력 가이드
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          A4 가로 출력 기준으로 동시 수업 수에 따라 표현 가능한 범위가 달라집니다.
        </p>

        <div className="overflow-x-auto mb-5">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)]">
                <th className="border border-[var(--color-border)] px-2 py-1.5 text-left">케이스</th>
                <th className="border border-[var(--color-border)] px-2 py-1.5">단일 A4</th>
                <th className="border border-[var(--color-border)] px-2 py-1.5">분할 출력</th>
                <th className="border border-[var(--color-border)] px-2 py-1.5">본질 한계</th>
              </tr>
            </thead>
            <tbody>
              {LIMIT_ROWS.map((row) => (
                <tr key={row.case} className="hover:bg-[var(--color-bg-secondary)]/50">
                  <td className="border border-[var(--color-border)] px-2 py-1.5 text-[var(--color-text-primary)]">
                    {row.case}
                  </td>
                  <td className="border border-[var(--color-border)] px-2 py-1.5 text-center text-[var(--color-text-secondary)]">
                    {row.singlePage}
                  </td>
                  <td className="border border-[var(--color-border)] px-2 py-1.5 text-center text-[var(--color-text-secondary)]">
                    {row.withSplit}
                  </td>
                  <td className="border border-[var(--color-border)] px-2 py-1.5 text-center text-[var(--color-text-muted)]">
                    {row.hardLimit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2 mt-2">
          출력 시간 범위별 가독성 (1시간 수업 기준)
        </h4>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)]">
                <th className="border border-[var(--color-border)] px-2 py-1.5 text-left">출력 범위</th>
                <th className="border border-[var(--color-border)] px-2 py-1.5">1h cell</th>
                <th className="border border-[var(--color-border)] px-2 py-1.5">학생 1줄</th>
                <th className="border border-[var(--color-border)] px-2 py-1.5">비고</th>
              </tr>
            </thead>
            <tbody>
              {RANGE_ROWS.map((row) => (
                <tr key={row.range} className="hover:bg-[var(--color-bg-secondary)]/50">
                  <td className="border border-[var(--color-border)] px-2 py-1.5 text-[var(--color-text-primary)]">
                    {row.range}
                  </td>
                  <td className="border border-[var(--color-border)] px-2 py-1.5 text-center text-[var(--color-text-secondary)]">
                    {row.cellHeight}
                  </td>
                  <td className="border border-[var(--color-border)] px-2 py-1.5 text-center text-[var(--color-text-secondary)]">
                    {row.studentLine}
                  </td>
                  <td className="border border-[var(--color-border)] px-2 py-1.5 text-center text-[var(--color-text-muted)]">
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-[var(--color-text-muted)] space-y-1">
          <p>• <strong>출력 범위 자동 조정 (PR #429):</strong> PDF 출력 시 데이터 범위 + 1시간 padding 으로 자동 결정 — 빈 공간 제거</p>
          <p>• <strong>화면 시간 범위 (9-23시 등):</strong> 화면 표시용 — PDF 출력에는 데이터 기준 적용</p>
          <p>• <strong>강사별 분할:</strong> PDF 다운로드 버튼 → &quot;강사별로 1장씩&quot; — 강사당 최대 lane 2~3</p>
          <p>• <strong>학생별 분할 (PR #428):</strong> &quot;학생별로 1장씩&quot; — 학생당 1 PDF, 30명+ 시 confirm</p>
        </div>
      </div>
    </div>
  );
}
