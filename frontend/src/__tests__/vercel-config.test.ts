import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Vercel 배포 설정', () => {
  it('vercel.json 파일이 존재해야 함', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    expect(fs.existsSync(vercelConfigPath)).toBe(true);
  });

  it('vercel.json이 올바른 구조를 가져야 함', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    expect(config).toHaveProperty('version');
    expect(config.version).toBe(2);
    expect(config).toHaveProperty('routes');
    expect(Array.isArray(config.routes)).toBe(true);

    // API 라우트가 올바르게 설정되어 있는지 확인
    const apiRoute = config.routes.find(
      (route: { src: string; dest: string }) => route.src === '/api/(.*)'
    );
    expect(apiRoute).toBeDefined();
    expect(apiRoute.dest).toBe('/api/$1');
  });

  it('vercel.json에 builds 섹션이 없어야 함 (Vite + API 조합에서는 불필요)', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    expect(config.builds).toBeUndefined();
  });

  it('vercel.json에 functions 섹션이 없어야 함 (자동 감지 사용)', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    expect(config.functions).toBeUndefined();
  });
});
