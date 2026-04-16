import type { jsPDF } from "jspdf";
import type { CellPosition } from "./PdfGridLayout";

export interface SessionBlockData {
  subjectName: string;
  studentNames: string[];
  color: string; // hex e.g. "#a78bfa"
  startsAt: string;
  endsAt: string;
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

/** Lighten color for pastel background (mix with white 80%) */
function lightenColor(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  return [
    Math.round(r * 0.2 + 255 * 0.8),
    Math.round(g * 0.2 + 255 * 0.8),
    Math.round(b * 0.2 + 255 * 0.8),
  ];
}

export function drawSessionBlock(
  doc: jsPDF,
  cell: CellPosition,
  data: SessionBlockData
): void {
  const [r, g, b] = hexToRgb(data.color);
  const [lr, lg, lb] = lightenColor(r, g, b);
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

  // Left accent border (3px)
  doc.setFillColor(r, g, b);
  doc.rect(cell.x + padding, cell.y + padding, 1.5, cell.height - 2 * padding, "F");

  // Text
  doc.setTextColor(40, 40, 40);
  const textX = cell.x + padding + 3;
  let textY = cell.y + padding + 3;

  // Subject name
  doc.setFont("Pretendard", "normal");
  doc.setFontSize(7);
  doc.text(data.subjectName, textX, textY);
  textY += 3.5;

  // Student names
  if (data.studentNames.length > 0 && cell.height > 8) {
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    const names = data.studentNames.join(", ");
    doc.text(names, textX, textY, { maxWidth: cell.width - padding - 4 });
    textY += 3;
  }

  // Time
  if (cell.height > 12) {
    doc.setFontSize(5.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`${data.startsAt}–${data.endsAt}`, textX, textY);
  }
}
