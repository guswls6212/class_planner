-- Migration: 001_supabase_cross_browser_sync_setup.sql
-- Description: Supabase 크로스 브라우저 동기화를 위한 테이블 구조 개선 및 보안 설정
-- Created: 2025-01-06
-- Author: Class Planner Team

-- ==============================================
-- 1. user_data 테이블 생성 (처음부터 생성)
-- ==============================================

-- user_data 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_id 컬럼에 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON public.user_data (user_id);

-- updated_at 컬럼에 인덱스 추가 (동기화 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_data_updated_at ON public.user_data (updated_at);

-- data 컬럼에 GIN 인덱스 추가 (JSONB 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_data_data ON public.user_data USING GIN (data);

-- ==============================================
-- 2. Row Level Security (RLS) 정책 설정
-- ==============================================

-- RLS 활성화
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.user_data;
DROP POLICY IF EXISTS "Enable insert access for users based on user_id" ON public.user_data;
DROP POLICY IF EXISTS "Enable update access for users based on user_id" ON public.user_data;
DROP POLICY IF EXISTS "Enable delete access for users based on user_id" ON public.user_data;

-- SELECT 정책: 자신의 데이터만 읽기 허용
CREATE POLICY "Enable read access for users based on user_id" 
ON public.user_data FOR SELECT 
USING (auth.uid() = user_id);

-- INSERT 정책: 자신의 데이터만 삽입 허용
CREATE POLICY "Enable insert access for users based on user_id" 
ON public.user_data FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 자신의 데이터만 업데이트 허용
CREATE POLICY "Enable update access for users based on user_id" 
ON public.user_data FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- DELETE 정책: 자신의 데이터만 삭제 허용
CREATE POLICY "Enable delete access for users based on user_id" 
ON public.user_data FOR DELETE 
USING (auth.uid() = user_id);

-- ==============================================
-- 3. Realtime 기능 활성화
-- ==============================================

-- Realtime 기능 활성화 (이 부분은 Supabase 대시보드에서 수동으로 설정해야 함)
-- Table Editor → user_data 테이블 → Realtime 탭 → Enable Realtime 클릭

-- ==============================================
-- 4. 테이블 구조 확인
-- ==============================================

-- 테이블 구조 확인을 위한 쿼리
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_data' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_data';

-- ==============================================
-- Migration 완료 로그
-- ==============================================

-- Migration 실행 완료 시 다음 정보를 기록 (한국시간 기준)
INSERT INTO public.migration_log (migration_name, executed_at, status, description) 
VALUES (
    '001_supabase_cross_browser_sync_setup',
    NOW() AT TIME ZONE 'Asia/Seoul',
    'completed',
    'user_data 테이블 생성 및 크로스 브라우저 동기화 설정 완료'
) ON CONFLICT (migration_name) DO NOTHING;
