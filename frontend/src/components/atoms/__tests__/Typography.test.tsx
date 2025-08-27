import { render, screen } from '@testing-library/react';
import Typography from '../Typography';

describe('Typography', () => {
  it('기본 텍스트를 렌더링한다', () => {
    render(<Typography variant="body">테스트 텍스트</Typography>);
    expect(screen.getByText('테스트 텍스트')).toBeInTheDocument();
  });

  it('h1 variant를 올바른 HTML 요소로 렌더링한다', () => {
    render(<Typography variant="h1">제목 1</Typography>);
    const heading = screen.getByText('제목 1');
    expect(heading.tagName).toBe('H1');
  });

  it('h2 variant를 올바른 HTML 요소로 렌더링한다', () => {
    render(<Typography variant="h2">제목 2</Typography>);
    const heading = screen.getByText('제목 2');
    expect(heading.tagName).toBe('H2');
  });

  it('body variant를 span 요소로 렌더링한다', () => {
    render(<Typography variant="body">본문 텍스트</Typography>);
    const text = screen.getByText('본문 텍스트');
    expect(text.tagName).toBe('SPAN');
  });

  it('caption variant를 span 요소로 렌더링한다', () => {
    render(<Typography variant="caption">캡션 텍스트</Typography>);
    const text = screen.getByText('캡션 텍스트');
    expect(text.tagName).toBe('SPAN');
  });

  it('color 속성을 올바르게 적용한다', () => {
    const { rerender } = render(
      <Typography variant="body" color="primary">
        주요 텍스트
      </Typography>
    );
    expect(screen.getByText('주요 텍스트').className).toContain('colorPrimary');

    rerender(
      <Typography variant="body" color="success">
        성공 텍스트
      </Typography>
    );
    expect(screen.getByText('성공 텍스트').className).toContain('colorSuccess');
  });

  it('align 속성을 올바르게 적용한다', () => {
    const { rerender } = render(
      <Typography variant="body" align="center">
        중앙 정렬
      </Typography>
    );
    expect(screen.getByText('중앙 정렬').className).toContain('textCenter');

    rerender(
      <Typography variant="body" align="right">
        우측 정렬
      </Typography>
    );
    expect(screen.getByText('우측 정렬').className).toContain('textRight');
  });

  it('weight 속성을 올바르게 적용한다', () => {
    const { rerender } = render(
      <Typography variant="body" weight="bold">
        굵은 텍스트
      </Typography>
    );
    expect(screen.getByText('굵은 텍스트').className).toContain('fontBold');

    rerender(
      <Typography variant="body" weight="semibold">
        세미볼드 텍스트
      </Typography>
    );
    expect(screen.getByText('세미볼드 텍스트').className).toContain(
      'fontSemibold'
    );
  });

  it('transform 속성을 올바르게 적용한다', () => {
    const { rerender } = render(
      <Typography variant="body" transform="uppercase">
        대문자 변환
      </Typography>
    );
    expect(screen.getByText('대문자 변환').className).toContain('uppercase');

    rerender(
      <Typography variant="body" transform="lowercase">
        소문자 변환
      </Typography>
    );
    expect(screen.getByText('소문자 변환').className).toContain('lowercase');
  });

  it('decoration 속성을 올바르게 적용한다', () => {
    const { rerender } = render(
      <Typography variant="body" decoration="underline">
        밑줄 텍스트
      </Typography>
    );
    expect(screen.getByText('밑줄 텍스트').className).toContain('underline');

    rerender(
      <Typography variant="body" decoration="lineThrough">
        취소선 텍스트
      </Typography>
    );
    expect(screen.getByText('취소선 텍스트').className).toContain(
      'lineThrough'
    );
  });

  it('className을 올바르게 적용한다', () => {
    render(
      <Typography variant="body" className="custom-class">
        커스텀 클래스
      </Typography>
    );
    expect(screen.getByText('커스텀 클래스').className).toContain(
      'custom-class'
    );
  });

  it('style 속성을 올바르게 적용한다', () => {
    const customStyle = { fontSize: '18px', color: 'red' };
    render(
      <Typography variant="body" style={customStyle}>
        커스텀 스타일
      </Typography>
    );
    const element = screen.getByText('커스텀 스타일');
    expect(element).toHaveStyle({ fontSize: '18px', color: 'rgb(255, 0, 0)' });
  });

  it('여러 속성을 동시에 적용할 수 있다', () => {
    render(
      <Typography
        variant="h1"
        color="primary"
        align="center"
        weight="bold"
        transform="uppercase"
        decoration="underline"
        className="custom-class"
      >
        복합 스타일 제목
      </Typography>
    );

    const element = screen.getByText('복합 스타일 제목');
    expect(element.tagName).toBe('H1');
    expect(element.className).toContain('colorPrimary');
    expect(element.className).toContain('textCenter');
    expect(element.className).toContain('fontBold');
    expect(element.className).toContain('uppercase');
    expect(element.className).toContain('underline');
    expect(element.className).toContain('custom-class');
  });

  it('transform이 none일 때 transform 클래스를 적용하지 않는다', () => {
    render(
      <Typography variant="body" transform="none">
        변환 없는 텍스트
      </Typography>
    );
    const element = screen.getByText('변환 없는 텍스트');
    expect(element.className).not.toContain('none');
  });

  it('decoration이 none일 때 decoration 클래스를 적용하지 않는다', () => {
    render(
      <Typography variant="body" decoration="none">
        장식 없는 텍스트
      </Typography>
    );
    const element = screen.getByText('장식 없는 텍스트');
    expect(element.className).not.toContain('none');
  });

  it('모든 variant 타입을 올바르게 렌더링한다', () => {
    const variants = [
      'h1',
      'h2',
      'h3',
      'h4',
      'body',
      'bodyLarge',
      'bodySmall',
      'caption',
      'label',
    ];

    variants.forEach(variant => {
      const { unmount } = render(
        <Typography
          variant={
            variant as
              | 'h1'
              | 'h2'
              | 'h3'
              | 'h4'
              | 'h5'
              | 'h6'
              | 'body1'
              | 'body2'
              | 'caption'
              | 'label'
          }
        >
          테스트 {variant}
        </Typography>
      );
      expect(screen.getByText(`테스트 ${variant}`)).toBeInTheDocument();
      unmount();
    });
  });
});
