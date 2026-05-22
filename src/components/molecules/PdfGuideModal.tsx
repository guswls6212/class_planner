"use client";

import React from "react";
import { useModalA11y } from "@/hooks/useModalA11y";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const LIMIT_ROWS = [
  { case: "강사 1명만 있는 학원", singlePage: "✅", withSplit: "—", hardLimit: "—" },
  { case: "같은 시간 수업 최대 2개", singlePage: "✅", withSplit: "—", hardLimit: "—" },
  { case: "같은 시간 수업 3개", singlePage: "△ 빠듯", withSplit: "✅ 강사별 분할", hardLimit: "—" },
  { case: "같은 시간 수업 4개 이상", singlePage: "❌ 글자 가려짐", withSplit: "✅ 강사별 분할", hardLimit: "—" },
  { case: "같은 시간 수업 5개 이상", singlePage: "❌", withSplit: "✅ 강사별 분할*", hardLimit: "한 강사가 같은 시간에 여러 수업하면 분할도 한계" },
  { case: "9시 이전 / 23시 이후 수업", singlePage: "❌ 표시 안 됨", withSplit: "—", hardLimit: "현재 버전 제한" },
  { case: "일요일 수업", singlePage: "✅", withSplit: "—", hardLimit: "—" },
];

// 출력 시간 범위별 1시간 수업 가독성 표
const RANGE_ROWS = [
  { range: "9시 - 18시 (9시간)", cellHeight: "여유", studentLine: "✅ 학생 이름 잘 보임", note: "—" },
  { range: "9시 - 20시 (11시간)", cellHeight: "여유", studentLine: "✅ 학생 이름 보임", note: "—" },
  { range: "9시 - 22시 (13시간)", cellHeight: "보통", studentLine: "⚠ 빠듯하게 보임", note: "글씨 작아짐" },
  { range: "9시 - 24시 (15시간)", cellHeight: "좁음", studentLine: "△ 일부만 보임", note: "긴 이름은 잘림" },
  { range: "14시간 이상 광범위", cellHeight: "매우 좁음", studentLine: "❌ 잘릴 위험", note: "출력 전 안내 표시" },
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
                <th className="border border-[var(--color-border)] px-2 py-1.5">1시간 수업 칸</th>
                <th className="border border-[var(--color-border)] px-2 py-1.5">학생 이름 표시</th>
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
          <p>• <strong>출력 시간 자동 조정:</strong> 실제 수업이 있는 시간대만 PDF에 나오도록 자동으로 맞춰서 출력해요. 위아래 빈 공간을 줄여서 가독성을 높입니다.</p>
          <p>• <strong>화면 시간 범위 (9-23시 등):</strong> 화면에 보여줄 시간대 설정입니다. PDF 출력은 실제 수업 시간 기준으로 자동 조정됩니다.</p>
          <p>• <strong>강사별 분할:</strong> PDF 다운로드 → &quot;강사별로 1장씩&quot; 선택 — 강사마다 한 페이지씩 출력합니다.</p>
          <p>• <strong>학생별 분할:</strong> &quot;학생별로 1장씩&quot; 선택 — 학생마다 한 페이지씩 (학생이 30명 넘으면 한 번 더 확인 메시지가 떠요).</p>
        </div>
      </div>
    </div>
  );
}
