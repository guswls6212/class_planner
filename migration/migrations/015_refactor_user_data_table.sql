-- Migration: 015_refactor_user_data_table.sql
-- 날짜: 2025-09-11
-- 설명: user_data 테이블 구조 개선 - user_id를 Primary Key로 설정하고 id 컬럼 제거

-- =====================================================
-- 1. 기존 중복 데이터 정리 (최신 데이터만 유지)
-- =====================================================
WITH latest_data AS (
  SELECT DISTINCT ON (user_id) 
    user_id,
    data,
    updated_at,
    created_at
  FROM public.user_data
  ORDER BY user_id, updated_at DESC
)
DELETE FROM public.user_data 
WHERE id NOT IN (
  SELECT id FROM public.user_data ud
  INNER JOIN latest_data ld ON ud.user_id = ld.user_id 
  WHERE ud.updated_at = ld.updated_at
);

-- =====================================================
-- 2. 새로운 테이블 생성 (임시)
-- =====================================================
CREATE TABLE public.user_data_new (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data) = 'object'),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. 기존 데이터를 새 테이블로 복사
-- =====================================================
INSERT INTO public.user_data_new (user_id, data, created_at, updated_at)
SELECT DISTINCT ON (user_id) 
    user_id,
    data,
    created_at,
    updated_at
FROM public.user_data
ORDER BY user_id, updated_at DESC;

-- =====================================================
-- 4. 기존 테이블 삭제
-- =====================================================
DROP TABLE public.user_data;

-- =====================================================
-- 5. 새 테이블을 원래 이름으로 변경
-- =====================================================
ALTER TABLE public.user_data_new RENAME TO user_data;

-- =====================================================
-- 6. RLS 정책 설정
-- =====================================================
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 기존 RLS 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view their own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can update their own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can delete their own data" ON public.user_data;

-- 새로운 RLS 정책 생성
CREATE POLICY "Users can view their own data" ON public.user_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data" ON public.user_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data" ON public.user_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data" ON public.user_data
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. 인덱스 생성
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON public.user_data(user_id);

-- =====================================================
-- 8. 자동 업데이트 트리거 생성
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_data_updated_at 
    BEFORE UPDATE ON public.user_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. 마이그레이션 로그 기록
-- =====================================================
INSERT INTO public.migration_log (migration_name, executed_at, status, description)
VALUES (
  '015_refactor_user_data_table',
  NOW(),
  'completed',
  'user_data 테이블 구조 개선 완료 - user_id를 Primary Key로 설정하고 id 컬럼 제거'
)
ON CONFLICT (migration_name) DO NOTHING;

-- =====================================================
-- 마이그레이션 완료
-- =====================================================
-- 이 마이그레이션은 다음 작업을 수행합니다:
-- 1. 기존 중복 데이터 정리
-- 2. user_id를 Primary Key로 하는 새로운 테이블 생성
-- 3. 기존 데이터를 새 테이블로 마이그레이션
-- 4. RLS 정책 재설정
-- 5. 인덱스 및 트리거 설정
-- 6. 마이그레이션 로그 기록
