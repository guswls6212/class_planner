import type { jsPDF } from "jspdf";
import { tintFromHex } from "@/lib/colors/tintFromHex";
import type { CellPosition } from "./PdfGridLayout";

export interface SessionBlockData {
  subjectName: string;
  studentNames: string[];
  color: string; // hex e.g. "#a78bfa"
  startsAt: string;
  endsAt: string;
  teacherName?: string;
}

/** Parse "#rrggbb" or "#rgb" hex to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/**
 * Session block 렌더링.
 *
 * ADR-021 D1 (PR #429 갱신):
 *   - 강사 우상단 (subject 좌상단과 같은 y, right-align)
 *   - 시간 [시작-마침] 둘 다 표시
 *   - 길이별 정보 우선순위:
 *       · 30분 미만 (height < 6mm): 제목 + 강사 우상단만
 *       · 30분~60분 (height < 10mm): + [시작-마침]
 *       · 60분~90분 (height < 18mm, **>= 10mm**): + 학생 1줄 truncate
 *       · 90분+ (height >= 18mm): + 학생 wrap (최대 2줄)
 *
 * threshold 12mm → 10mm (PR #429): union grid 의 1h cell (10mm) 도 학생 표시.
 * data-tight (D2) 적용 후 1h cell ≥ 15mm 가 default 이지만, fallback grid 보호.
 */
export function drawSessionBlock(
  doc: jsPDF,
  cell: CellPosition,
  data: SessionBlockData
): void {
  const [r, g, b] = hexToRgb(data.color);
  const [lr, lg, lb] = hexToRgb(tintFromHex(data.color, 0.8));
  const padding = 1;

  // Background (pastel)
  doc.setFillColor(lr, lg, lb);
  doc.rect(
    cell.x + padding,
    cell.y + padding,
    cell.width - 2 * padding,
    cell.height - 2 * padding,
    "F"
  );

  // Left accent stripe (1.5mm)
  doc.setFillColor(r, g, b);
  doc.rect(cell.x + padding, cell.y + padding, 1.5, cell.height - 2 * padding, "F");

  // Text positioning
  const textX = cell.x + padding + 3;
  const textXRight = cell.x + cell.width - padding - 1;
  let textY = cell.y + padding + 3;
  const cellHeight = cell.height;

  // 1. Subject 좌상단 (항상) + Teacher 우상단 (항상)
  doc.setFont("Pretendard", "normal");
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);
  doc.text(data.subjectName, textX, textY);
  if (data.teacherName) {
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(data.teacherName, textXRight, textY, { align: "right" });
  }
  textY += 3.5;

  // 2. [시작-마침] 시간 — 30분 이상 (>= 6mm)
  if (cellHeight >= 6) {
    doc.setFontSize(5.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${data.startsAt} - ${data.endsAt}`,
      textX,
      textY,
      { maxWidth: cell.width - padding - 4 },
    );
    textY += 3;
  }

  // 3. 학생 — 60분 이상 (>= 10mm, PR #429)
  if (cellHeight >= 10 && data.studentNames.length > 0) {
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    const names = data.studentNames.join(", ");
    // 90분+ 면 wrap (최대 2줄), 60-90분 은 1줄 truncate.
    const maxLines = cellHeight >= 18 ? 2 : 1;
    // 1h cell (10mm) 빠듯한 fit 위해 lineHeight 미세 조정 (2.8 → 2.4).
    drawTextClamped(doc, names, textX, textY, {
      maxWidth: cell.width - padding - 4,
      maxLines,
      lineHeight: 2.4,
    });
  }
}

/**
 * jsPDF doc.text 의 maxWidth 는 자동 wrap 하지만 줄 수 제한 X.
 * 줄 수 제한 + truncate "..." 처리.
 */
function drawTextClamped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  opts: { maxWidth: number; maxLines: number; lineHeight: number },
): void {
  const { maxWidth, maxLines, lineHeight } = opts;
  // jsPDF splitTextToSize — 자동 줄바꿈
  const lines: string[] = doc.splitTextToSize(text, maxWidth);
  if (lines.length <= maxLines) {
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], x, y + i * lineHeight);
    }
    return;
  }
  // 초과 — 마지막 visible 줄에 "..." 추가
  for (let i = 0; i < maxLines - 1; i++) {
    doc.text(lines[i], x, y + i * lineHeight);
  }
  const lastIdx = maxLines - 1;
  const lastLine = lines[lastIdx];
  // 끝에 "..." 추가 — 너무 길면 잘라냄
  let truncated = lastLine.replace(/[,，\s]+$/, "") + "...";
  while (doc.getTextWidth(truncated) > maxWidth && truncated.length > 4) {
    truncated = truncated.slice(0, -4) + "...";
  }
  doc.text(truncated, x, y + lastIdx * lineHeight);
}
