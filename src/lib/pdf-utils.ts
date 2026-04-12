import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { logger } from "./logger";
import { timeToMinutes, minutesToTime } from "./planner";

declare global {
  interface Window {
    __pdfCaptureState?: {
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    };
    __pdfDebugInfo?: Record<string, unknown>;
    __canvasDebugInfo?: Record<string, unknown>;
    __debugCanvasImage?: string;
  }
}

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

    // 🆕 캡처 전 상태 저장 (디버깅용)
    const beforeCaptureState = {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      computedStyle: {
        overflow: getComputedStyle(element).overflow,
        maxWidth: getComputedStyle(element).maxWidth,
        maxHeight: getComputedStyle(element).maxHeight,
        position: getComputedStyle(element).position,
      },
    };

    // 캡처를 위해 요소 스타일 임시 변경 - 전체 내용이 보이도록 설정
    element.style.overflow = "visible";
    element.style.maxWidth = "none";
    element.style.maxHeight = "none";
    element.style.height = "auto"; // 🆕 높이를 auto로 설정하여 전체 내용 포함
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

    // 🆕 캡처 후 상태 저장 (디버깅용)
    const afterCaptureState = {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
    };

    // 🆕 window 객체에 상태 정보 노출 (개발 환경 전용)
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      window.__pdfCaptureState = {
        before: beforeCaptureState,
        after: afterCaptureState,
      };
      console.log("📊 PDF 캡처 전후 상태:", window.__pdfCaptureState);
    }

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

    // 🆕 모든 요일(월~일)을 포함하도록 높이 계산
    // maxHeight 제한을 제거했으므로 scrollHeight가 전체 높이를 반환해야 함
    // 스타일 변경 후 리플로우를 강제로 트리거하여 정확한 scrollHeight 얻기
    void element.offsetHeight; // 리플로우 트리거

    // 🆕 모든 요일과 모든 세션셀을 포함하도록 높이 계산
    // 그리드의 실제 구조를 기반으로 정확한 높이 계산
    const actualScrollHeight = element.scrollHeight;
    const actualOffsetHeight = element.offsetHeight;
    const actualClientHeight = element.clientHeight;

    // 🆕 그리드의 gridTemplateRows를 기반으로 높이 계산
    // 시간 헤더(40px) + 각 요일 행 높이의 합계
    const timeHeaderHeight = 40;
    let totalWeekdayHeight = 0;

    // 요일 라벨들을 찾아서 각 요일 행의 높이 계산
    // TimeTableRow에서 요일 라벨은 position: sticky, left: 0, gridColumn: "1"로 설정됨
    const weekdayTexts = ["월", "화", "수", "목", "금", "토", "일"];
    const weekdayHeights: number[] = [];
    const foundWeekdays: string[] = [];

    // 방법 1: position: sticky이고 left: 0인 요소 중에서 요일 텍스트를 포함하는 요소 찾기
    const stickyElements = element.querySelectorAll(
      '[style*="position"][style*="sticky"], [style*="position: sticky"]'
    );
    
    stickyElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlEl);
      const textContent = htmlEl.textContent?.trim();
      
      // position: sticky이고 left가 0인 요소 확인
      if (
        computedStyle.position === "sticky" &&
        (computedStyle.left === "0px" || computedStyle.left === "0") &&
        textContent &&
        weekdayTexts.includes(textContent)
      ) {
        if (!foundWeekdays.includes(textContent)) {
          foundWeekdays.push(textContent);
          const labelHeight = htmlEl.offsetHeight || htmlEl.getBoundingClientRect().height;
          if (labelHeight > 0) {
            weekdayHeights.push(labelHeight);
            totalWeekdayHeight += labelHeight;
          }
        }
      }
    });

    // 방법 2: 위 방법으로 찾지 못한 경우, 직접 텍스트로 찾기
    if (foundWeekdays.length === 0) {
      weekdayTexts.forEach((text) => {
        const allElements = element.querySelectorAll("*");
        allElements.forEach((el) => {
          if (el.textContent?.trim() === text) {
            const htmlEl = el as HTMLElement;
            const computedStyle = window.getComputedStyle(htmlEl);
            // position: sticky이고 left가 0인 요소 확인
            if (
              computedStyle.position === "sticky" &&
              (computedStyle.left === "0px" || computedStyle.left === "0")
            ) {
              if (!foundWeekdays.includes(text)) {
                foundWeekdays.push(text);
                const labelHeight = htmlEl.offsetHeight || htmlEl.getBoundingClientRect().height;
                if (labelHeight > 0) {
                  weekdayHeights.push(labelHeight);
                  totalWeekdayHeight += labelHeight;
                }
              }
            }
          }
        });
      });
    }

    // 🆕 세션셀들의 최대 하단 위치도 확인
    const sessionBlocks = element.querySelectorAll(
      "[data-session-id], .session-block, .SessionBlock"
    );
    let maxSessionBottom = 0;

    sessionBlocks.forEach((block) => {
      const blockElement = block as HTMLElement;
      const rect = blockElement.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeBottom = rect.bottom - elementRect.top;
      if (relativeBottom > maxSessionBottom) {
        maxSessionBottom = relativeBottom;
      }
    });

    // 최종 높이 = 시간 헤더 + 요일 높이 합계 또는 세션셀 최대 하단 위치 중 더 큰 값
    // 가상 스크롤바 높이(12px)는 제외하므로 계산에 포함하지 않음
    const calculatedHeight = Math.max(
      actualScrollHeight,
      timeHeaderHeight + totalWeekdayHeight,
      timeHeaderHeight + maxSessionBottom + 20 // 20px 여유 추가
    );

    // 🆕 계산된 높이를 요소에 명시적으로 설정하여 html2canvas가 전체 높이를 캡처하도록 함
    element.style.height = `${calculatedHeight}px`;

    // 🆕 브라우저 콘솔에서 확인할 수 있도록 window 객체에 디버깅 정보 노출
    if (typeof window !== "undefined") {
      window.__pdfDebugInfo = {
        scrollHeight: actualScrollHeight,
        offsetHeight: actualOffsetHeight,
        clientHeight: actualClientHeight,
        timeHeaderHeight,
        totalWeekdayHeight,
        weekdayHeights,
        maxSessionBottom,
        calculatedHeight,
        foundWeekdays: foundWeekdays.length,
        foundWeekdayTexts: foundWeekdays,
        sessionBlocksCount: sessionBlocks.length,
        elementRect: element.getBoundingClientRect(),
      };
      console.log(
        "📊 PDF 높이 계산 디버깅 정보:",
        window.__pdfDebugInfo
      );
    }

    logger.info("🆕 모든 요일 및 세션셀 포함 높이 계산:", {
      scrollHeight: actualScrollHeight,
      offsetHeight: actualOffsetHeight,
      clientHeight: actualClientHeight,
      timeHeaderHeight,
      totalWeekdayHeight,
      weekdayHeights,
      maxSessionBottom,
      calculatedHeight,
      foundWeekdays: foundWeekdays.length,
      foundWeekdayTexts: foundWeekdays,
      sessionBlocksCount: sessionBlocks.length,
      note: "그리드 구조 기반 높이 계산, 모든 요일(월~일) 및 세션셀 포함",
    });

    // 🆕 전체시간표(9)와 동일한 방식으로 캡처
    // 계산된 높이를 명시적으로 전달하여 모든 세션셀과 요일(토/일 포함)이 포함되도록 함
    const canvas = await html2canvas(element, {
      background: backgroundColor,
      quality: quality, // 🎯 이미지 품질 설정 (2.0 = 인쇄용 고품질, 텍스트와 색상이 매우 선명함)
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: captureWidth,
      height: calculatedHeight, // 🆕 계산된 높이를 명시적으로 전달하여 모든 세션셀 포함 보장
      scale: 1, // 🆕 scale을 1로 설정 (전체시간표(9)와 동일한 선명도)
      foreignObjectRendering: false, // 외부 객체 렌더링 비활성화
      removeContainer: false, // 컨테이너 제거하지 않음
      ignoreElements: (element: Element) => {
        // 스크롤바나 불필요한 요소 제외
        return (
          element.classList.contains("scrollbar") ||
          element.classList.contains("virtual-scrollbar-container") || // 🆕 가상 스크롤바 제외
          (element as HTMLElement).style.position === "fixed"
        );
      },
    } as Parameters<typeof html2canvas>[1]);

    // 🆕 캔버스 크기 확인 및 자동 디버깅 정보 저장
    if (typeof window !== "undefined") {
      // 🆕 세션셀 위치 정보 수집 (디버깅용)
      const sessionPositions: Array<{
        id: string;
        weekday: string;
        top: number;
        bottom: number;
        height: number;
        relativeBottom: number;
      }> = [];

      sessionBlocks.forEach((block) => {
        const blockElement = block as HTMLElement;
        const rect = blockElement.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = rect.top - elementRect.top;
        const relativeBottom = rect.bottom - elementRect.top;

        // 요일 정보 찾기
        let weekday = "알 수 없음";
        const parentRow = blockElement.closest(".time-table-row");
        if (parentRow) {
          const weekdayLabel = parentRow.querySelector(
            '[style*="position"][style*="sticky"]'
          );
          if (weekdayLabel) {
            weekday = weekdayLabel.textContent?.trim() || "알 수 없음";
          }
        }

        sessionPositions.push({
          id: blockElement.getAttribute("data-session-id") || "unknown",
          weekday,
          top: relativeTop,
          bottom: relativeBottom,
          height: rect.height,
          relativeBottom,
        });
      });

      const debugInfo = {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        expectedWidth: captureWidth,
        expectedHeight: calculatedHeight,
        scale: 1,
        elementScrollHeight: element.scrollHeight,
        elementOffsetHeight: element.offsetHeight,
        elementClientHeight: element.clientHeight,
        elementRect: {
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
          top: element.getBoundingClientRect().top,
          left: element.getBoundingClientRect().left,
        },
        sessionPositions,
        maxSessionBottom,
        totalWeekdayHeight,
        weekdayHeights,
      };

      console.log("📊 캔버스 크기:", debugInfo);
      console.log("📊 세션셀 위치 정보:", sessionPositions);
      window.__canvasDebugInfo = debugInfo;

      // 🆕 자동으로 캔버스를 이미지로 저장 (디버깅용)
      // 개발 환경에서만 자동 저장
      if (process.env.NODE_ENV === "development") {
        try {
          const canvasDataUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.download = `pdf-debug-${Date.now()}.png`;
          link.href = canvasDataUrl;
          // 자동 다운로드는 사용자 경험을 해칠 수 있으므로 주석 처리
          // link.click();
          console.log(
            "📸 디버깅용 캔버스 이미지 준비됨 (자동 다운로드 비활성화)"
          );
          window.__debugCanvasImage = canvasDataUrl;
        } catch (error) {
          console.warn("캔버스 이미지 저장 실패:", error);
        }
      }
    }

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
    logger.error("PDF 다운로드 중 오류 발생:", undefined, error as Error);
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
