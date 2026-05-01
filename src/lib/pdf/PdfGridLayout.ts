/**
 * A4 Landscape (297mm × 210mm) grid coordinate calculator for jsPDF.
 */

export interface GridDimensions {
  pageWidth: number;
  pageHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  headerHeight: number;
  footerHeight: number;
  timeColWidth: number;
  dayColWidth: number;
  gridTop: number;
  gridBottom: number;
  slotHeight: number;
}

export interface CellPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateGridDimensions(
  weekdayCount: number = 5,
  startHour: number = 9,
  endHour: number = 23
): GridDimensions {
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = { top: 15, right: 10, bottom: 15, left: 10 };
  const headerHeight = 20;
  const footerHeight = 10;
  const timeColWidth = 15;

  const gridTop = margin.top + headerHeight;
  const gridBottom = pageHeight - margin.bottom - footerHeight;
  const availableWidth = pageWidth - margin.left - margin.right - timeColWidth;
  const dayColWidth = availableWidth / weekdayCount;
  const totalSlots = (endHour - startHour) * 2; // 30-min slots
  const slotHeight = (gridBottom - gridTop) / totalSlots;

  return {
    pageWidth,
    pageHeight,
    margin,
    headerHeight,
    footerHeight,
    timeColWidth,
    dayColWidth,
    gridTop,
    gridBottom,
    slotHeight,
  };
}

export function getCellPosition(
  dims: GridDimensions,
  weekday: number,
  startsAt: string,
  endsAt: string,
  startHour: number = 9,
  laneIndex: number = 0,
  totalLanes: number = 1
): CellPosition {
  const [sh, sm] = startsAt.split(":").map(Number);
  const [eh, em] = endsAt.split(":").map(Number);
  const startSlot = (sh - startHour) * 2 + sm / 30;
  const endSlot = (eh - startHour) * 2 + em / 30;
  const laneWidth = dims.dayColWidth / totalLanes;

  return {
    x: dims.margin.left + dims.timeColWidth + weekday * dims.dayColWidth + laneIndex * laneWidth,
    y: dims.gridTop + startSlot * dims.slotHeight,
    width: laneWidth,
    height: (endSlot - startSlot) * dims.slotHeight,
  };
}

/** Draw the time column and day column headers + grid lines */
export function drawGridLines(
  doc: import("jspdf").jsPDF,
  dims: GridDimensions,
  weekdays: string[],
  startHour: number = 9,
  endHour: number = 23
): void {
  const { margin, timeColWidth, dayColWidth, gridTop, gridBottom, slotHeight } =
    dims;

  // Day headers
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  weekdays.forEach((day, i) => {
    const x =
      margin.left + timeColWidth + i * dayColWidth + dayColWidth / 2;
    doc.text(day, x, margin.top + dims.headerHeight - 3, { align: "center" });
  });

  // Vertical lines (day separators)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= weekdays.length; i++) {
    const x = margin.left + timeColWidth + i * dayColWidth;
    doc.line(x, gridTop, x, gridBottom);
  }

  // Horizontal lines (time slots) + time labels
  const totalSlots = (endHour - startHour) * 2;
  for (let slot = 0; slot <= totalSlots; slot++) {
    const y = gridTop + slot * slotHeight;
    doc.line(
      margin.left + timeColWidth,
      y,
      margin.left + timeColWidth + weekdays.length * dayColWidth,
      y
    );

    const totalMinutes = slot * 30;
    const hour = startHour + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const label = minute === 0 ? `${hour}:00` : `${hour}:30`;
    doc.setFontSize(minute === 0 ? 7 : 5.5);
    doc.setTextColor(minute === 0 ? 120 : 160, minute === 0 ? 120 : 160, minute === 0 ? 120 : 160);
    doc.text(label, margin.left + timeColWidth - 1, y + 1, { align: "right" });
  }

}
