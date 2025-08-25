import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Card from '../Card';

describe('Card', () => {
  it('기본적으로 렌더링된다', () => {
    render(<Card>카드 내용</Card>);
    expect(screen.getByText('카드 내용')).toBeInTheDocument();
  });

  it('title이 있을 때 제목을 표시한다', () => {
    render(<Card title="테스트 제목">카드 내용</Card>);
    expect(screen.getByText('테스트 제목')).toBeInTheDocument();
  });

  it('title이 없을 때 제목을 표시하지 않는다', () => {
    render(<Card>카드 내용</Card>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('variant 속성을 올바르게 적용한다', () => {
    const { rerender } = render(<Card variant="default">기본 카드</Card>);
    let card = screen.getByText('기본 카드').closest('div');
    expect(card).toHaveStyle({
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    });

    rerender(<Card variant="elevated">들어올린 카드</Card>);
    card = screen.getByText('들어올린 카드').closest('div');
    expect(card).toHaveStyle({
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      boxShadow:
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    });

    rerender(<Card variant="outlined">테두리 카드</Card>);
    card = screen.getByText('테두리 카드').closest('div');

    // 대안 검증 방식
    expect(card?.style.backgroundColor).toBe('transparent');
    expect(card?.style.border).toBe('2px solid rgb(229, 231, 235)');
  });

  it('padding 속성을 올바르게 적용한다', () => {
    const { rerender } = render(<Card padding="small">작은 패딩</Card>);
    let card = screen.getByText('작은 패딩').closest('div');
    expect(card).toHaveStyle({ padding: '12px' });

    rerender(<Card padding="medium">중간 패딩</Card>);
    card = screen.getByText('중간 패딩').closest('div');
    expect(card).toHaveStyle({ padding: '16px' });

    rerender(<Card padding="large">큰 패딩</Card>);
    card = screen.getByText('큰 패딩').closest('div');
    expect(card).toHaveStyle({ padding: '24px' });
  });

  it('onClick이 있을 때 클릭 가능한 스타일을 적용한다', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>클릭 가능한 카드</Card>);

    const card = screen.getByText('클릭 가능한 카드').closest('div');
    expect(card).toHaveStyle({ cursor: 'pointer' });
  });

  it('onClick이 없을 때 기본 커서를 적용한다', () => {
    render(<Card>클릭 불가능한 카드</Card>);

    const card = screen.getByText('클릭 불가능한 카드').closest('div');
    expect(card).toHaveStyle({ cursor: 'default' });
  });

  it('클릭 시 onClick 함수를 호출한다', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>클릭 가능한 카드</Card>);

    const card = screen.getByText('클릭 가능한 카드').closest('div');
    fireEvent.click(card!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('className을 올바르게 적용한다', () => {
    render(<Card className="custom-card">커스텀 클래스</Card>);

    const card = screen.getByText('커스텀 클래스').closest('div');
    expect(card).toHaveClass('custom-card');
  });

  it('style 속성을 올바르게 적용한다', () => {
    const customStyle = { backgroundColor: 'red', fontSize: '18px' };
    render(<Card style={customStyle}>커스텀 스타일</Card>);

    const card = screen.getByText('커스텀 스타일').closest('div');
    expect(card).toHaveStyle({
      backgroundColor: 'rgb(255, 0, 0)',
      fontSize: '18px',
    });
  });

  it('기본 스타일이 올바르게 적용된다', () => {
    render(<Card>기본 스타일</Card>);

    const card = screen.getByText('기본 스타일').closest('div');
    expect(card).toHaveStyle({
      borderRadius: '8px',
      transition: 'all 0.2s ease',
    });
  });

  it('여러 속성을 동시에 적용할 수 있다', () => {
    render(
      <Card
        title="복합 카드"
        variant="elevated"
        padding="large"
        className="custom-class"
        onClick={vi.fn()}
      >
        복합 속성 카드
      </Card>
    );

    expect(screen.getByText('복합 카드')).toBeInTheDocument();
    expect(screen.getByText('복합 속성 카드')).toBeInTheDocument();

    const card = screen.getByText('복합 속성 카드').closest('div');
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveStyle({
      padding: '24px',
      cursor: 'pointer',
    });
  });

  it('hover 효과가 올바르게 적용된다', () => {
    const handleClick = vi.fn();
    render(
      <Card variant="elevated" onClick={handleClick}>
        호버 카드
      </Card>
    );

    const card = screen.getByText('호버 카드').closest('div');

    // mouseEnter 이벤트
    fireEvent.mouseEnter(card!);
    expect(card).toHaveStyle({
      transform: 'translateY(-2px)',
      boxShadow:
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    });

    // mouseLeave 이벤트
    fireEvent.mouseLeave(card!);
    expect(card).toHaveStyle({
      transform: '',
      boxShadow:
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    });
  });

  it('onClick이 없을 때 hover 효과를 적용하지 않는다', () => {
    render(<Card variant="elevated">호버 불가 카드</Card>);

    const card = screen.getByText('호버 불가 카드').closest('div');

    fireEvent.mouseEnter(card!);
    expect(card).not.toHaveStyle({ transform: 'translateY(-2px)' });
  });
});
