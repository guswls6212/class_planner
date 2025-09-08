import { existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('자동화 테스트 시스템', () => {
  it('자동화 테스트 스크립트가 존재해야 함', () => {
    // automation/auto-fix-test.js 파일이 존재하는지 확인
    const autoFixTestPath = join(
      process.cwd(),
      'automation',
      'auto-fix-test.js',
    );
    expect(existsSync(autoFixTestPath)).toBe(true);
  });

  it('결과 분석 스크립트가 존재해야 함', () => {
    // automation/analyze-results.js 파일이 존재하는지 확인
    const analyzeResultsPath = join(
      process.cwd(),
      'automation',
      'analyze-results.js',
    );
    expect(existsSync(analyzeResultsPath)).toBe(true);
  });

  it('test-results 폴더가 존재해야 함', () => {
    // automation/test-results 폴더가 존재하는지 확인
    const testResultsPath = join(process.cwd(), 'automation', 'test-results');
    expect(existsSync(testResultsPath)).toBe(true);
  });
});
