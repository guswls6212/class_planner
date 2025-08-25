import React from 'react';
import { render, screen } from '@testing-library/react';
import Label from '../Label';

describe('Label', () => {
  it('기본 텍스트를 렌더링한다', () => {
    render(<Label>테스트 라벨</Label>);
    expect(screen.getByText('테스트 라벨')).toBeInTheDocument();
  });

  it('htmlFor 속성을 올바르게 적용한다', () => {
    render(<Label htmlFor="test-input">테스트 라벨</Label>);
    const label = screen.getByText('테스트 라벨');
    expect(label).toHaveAttribute('for', 'test-input');
  });

  it('required 속성이 있을 때 별표를 표시한다', () => {
    render(<Label required>필수 라벨</Label>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('required 속성이 없을 때 별표를 표시하지 않는다', () => {
    render(<Label>일반 라벨</Label>);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('size 속성을 올바르게 적용한다', () => {
    const { rerender } = render(<Label size="small">작은 라벨</Label>);
    expect(screen.getByText('작은 라벨').className).toContain('small');

    rerender(<Label size="large">큰 라벨</Label>);
    expect(screen.getByText('큰 라벨').className).toContain('large');
  });

  it('variant 속성을 올바르게 적용한다', () => {
    const { rerender } = render(
      <Label variant="checkbox">체크박스 라벨</Label>
    );
    expect(screen.getByText('체크박스 라벨').className).toContain('checkbox');

    rerender(<Label variant="inline">인라인 라벨</Label>);
    expect(screen.getByText('인라인 라벨').className).toContain('inline');
  });

  it('disabled 속성을 올바르게 적용한다', () => {
    render(<Label disabled>비활성화된 라벨</Label>);
    expect(screen.getByText('비활성화된 라벨').className).toContain('disabled');
  });

  it('error 상태를 올바르게 적용한다', () => {
    render(<Label error>에러 라벨</Label>);
    expect(screen.getByText('에러 라벨').className).toContain('error');
  });

  it('success 상태를 올바르게 적용한다', () => {
    render(<Label success>성공 라벨</Label>);
    expect(screen.getByText('성공 라벨').className).toContain('success');
  });

  it('warning 상태를 올바르게 적용한다', () => {
    render(<Label warning>경고 라벨</Label>);
    expect(screen.getByText('경고 라벨').className).toContain('warning');
  });

  it('helpText를 표시한다', () => {
    render(<Label helpText="도움말 텍스트">라벨</Label>);
    expect(screen.getByText('도움말 텍스트')).toBeInTheDocument();
  });

  it('group variant일 때 labelGroup 클래스를 적용한다', () => {
    render(<Label variant="group">그룹 라벨</Label>);
    const wrapper = screen.getByText('그룹 라벨').closest('div');
    expect(wrapper?.className).toContain('labelGroup');
  });

  it('여러 상태를 동시에 적용할 수 있다', () => {
    render(
      <Label error disabled required size="large" variant="checkbox">
        복합 상태 라벨
      </Label>
    );

    const label = screen.getByText('복합 상태 라벨');
    expect(label.className).toContain('error');
    expect(label.className).toContain('disabled');
    expect(label.className).toContain('large');
    expect(label.className).toContain('checkbox');
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
