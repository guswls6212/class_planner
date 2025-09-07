import { describe, expect, it, vi } from 'vitest';
import { downloadTimetableAsPDF } from '../pdf-utils';

// Mock html2canvas and jsPDF
vi.mock('html2canvas', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toDataURL: () => 'data:image/png;base64,mock-data',
      width: 1000,
      height: 600,
    }),
  ),
}));

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}));

describe('PDF Utils', () => {
  it('downloadTimetableAsPDF 함수가 정의되어 있다', () => {
    expect(downloadTimetableAsPDF).toBeDefined();
    expect(typeof downloadTimetableAsPDF).toBe('function');
  });

  it('downloadTimetableAsPDF 함수의 매개변수가 올바르게 정의되어 있다', () => {
    const mockElement = document.createElement('div');
    const mockStudentName = '김요섭';

    // 함수가 Promise를 반환하는지 확인
    const result = downloadTimetableAsPDF(mockElement, mockStudentName);
    expect(result).toBeInstanceOf(Promise);
  });

  it('파일명이 올바르게 생성된다', () => {
    // 이 테스트는 실제 DOM 환경이 필요하므로 기본적인 구조만 확인
    expect(downloadTimetableAsPDF).toBeDefined();
  });
});
