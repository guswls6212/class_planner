import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * HTML 요소를 PDF로 변환하여 다운로드하는 유틸리티 함수들
 */

export interface PDFDownloadOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  quality?: number;
}

/**
 * HTML 요소를 라이트 테마로 강제 변환하여 캔버스로 변환
 * 세션 셀의 스타일을 보존하여 가독성 향상
 * 안전한 스타일 복원을 위한 추가 보장 장치 포함
 */
export async function captureElement(
  element: HTMLElement,
  options: { quality?: number; backgroundColor?: string } = {}
): Promise<HTMLCanvasElement> {
  const { backgroundColor = '#ffffff' } = options;

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

  try {
    // 라이트 테마 CSS 변수들로 강제 변경
    const lightThemeVars = {
      '--color-background': '#ffffff',
      '--color-text': '#1f2937',
      '--color-text-secondary': '#6b7280',
      '--color-border': '#d1d5db',
      '--color-border-grid': '#e5e7eb',
      '--color-border-grid-light': '#f3f4f6',
      '--color-primary': '#3b82f6',
      '--color-secondary': '#6b7280',
      '--color-danger': '#ef4444',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
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
    const elementsToStyle = element.querySelectorAll('*');
    elementsToStyle.forEach(el => {
      const computedStyle = getComputedStyle(el);
      const style = (el as HTMLElement).style;

      // 세션 블록인지 확인 (data-session-id 속성이나 특정 클래스로 판단)
      const isSessionBlock =
        el.hasAttribute('data-session-id') ||
        el.className.includes('session-block') ||
        el.className.includes('SessionBlock');

      if (isSessionBlock) {
        // 세션 블록의 경우 배경색과 테두리를 보존하되 라이트 테마에 맞게 조정
        const currentBgColor = computedStyle.backgroundColor;

        // 이 요소의 원본 스타일을 저장할 Map 생성
        if (!originalStyles.has(el as HTMLElement)) {
          originalStyles.set(el as HTMLElement, new Map());
        }
        const elementStyles = originalStyles.get(el as HTMLElement)!;

        if (currentBgColor && currentBgColor !== 'rgba(0, 0, 0, 0)') {
          // 원본 색상을 보존하되 밝기 조정
          elementStyles.set('backgroundColor', style.backgroundColor);

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
        if (!computedStyle.border || computedStyle.border === 'none') {
          elementStyles.set('border', style.border);

          // 백업에도 저장
          if (!styleBackup.has(el as HTMLElement)) {
            styleBackup.set(el as HTMLElement, {});
          }
          styleBackup.get(el as HTMLElement)!.border = style.border;

          style.border = '1px solid #d1d5db';
        }

        // 텍스트 색상을 어두운 색으로 설정하여 가독성 향상
        elementStyles.set('color', style.color);

        // 백업에도 저장
        if (!styleBackup.has(el as HTMLElement)) {
          styleBackup.set(el as HTMLElement, {});
        }
        styleBackup.get(el as HTMLElement)!.color = style.color;

        style.color = '#1f2937';

        // 시간 정보를 더 명확하게 표시하기 위한 스타일 추가
        elementStyles.set('fontWeight', style.fontWeight);

        // 백업에도 저장
        if (!styleBackup.has(el as HTMLElement)) {
          styleBackup.set(el as HTMLElement, {});
        }
        styleBackup.get(el as HTMLElement)!.fontWeight = style.fontWeight;

        style.fontWeight = '600';
      } else {
        // 일반 요소의 경우 기존 로직 적용
        if (
          computedStyle.backgroundColor &&
          computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ) {
          // 이 요소의 원본 스타일을 저장할 Map 생성
          if (!originalStyles.has(el as HTMLElement)) {
            originalStyles.set(el as HTMLElement, new Map());
          }
          const elementStyles = originalStyles.get(el as HTMLElement)!;

          elementStyles.set('backgroundColor', style.backgroundColor);

          // 백업에도 저장
          if (!styleBackup.has(el as HTMLElement)) {
            styleBackup.set(el as HTMLElement, {});
          }
          styleBackup.get(el as HTMLElement)!.backgroundColor =
            style.backgroundColor;

          style.backgroundColor = '#ffffff';
        }

        if (computedStyle.color && computedStyle.color !== 'rgba(0, 0, 0, 0)') {
          // 이 요소의 원본 스타일을 저장할 Map 생성
          if (!originalStyles.has(el as HTMLElement)) {
            originalStyles.set(el as HTMLElement, new Map());
          }
          const elementStyles = originalStyles.get(el as HTMLElement)!;

          elementStyles.set('color', style.color);

          // 백업에도 저장
          if (!styleBackup.has(el as HTMLElement)) {
            styleBackup.set(el as HTMLElement, {});
          }
          styleBackup.get(el as HTMLElement)!.color = style.color;

          style.color = '#1f2937';
        }
      }
    });

    // 캡처 전 스크롤 위치를 0으로 설정하여 전체 내용 캡처
    element.scrollLeft = 0;
    element.scrollTop = 0;

    // 캡처를 위해 요소 스타일 임시 변경 - 전체 내용이 보이도록 설정
    element.style.overflow = 'visible';
    element.style.maxWidth = 'none';
    element.style.maxHeight = 'none';
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.left = '0';
    element.style.zIndex = '9999';

    // 스크롤 위치를 0으로 설정
    element.scrollLeft = 0;
    element.scrollTop = 0;

    // 잠시 대기하여 스타일 변경이 적용되도록 함
    await new Promise(resolve => setTimeout(resolve, 300));

    // 스타일 변경이 완전히 적용되었는지 확인
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    // html2canvas로 캡처 - 전체 내용을 캡처하기 위해 스크롤 위치 고려
    const canvas = await html2canvas(element, {
      background: backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth, // 전체 너비 사용
      windowHeight: element.scrollHeight, // 전체 높이 사용
      scale: 1, // 스케일을 1로 설정하여 정확한 크기 캡처
      foreignObjectRendering: false, // 외부 객체 렌더링 비활성화
      removeContainer: false, // 컨테이너 제거하지 않음
      ignoreElements: (element: Element) => {
        // 스크롤바나 불필요한 요소 제외
        return (
          element.classList.contains('scrollbar') ||
          (element as HTMLElement).style.position === 'fixed'
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
    filename = 'timetable.pdf',
    format = 'a4',
    orientation = 'landscape',
  } = options;

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  // A4 가로 크기 (297mm x 210mm)
  const pageWidth = orientation === 'landscape' ? 297 : 210;

  // 캔버스 크기
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // PDF 페이지에 맞게 이미지 크기 조정
  const imgWidth = pageWidth;
  const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

  // PDF에 이미지 추가
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

  // 다운로드
  pdf.save(filename);
}

/**
 * HTML 요소를 PDF로 변환하여 다운로드 (통합 함수)
 */
export async function downloadElementAsPDF(
  element: HTMLElement,
  options: PDFDownloadOptions = {}
): Promise<void> {
  try {
    // 1. HTML 요소를 캔버스로 변환
    const canvas = await captureElement(element, {
      quality: 2,
      backgroundColor: '#ffffff', // 라이트 테마 배경색
    });

    // 2. 캔버스를 PDF로 변환하여 다운로드
    downloadCanvasAsPDF(canvas, options);
  } catch (error) {
    console.error('PDF 다운로드 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 시간표 전용 PDF 다운로드 함수
 */
export async function downloadTimetableAsPDF(
  element: HTMLElement,
  studentName?: string
): Promise<void> {
  const filename = studentName
    ? `${studentName}_시간표.pdf`
    : '전체_시간표.pdf';

  await downloadElementAsPDF(element, {
    filename,
    format: 'a4',
    orientation: 'landscape', // A4 가로
  });
}

/**
 * 다크 테마 색상을 라이트 테마에 맞게 조정
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

    // 색상을 더 밝고 선명하게 조정
    const adjustedR = Math.min(255, r + 40);
    const adjustedG = Math.min(255, g + 40);
    const adjustedB = Math.min(255, b + 40);

    return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
  }

  // HEX 색상이나 다른 형식의 경우 기본값 반환
  return color;
}
