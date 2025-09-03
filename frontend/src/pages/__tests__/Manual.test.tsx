import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ManualPage from '../Manual';

describe('ManualPage', () => {
  it('사용자 매뉴얼 페이지가 올바르게 렌더링된다', () => {
    render(<ManualPage />);

    // 제목 확인
    expect(
      screen.getByText('📚 클래스 플래너 사용자 매뉴얼')
    ).toBeInTheDocument();

    // 주요 섹션들 확인
    expect(screen.getByText('🎯 개요')).toBeInTheDocument();
    expect(screen.getByText('🚀 주요 기능')).toBeInTheDocument();
    expect(screen.getByText('📖 상세 사용법')).toBeInTheDocument();
    expect(screen.getByText('🎨 인터페이스 구성')).toBeInTheDocument();
    expect(screen.getByText('🔧 고급 기능')).toBeInTheDocument();
    expect(screen.getByText('🚨 주의사항')).toBeInTheDocument();
    expect(screen.getByText('🆘 문제 해결')).toBeInTheDocument();
  });

  it('주요 기능 설명이 포함되어 있다', () => {
    render(<ManualPage />);

    // 주요 기능들 확인
    expect(screen.getByText('1. 학생 관리')).toBeInTheDocument();
    expect(screen.getByText('2. 수업 일정 관리')).toBeInTheDocument();
    expect(screen.getByText('3. 직관적인 인터페이스')).toBeInTheDocument();
  });

  it('사용법 설명이 포함되어 있다', () => {
    render(<ManualPage />);

    // 사용법들 확인
    expect(screen.getByText('학생 추가하기')).toBeInTheDocument();
    expect(screen.getByText('과목 추가하기')).toBeInTheDocument();
    expect(screen.getByText('수업 추가하기')).toBeInTheDocument();
    expect(screen.getByText('그룹 수업 만들기')).toBeInTheDocument();
    expect(screen.getByText('수업 편집하기')).toBeInTheDocument();
    expect(screen.getAllByText('시간표 다운로드')[0]).toBeInTheDocument();
  });

  it('문제 해결 섹션이 포함되어 있다', () => {
    render(<ManualPage />);

    // 문제 해결 항목들 확인
    expect(screen.getByText('수업이 추가되지 않는 경우')).toBeInTheDocument();
    expect(
      screen.getByText('드래그 앤 드롭이 작동하지 않는 경우')
    ).toBeInTheDocument();
    expect(screen.getByText('시간표가 표시되지 않는 경우')).toBeInTheDocument();
  });

  it('지원 브라우저 정보가 포함되어 있다', () => {
    render(<ManualPage />);

    // 지원 브라우저들 확인
    expect(screen.getByText('Chrome (권장)')).toBeInTheDocument();
    expect(screen.getByText('Firefox')).toBeInTheDocument();
    expect(screen.getByText('Safari')).toBeInTheDocument();
    expect(screen.getByText('Edge')).toBeInTheDocument();
  });
});
