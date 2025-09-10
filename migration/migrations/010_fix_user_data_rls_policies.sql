-- Migration: 010_fix_user_data_rls_policies
-- Description: user_data 테이블에 대한 RLS 정책 생성 - 인증된 사용자는 자신의 데이터만 접근 가능
-- Date: 2025-01-08
-- Status: completed

-- user_data 테이블에 대한 RLS 정책 생성
-- 인증된 사용자는 자신의 데이터만 조회/수정/삭제할 수 있도록 허용

-- 기존 정책이 있다면 삭제
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;

-- 새로운 정책 생성
CREATE POLICY "Users can view own data" ON user_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON user_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON user_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Migration 로그 기록
INSERT INTO migration_log (migration_name, description, status)
VALUES (
  '010_fix_user_data_rls_policies',
  'user_data 테이블에 대한 RLS 정책 생성 - 인증된 사용자는 자신의 데이터만 접근 가능',
  'completed'
)
ON CONFLICT (migration_name) DO NOTHING;

