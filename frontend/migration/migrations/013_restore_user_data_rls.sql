-- Migration: RLS 복구
-- 날짜: 2025-01-08
-- 설명: user_data 테이블의 Row Level Security 활성화

-- RLS 활성화
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 기존 중복 정책 정리 (선택적)
-- DROP POLICY IF EXISTS "Enable delete access for users based on user_id" ON public.user_data;
-- DROP POLICY IF EXISTS "Enable insert access for users based on user_id" ON public.user_data;
-- DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.user_data;
-- DROP POLICY IF EXISTS "Enable update access for users based on user_id" ON public.user_data;

-- 정리된 정책만 유지
-- Users can view own data
-- Users can insert own data  
-- Users can update own data
-- Users can delete own data

-- RLS 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_data' AND schemaname = 'public';

-- Migration 로그 기록
INSERT INTO public.migration_log (migration_name, executed_at, status, description)
VALUES (
  '013_restore_user_data_rls',
  NOW(),
  'completed',
  'user_data 테이블 RLS 복구 완료 - Row Level Security 활성화'
)
ON CONFLICT (migration_name) DO NOTHING;
