import { existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('Migration 시스템', () => {
  it('Migration 파일들이 존재해야 함', () => {
    const migrationFiles = [
      '002_user_management_tables.sql',
      '003_integrate_legacy_schema.sql',
      '005_convert_timestamps_to_kst.sql',
      '006_fix_korean_timezone_conversion.sql',
      '007_cleanup_and_fix_timezone.sql',
      '008_correct_korean_timezone.sql',
      '009_safe_korean_timezone.sql',
    ];

    migrationFiles.forEach(file => {
      const filePath = join(process.cwd(), 'migration', 'migrations', file);
      expect(existsSync(filePath)).toBe(true);
    });
  });

  it('Migration 실행 스크립트가 존재해야 함', () => {
    const scriptPath = join(process.cwd(), 'migration', 'run-migration.sh');
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('Migration 상태 확인 스크립트가 존재해야 함', () => {
    const scriptPath = join(
      process.cwd(),
      'migration',
      'check-migration-status.sh',
    );
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('Migration 가이드 문서가 존재해야 함', () => {
    const guidePath = join(process.cwd(), 'migration', 'MIGRATION_GUIDE.md');
    expect(existsSync(guidePath)).toBe(true);
  });

  it('한국 시간대 변환 Migration이 포함되어야 함', () => {
    const kstMigrationPath = join(
      process.cwd(),
      'migration',
      'migrations',
      '009_safe_korean_timezone.sql',
    );
    expect(existsSync(kstMigrationPath)).toBe(true);
  });
});
