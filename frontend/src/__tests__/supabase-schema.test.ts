import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Supabase 스키마', () => {
  it('간소화된 스키마 파일이 존재해야 함', () => {
    const schemaPath = path.join(process.cwd(), 'supabase-schema-simple.sql');
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  it('스키마가 올바른 테이블 구조를 가져야 함', () => {
    const schemaPath = path.join(process.cwd(), 'supabase-schema-simple.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // user_data 테이블이 정의되어 있는지 확인
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS user_data');
    expect(schema).toContain('user_id TEXT NOT NULL');
    expect(schema).toContain('data JSONB NOT NULL DEFAULT');
  });

  it('스키마가 인증 없이 작동하도록 설정되어야 함', () => {
    const schemaPath = path.join(process.cwd(), 'supabase-schema-simple.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Row Level Security가 비활성화되어 있는지 확인
    expect(schema).toContain('DISABLE ROW LEVEL SECURITY');

    // users 테이블이 없는지 확인 (인증 없이 작동)
    expect(schema).not.toContain('CREATE TABLE IF NOT EXISTS users');
  });

  it('스키마가 JSONB 인덱스를 포함해야 함', () => {
    const schemaPath = path.join(process.cwd(), 'supabase-schema-simple.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_user_data_gin');
    expect(schema).toContain('USING GIN (data)');
  });

  it('스키마가 업데이트 트리거를 포함해야 함', () => {
    const schemaPath = path.join(process.cwd(), 'supabase-schema-simple.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(schema).toContain(
      'CREATE OR REPLACE FUNCTION update_updated_at_column'
    );
    expect(schema).toContain('CREATE TRIGGER update_user_data_updated_at');
  });
});
