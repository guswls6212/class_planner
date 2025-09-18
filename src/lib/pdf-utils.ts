import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { logger } from "./logger";

/**
 * HTML 요소를 PDF로 변환하여 다운로드하는 유틸리티 함수들
 */

export interface PDFDownloadOptions {
  filename?: string;
  format?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
  quality?: number; // 🎯 이미지 품질 (0.1~2.0, 기본값: 2.0 = 인쇄용 고품질)
}

/**
 * 시간을 분으로 변환하는 함수
 */
export function timeToMinutes(time: string): number {
  if (!time || typeof time !== "string") {
    console.warn("Invalid time format:", time);
    return 0;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * 분을 시간으로 변환하는 함수
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

/**
 * 세션 시간 범위를 계산하는 함수
 */
export function calculateSessionTimeRange(element: HTMLElement): {
  startTime: string;
  endTime: string;
  hasSessions: boolean;
} {
  // 세션 블록들을 찾기
  const sessionBlocks = element.querySelectorAll(
    "[data-session-id], .session-block, .SessionBlock"
  );

  if (sessionBlocks.length === 0) {
    return {
      startTime: "09:00",
      endTime: "24:00",
      hasSessions: false,
    };
  }

  // 모든 세션의 시작/종료 시간을 수집
  const allTimes: number[] = [];
  sessionBlocks.forEach((block) => {
    const sessionElement = block as HTMLElement;
    const startsAt = sessionElement.getAttribute("data-starts-at");
    const endsAt = sessionElement.getAttribute("data-ends-at");

    if (startsAt) {
      allTimes.push(timeToMinutes(startsAt));
    }
    if (endsAt) {
      allTimes.push(timeToMinutes(endsAt));
    }
  });

  if (allTimes.length === 0) {
    return {
      startTime: "09:00",
      endTime: "24:00",
      hasSessions: false,
    };
  }

  // 가장 빠른 시작 시간과 가장 늦은 종료 시간 계산
  const earliestStart = minutesToTime(Math.min(...allTimes));
  const latestEnd = minutesToTime(Math.max(...allTimes));

  // 🆕 실제 세션 범위 사용 (가장 빠른 시작 ~ 가장 늦은 종료)
  const startTime = earliestStart;
  const endTime = latestEnd;

  logger.info("📊 PDF 세션 시간 범위 계산:", {
    originalEarliest: earliestStart,
    originalLatest: latestEnd,
    finalStart: startTime,
    finalEnd: endTime,
    hasSessions: true,
  });

  return {
    startTime,
    endTime,
    hasSessions: true,
  };
}

/**
 * 시간 헤더만 추출하는 유틸리티 함수 (요일 헤더 제외)
 */
export function extractTimeHeaders(element: HTMLElement): Element[] {
  // 실제 시간 헤더들 확인 (sticky 포함) - 요일 헤더는 제외
  const allHeaders = element.querySelectorAll(
    'div[style*="text-align: center"][style*="height: 40px"]'
  );
  const timeHeaders = Array.from(allHeaders).filter((header: Element) => {
    const text = header.textContent?.trim();
    // 🆕 요일 헤더는 제외 (월, 화, 수, 목, 금, 토, 일)
    // 🆕 추가로 요일 라벨이 시간 헤더로 인식되는 것을 방지
    return (
      !["월", "화", "수", "목", "금", "토", "일"].includes(text || "") &&
      !header.closest(".time-table-row")
    ); // 🆕 TimeTableRow 내부의 요소는 제외
  });

  return timeHeaders;
}

/**
 * 세션 범위에 맞지 않는 시간 헤더들을 숨기고, 세션 시작 시간보다 앞선 헤더 개수를 반환하는 함수
 *
 * @param element 시간표 HTML 요소
 * @param startTime 세션 시작 시간 (예: "10:00")
 * @param endTime 세션 종료 시간 (예: "15:00")
 * @returns 세션 시작 시간보다 앞선 시간 헤더 개수 (세션셀 위치 조정용)
 */
export function hideTimeHeadersOutsideSessionRange(
  element: HTMLElement,
  startTime: string,
  endTime: string
): number {
  // 시간 헤더만 추출 (요일 헤더 제외)
  const timeHeaders = extractTimeHeaders(element);

  // 세션 범위에 맞지 않는 시간 헤더들을 숨기기
  let headersHiddenBeforeStartTime = 0; // 세션 시작 시간보다 앞선 시간 헤더 개수 (세션셀 위치 조정용)

  timeHeaders.forEach((header) => {
    const headerElement = header as HTMLElement;
    const timeText = headerElement.textContent?.trim();
    const timeMatch = timeText?.match(/(\d{1,2}:\d{2})/);

    if (timeMatch) {
      const time = timeMatch[1];
      const timeMinutes = timeToMinutes(time);
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // 세션 범위 밖의 시간 헤더는 숨기기
      if (timeMinutes < startMinutes || timeMinutes > endMinutes) {
        headerElement.style.display = "none";

        // 세션 시작 시간보다 앞선 시간 헤더 개수 계산
        if (timeMinutes < startMinutes) {
          headersHiddenBeforeStartTime++;
        }

        logger.debug("시간 헤더 숨김", { time, startTime, endTime });
      }
    }
  });

  return headersHiddenBeforeStartTime; // 세션 시작 시간보다 앞선 시간 헤더 개수 반환
}

/**
 * 숨겨진 시간 헤더들을 다시 표시하는 함수
 */
export function restoreHiddenTimeHeaders(element: HTMLElement): void {
  // 시간 헤더만 추출 (요일 헤더 제외)
  const timeHeaders = extractTimeHeaders(element);

  // 숨겨진 시간 헤더들을 다시 표시
  timeHeaders.forEach((header) => {
    const headerElement = header as HTMLElement;
    if (headerElement.style.display === "none") {
      headerElement.style.display = ""; // 원래 display 값으로 복원
      logger.debug("시간 헤더 복원", {
        headerText: headerElement.textContent?.trim(),
        action: "display: none → ''",
      });
    }
  });
}
/**
 * 세션셀 위치를 조정하는 함수
 */
export function adjustSessionPositions(
  element: HTMLElement,
  headersHiddenBeforeStartTime: number
): void {
  // 🆕 세션셀들의 위치 조정 (세션 시작 시간보다 앞선 시간 헤더만큼 앞당기기)
  const sessionBlocks = element.querySelectorAll(
    "[data-session-id], .session-block, .SessionBlock"
  );

  sessionBlocks.forEach((block) => {
    const sessionElement = block as HTMLElement;
    const currentLeft = sessionElement.style.left;
    const currentLeftValue = parseInt(currentLeft) || 0;

    // 세션 시작 시간보다 앞선 시간 헤더 개수만큼 앞당기기 (30분당 100px)
    const newLeftValue = Math.max(
      0,
      currentLeftValue - headersHiddenBeforeStartTime * 100
    );
    sessionElement.style.left = `${newLeftValue}px`;

    logger.debug("세션셀 위치 조정", {
      currentLeft,
      newLeftValue,
      headersHiddenBeforeStartTime,
    });
  });
}

/**
 * HTML 요소를 라이트 테마로 강제 변환하여 캔버스로 변환
 * 세션 셀의 스타일을 보존하여 가독성 향상
 * 안전한 스타일 복원을 위한 추가 보장 장치 포함
 *
 * @param element 캡처할 HTML 요소
 * @param options 캡처 옵션
 * @param options.quality 이미지 품질 (0.1~2.0)
 *   - 0.1: 매우 낮은 품질 (빠른 처리, 작은 파일)
 *   - 1.0: 기본 품질 (일반적인 용도)
 *   - 2.0: 고품질 (인쇄용, 텍스트와 색상이 매우 선명함) - 기본값
 * @param options.backgroundColor 배경색 (기본값: '#ffffff')
 * @param options.sessionRange 세션 범위 기반 캡처 여부 (기본값: false)
 * @returns HTMLCanvasElement
 */
export async function captureElement(
  element: HTMLElement,
  options: {
    quality?: number;
    backgroundColor?: string;
    sessionRange?: boolean;
  } = {}
): Promise<HTMLCanvasElement> {
  const {
    backgroundColor = "#ffffff",
    sessionRange = false,
    quality = 2, // 🎯 고품질 설정 (0.1~2.0, 2.0은 인쇄용 최고 품질)
  } = options;

  // 원본 스타일 백업 - 더 안전한 방식으로 변경
  const originalStyles = new Map<HTMLElement, Map<string, string>>();
  const originalCSSVars = new Map<string, string>();

  // 스타일 복원 실패 시 자동 복원을 위한 백업
  const styleBackup = new Map<HTMLElement, { [key: string]: string }>();

  // 원본 스크롤 위치 백업
  const originalScrollLeft = element.scrollLeft;
  const originalScrollTop = element.scrollTop;

  // 원본 스타일 백업
  const originalOverflow = element.style.overflow;
  const originalMaxWidth = element.style.maxWidth;
  const originalMaxHeight = element.style.maxHeight;
  const originalPosition = element.style.position;
  const originalTop = element.style.top;
  const originalLeft = element.style.left;
  const originalZIndex = element.style.zIndex;
  const originalWidth = element.style.width;
  const originalClipPath = element.style.clipPath;
  const originalWebkitClipPath = (
    element.style as CSSStyleDeclaration & { webkitClipPath?: string }
  ).webkitClipPath;

  // 세션 범위 계산
  let sessionTimeRange = {
    startTime: "09:00",
    endTime: "18:00",
    hasSessions: false,
  };
  if (sessionRange) {
    sessionTimeRange = calculateSessionTimeRange(element);
  }

  // 🆕 원본 세션셀 위치 백업을 위한 변수
  const originalSessionPositions: { element: HTMLElement; left: string }[] = [];

  try {
    // 라이트 테마 CSS 변수들로 강제 변경
    const lightThemeVars = {
      "--color-background": "#ffffff",
      "--color-text": "#1f2937",
      "--color-text-secondary": "#6b7280",
      "--color-border": "#d1d5db",
      "--color-border-grid": "#e5e7eb",
      "--color-border-grid-light": "#f3f4f6",
      "--color-primary": "#3b82f6",
      "--color-secondary": "#6b7280",
      "--color-danger": "#ef4444",
      "--color-success": "#10b981",
      "--color-warning": "#f59e0b",
    };

    // CSS 변수들을 라이트 테마로 변경
    Object.entries(lightThemeVars).forEach(([varName, value]) => {
      const computedStyle = getComputedStyle(document.documentElement);
      const originalValue = computedStyle.getPropertyValue(varName);
      if (originalValue) {
        originalCSSVars.set(varName, originalValue);
        document.documentElement.style.setProperty(varName, value);
      }
    });

    // 세션 셀의 스타일을 보존하면서 라이트 테마로 변환
    const elementsToStyle = element.querySelectorAll("*");
    elementsToStyle.forEach((el) => {
      const computedStyle = getComputedStyle(el);
      const style = (el as HTMLElement).style;

      // 세션 블록인지 확인 (data-session-id 속성이나 특정 클래스로 판단)
      const isSessionBlock =
        el.hasAttribute("data-session-id") ||
        el.className.includes("session-block") ||
        el.className.includes("SessionBlock");

      if (isSessionBlock) {
        // 세션 블록의 경우 배경색과 테두리를 보존하되 라이트 테마에 맞게 조정
        const currentBgColor = computedStyle.backgroundColor;

        // 이 요소의 원본 스타일을 저장할 Map 생성
        if (!originalStyles.has(el as HTMLElement)) {
          originalStyles.set(el as HTMLElement, new Map());
        }
        const elementStyles = originalStyles.get(el as HTMLElement)!;

        if (currentBgColor && currentBgColor !== "rgba(0, 0, 0, 0)") {
          // 원본 색상을 보존하되 밝기 조정
          elementStyles.set("backgroundColor", style.backgroundColor);

          // 백업에도 저장
          if (!styleBackup.has(el as HTMLElement)) {
            styleBackup.set(el as HTMLElement, {});
          }
          styleBackup.get(el as HTMLElement)!.backgroundColor =
            style.backgroundColor;

          // 색상을 더 밝고 선명하게 조정
          const adjustedColor = adjustColorForLightTheme(currentBgColor);
          style.backgroundColor = adjustedColor;
        }

        // 세션 블록에 테두리 추가 (라이트 테마용)
        if (!computedStyle.border || computedStyle.border === "none") {
          elementStyles.set("border", style.border);

          // 백업에도 저장
          if (!styleBackup.has(el as HTMLElement)) {
            styleBackup.set(el as HTMLElement, {});
          }
          styleBackup.get(el as HTMLElement)!.border = style.border;

          style.border = "1px solid #d1d5db";
        }

        // 텍스트 색상을 어두운 색으로 설정하여 가독성 향상
        elementStyles.set("color", style.color);

        // 백업에도 저장
        if (!styleBackup.has(el as HTMLElement)) {
          styleBackup.set(el as HTMLElement, {});
        }
        styleBackup.get(el as HTMLElement)!.color = style.color;

        style.color = "#1f2937";

        // 시간 정보를 더 명확하게 표시하기 위한 스타일 추가
        elementStyles.set("fontWeight", style.fontWeight);

        // 백업에도 저장
        if (!styleBackup.has(el as HTMLElement)) {
          styleBackup.set(el as HTMLElement, {});
        }
        styleBackup.get(el as HTMLElement)!.fontWeight = style.fontWeight;

        style.fontWeight = "600";
      } else {
        // 일반 요소의 경우 기존 로직 적용
        if (
          computedStyle.backgroundColor &&
          computedStyle.backgroundColor !== "rgba(0, 0, 0, 0)"
        ) {
          // 이 요소의 원본 스타일을 저장할 Map 생성
          if (!originalStyles.has(el as HTMLElement)) {
            originalStyles.set(el as HTMLElement, new Map());
          }
          const elementStyles = originalStyles.get(el as HTMLElement)!;

          elementStyles.set("backgroundColor", style.backgroundColor);

          // 백업에도 저장
          if (!styleBackup.has(el as HTMLElement)) {
            styleBackup.set(el as HTMLElement, {});
          }
          styleBackup.get(el as HTMLElement)!.backgroundColor =
            style.backgroundColor;

          style.backgroundColor = "#ffffff";
        }

        if (computedStyle.color && computedStyle.color !== "rgba(0, 0, 0, 0)") {
          // 이 요소의 원본 스타일을 저장할 Map 생성
          if (!originalStyles.has(el as HTMLElement)) {
            originalStyles.set(el as HTMLElement, new Map());
          }
          const elementStyles = originalStyles.get(el as HTMLElement)!;

          elementStyles.set("color", style.color);

          // 백업에도 저장
          if (!styleBackup.has(el as HTMLElement)) {
            styleBackup.set(el as HTMLElement, {});
          }
          styleBackup.get(el as HTMLElement)!.color = style.color;

          style.color = "#1f2937";
        }
      }
    });

    // 🆕 세션 범위에 맞는 시간 헤더 필터링 및 세션셀 위치 조정
    if (sessionRange && sessionTimeRange.hasSessions) {
      logger.debug("세션 범위 필터링 시작", { sessionTimeRange });

      // 🆕 원본 세션셀 위치 백업
      const originalSessionBlocks = element.querySelectorAll(
        "[data-session-id], .session-block, .SessionBlock"
      );

      originalSessionBlocks.forEach((block) => {
        const sessionElement = block as HTMLElement;
        originalSessionPositions.push({
          element: sessionElement,
          left: sessionElement.style.left,
        });
      });

      // 🆕 시간 헤더 숨김 및 세션 시작 시간보다 앞선 헤더 개수 계산
      const headersHiddenBeforeStartTime = hideTimeHeadersOutsideSessionRange(
        element,
        sessionTimeRange.startTime,
        sessionTimeRange.endTime
      );

      // 🆕 세션셀 위치 조정
      adjustSessionPositions(element, headersHiddenBeforeStartTime);

      // 🆕 시간 헤더 필터링 결과 로깅
      const timeHeaders = extractTimeHeaders(element);

      logger.debug("시간 헤더 필터링 결과", {
        totalHeaders: timeHeaders.length,
        filteredCount: headersHiddenBeforeStartTime,
        remainingHeaders: timeHeaders.length - headersHiddenBeforeStartTime,
        timeRange: {
          first: timeHeaders[0]?.textContent?.trim(),
          last: timeHeaders[timeHeaders.length - 1]?.textContent?.trim(),
        },
      });
    }

    // 캡처 전 스크롤 위치를 0으로 설정하여 전체 내용 캡처
    element.scrollLeft = 0;
    element.scrollTop = 0;

    // 캡처를 위해 요소 스타일 임시 변경 - 전체 내용이 보이도록 설정
    element.style.overflow = "visible";
    element.style.maxWidth = "none";
    element.style.maxHeight = "none";
    element.style.position = "absolute";
    element.style.top = "0";
    element.style.left = "0";
    element.style.zIndex = "9999";

    // 스크롤 위치를 0으로 설정
    element.scrollLeft = 0;
    element.scrollTop = 0;

    // 잠시 대기하여 스타일 변경이 적용되도록 함
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 스타일 변경이 완전히 적용되었는지 확인
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    // 🆕 세션 범위에 맞는 캡처 너비 계산
    let captureWidth = element.scrollWidth;
    if (sessionRange && sessionTimeRange.hasSessions) {
      // 🆕 세션 범위에 맞는 시간 슬롯 계산
      const startMinutes = timeToMinutes(sessionTimeRange.startTime);
      const endMinutes = timeToMinutes(sessionTimeRange.endTime);
      const timeRangeSlots = Math.ceil((endMinutes - startMinutes) / 30); // 30분 단위로 계산
      const timeRangeWidth = timeRangeSlots * 100; // 30분당 100px
      const weekdayHeaderWidth = 80; // 요일 헤더 너비
      captureWidth = weekdayHeaderWidth + timeRangeWidth;

      logger.info("🆕 세션 범위 캡처 너비 계산:", {
        startTime: sessionTimeRange.startTime,
        endTime: sessionTimeRange.endTime,
        timeRangeSlots,
        timeRangeWidth,
        weekdayHeaderWidth,
        captureWidth,
      });
    }

    // html2canvas로 캡처 - 세션 범위에 맞는 너비로 캡처
    const canvas = await html2canvas(element, {
      background: backgroundColor,
      quality: quality, // 🎯 이미지 품질 설정 (2.0 = 인쇄용 고품질, 텍스트와 색상이 매우 선명함)
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: captureWidth,
      height: element.scrollHeight,
      windowWidth: captureWidth,
      windowHeight: element.scrollHeight,
      scale: 1, // 스케일을 1로 설정하여 정확한 크기 캡처
      foreignObjectRendering: false, // 외부 객체 렌더링 비활성화
      removeContainer: false, // 컨테이너 제거하지 않음
      ignoreElements: (element: Element) => {
        // 스크롤바나 불필요한 요소 제외
        return (
          element.classList.contains("scrollbar") ||
          (element as HTMLElement).style.position === "fixed"
        );
      },
    } as Parameters<typeof html2canvas>[1]);

    return canvas;
  } finally {
    // 원본 스크롤 위치 복원
    element.scrollLeft = originalScrollLeft;
    element.scrollTop = originalScrollTop;

    // 원본 요소 스타일 복원
    element.style.overflow = originalOverflow;
    element.style.maxWidth = originalMaxWidth;
    element.style.maxHeight = originalMaxHeight;
    element.style.position = originalPosition;
    element.style.top = originalTop;
    element.style.left = originalLeft;
    element.style.zIndex = originalZIndex;
    element.style.width = originalWidth;
    element.style.clipPath = originalClipPath;
    (
      element.style as CSSStyleDeclaration & { webkitClipPath?: string }
    ).webkitClipPath = originalWebkitClipPath;

    // 원본 스타일 복원
    originalCSSVars.forEach((value, varName) => {
      document.documentElement.style.setProperty(varName, value);
    });

    // 각 요소의 원본 스타일을 직접 복원
    originalStyles.forEach((elementStyles, htmlElement) => {
      elementStyles.forEach((value, property) => {
        if (value !== undefined && value !== null) {
          (htmlElement.style as unknown as Record<string, string>)[property] =
            value;
        }
      });
    });

    // 백업에서도 복원 시도 (이중 안전장치)
    styleBackup.forEach((styles, htmlElement) => {
      Object.entries(styles).forEach(([property, value]) => {
        if (value !== undefined && value !== null) {
          (htmlElement.style as unknown as Record<string, string>)[property] =
            value;
        }
      });
    });

    // 🆕 원본 세션셀 위치 복원
    if (originalSessionPositions) {
      originalSessionPositions.forEach(({ element: sessionElement, left }) => {
        if (left) {
          sessionElement.style.left = left;
        }
      });
    }

    // 🆕 숨겨진 시간 헤더 복원
    restoreHiddenTimeHeaders(element);

    // 추가 안전장치: 지연 복원 (100ms 후 한 번 더 시도)
    setTimeout(() => {
      styleBackup.forEach((styles, htmlElement) => {
        Object.entries(styles).forEach(([property, value]) => {
          if (value !== undefined && value !== null) {
            (htmlElement.style as unknown as Record<string, string>)[property] =
              value;
          }
        });
      });
    }, 100);
  }
}

/**
 * 캔버스를 PDF로 변환하여 다운로드
 */
export function downloadCanvasAsPDF(
  canvas: HTMLCanvasElement,
  options: PDFDownloadOptions = {}
): void {
  const {
    filename = "timetable.pdf",
    format = "a4",
    orientation = "landscape",
  } = options;

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format,
  });

  // A4 가로 크기 (297mm x 210mm)
  const pageWidth = orientation === "landscape" ? 297 : 210;

  // 캔버스 크기
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // PDF 페이지에 맞게 이미지 크기 조정
  const imgWidth = pageWidth;
  const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

  // PDF에 이미지 추가
  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

  // 다운로드
  pdf.save(filename);
}

/**
 * HTML 요소를 PDF로 변환하여 다운로드 (통합 함수)
 *
 * @param element PDF로 변환할 HTML 요소
 * @param options PDF 다운로드 옵션
 * @param captureOptions 캡처 옵션
 * @param captureOptions.sessionRange 세션 범위 기반 캡처 여부
 * @param captureOptions.quality 이미지 품질 (기본값: 2.0 = 인쇄용 고품질)
 */
export async function downloadElementAsPDF(
  element: HTMLElement,
  options: PDFDownloadOptions = {},
  captureOptions: { sessionRange?: boolean } = {}
): Promise<void> {
  try {
    // 1. HTML 요소를 캔버스로 변환
    const canvas = await captureElement(element, {
      quality: 2, // 🎯 인쇄용 고품질 설정 (2.0 = 최고 품질, 텍스트와 색상이 매우 선명함)
      backgroundColor: "#ffffff", // 라이트 테마 배경색
      sessionRange: captureOptions.sessionRange,
    });

    // 2. 캔버스를 PDF로 변환하여 다운로드
    downloadCanvasAsPDF(canvas, options);
  } catch (error) {
    logger.error("PDF 다운로드 중 오류 발생:", undefined, error);
    throw error;
  }
}

/**
 * 시간표 전용 PDF 다운로드 함수
 * 고품질(quality: 2.0) 설정으로 인쇄에 최적화된 PDF 생성
 *
 * @param element 시간표 HTML 요소
 * @param studentName 학생 이름 (파일명 생성용)
 */
export async function downloadTimetableAsPDF(
  element: HTMLElement,
  studentName?: string
): Promise<void> {
  const filename = studentName
    ? `${studentName}_시간표.pdf`
    : "전체_시간표.pdf";

  await downloadElementAsPDF(
    element,
    {
      filename,
      format: "a4",
      orientation: "landscape", // A4 가로
    },
    {
      sessionRange: true, // 🆕 세션 범위 기반 캡처 활성화
    }
  );
}

/**
 * 다크 테마 색상을 라이트 테마에 맞게 조정
 * 원본 색상을 최대한 보존하면서 가독성만 개선
 */
function adjustColorForLightTheme(color: string): string {
  // RGB 색상을 파싱
  const rgbMatch = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);

    // 원본 색상을 최대한 보존 (밝기 조정 제거)
    // 대신 대비를 위해 약간의 조정만 적용
    const adjustedR = Math.min(255, Math.max(0, r));
    const adjustedG = Math.min(255, Math.max(0, g));
    const adjustedB = Math.min(255, Math.max(0, b));

    return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
  }

  // HEX 색상이나 다른 형식의 경우 원본 반환
  return color;
}
