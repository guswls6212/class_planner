import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('API 함수 구조', () => {
  const apiDir = path.join(process.cwd(), 'api');

  it('api 디렉토리가 존재해야 함', () => {
    expect(fs.existsSync(apiDir)).toBe(true);
  });

  it('students API 함수들이 존재해야 함', () => {
    const studentsApiDir = path.join(apiDir, 'students');
    expect(fs.existsSync(studentsApiDir)).toBe(true);

    const expectedFiles = ['add.ts', 'list.ts', 'delete.ts'];
    expectedFiles.forEach(file => {
      const filePath = path.join(studentsApiDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('API 함수들이 TypeScript로 작성되어야 함', () => {
    const studentsApiDir = path.join(apiDir, 'students');
    const files = ['add.ts', 'list.ts', 'delete.ts'];

    files.forEach(file => {
      const filePath = path.join(studentsApiDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // TypeScript 타입 정의가 포함되어 있는지 확인
      expect(content).toContain('import type');
      expect(content).toContain('export default async function handler');
    });
  });

  it('API 함수들이 올바른 CORS 헤더를 설정해야 함', () => {
    const studentsApiDir = path.join(apiDir, 'students');
    const files = ['add.ts', 'list.ts', 'delete.ts'];

    files.forEach(file => {
      const filePath = path.join(studentsApiDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('Access-Control-Allow-Origin');
      expect(content).toContain('Access-Control-Allow-Methods');
      expect(content).toContain('Access-Control-Allow-Headers');
    });
  });

  it('API 함수들이 Supabase 클라이언트를 사용해야 함', () => {
    const studentsApiDir = path.join(apiDir, 'students');
    const files = ['add.ts', 'list.ts', 'delete.ts'];

    files.forEach(file => {
      const filePath = path.join(studentsApiDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('@supabase/supabase-js');
      expect(content).toContain('createClient');
    });
  });
});
