-- Migration: 011_disable_user_data_rls_temporarily
-- Description: user_data 테이블의 RLS를 일시적으로 비활성화하여 406 오류 해결
-- Date: 2025-01-08
-- Status: completed

-- user_data 테이블의 RLS를 일시적으로 비활성화
-- 406 오류 해결을 위한 임시 조치

-- RLS 비활성화
ALTER TABLE user_data DISABLE ROW LEVEL SECURITY;

-- Migration 로그 기록
INSERT INTO migration_log (migration_name, description, status)
VALUES (
  '011_disable_user_data_rls_temporarily',
  'user_data 테이블의 RLS를 일시적으로 비활성화하여 406 오류 해결',
  'completed'
)
ON CONFLICT (migration_name) DO NOTHING;
