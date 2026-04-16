import type { jsPDF } from "jspdf";
import type { GridDimensions } from "./PdfGridLayout";

export interface HeaderOptions {
  academyName: string;
  dateRange?: string;
  printDate: string;
}

export function drawHeader(
  doc: jsPDF,
  dims: GridDimensions,
  options: HeaderOptions
): void {
  const { margin, pageWidth, headerHeight } = dims;
  const y = margin.top + headerHeight / 2;

  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(options.academyName, margin.left + dims.timeColWidth, y, {
    baseline: "middle",
  });

  if (options.dateRange) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(options.dateRange, pageWidth / 2, y, {
      align: "center",
      baseline: "middle",
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`인쇄: ${options.printDate}`, pageWidth - margin.right, y, {
    align: "right",
    baseline: "middle",
  });

  // Header divider
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(
    margin.left,
    margin.top + headerHeight,
    pageWidth - margin.right,
    margin.top + headerHeight
  );
}

export function drawFooter(doc: jsPDF, dims: GridDimensions): void {
  const { margin, pageWidth, pageHeight, footerHeight } = dims;
  const y = pageHeight - margin.bottom - footerHeight / 2;

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("CLASS PLANNER", pageWidth / 2, y, {
    align: "center",
    baseline: "middle",
  });
}
