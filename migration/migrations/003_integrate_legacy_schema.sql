-- Migration: 002_integrate_legacy_schema.sql
-- Description: 기존 supabase-schema-simple.sql과 Migration 시스템 통합
-- Created: 2025-01-06
-- Author: Class Planner Team

-- ==============================================
-- 1. 기존 스키마와의 호환성 확인 및 개선
-- ==============================================

-- user_data 테이블이 이미 생성되어 있는지 확인하고 필요한 개선사항 적용
-- (이미 001_supabase_cross_browser_sync_setup.sql에서 생성됨)

-- JSONB 구조 검증을 위한 CHECK 제약 추가 (기존 스키마에서 누락된 부분)
-- 제약이 이미 존재하는지 확인 후 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_jsonb_structure' 
        AND table_name = 'user_data' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_data 
        ADD CONSTRAINT valid_jsonb_structure 
        CHECK (jsonb_typeof(data) = 'object');
    END IF;
END $$;

-- 업데이트 시간 자동 갱신을 위한 함수 (기존 스키마에서 누락된 부분)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 설정 (기존 스키마에서 누락된 부분)
DROP TRIGGER IF EXISTS update_user_data_updated_at ON public.user_data;
CREATE TRIGGER update_user_data_updated_at 
  BEFORE UPDATE ON public.user_data 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 2. JSONB 데이터 구조 최적화
-- ==============================================

-- JSONB 데이터에 대한 GIN 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_data_data_gin ON public.user_data USING GIN (data);

-- 특정 JSONB 경로에 대한 인덱스 추가 (자주 사용되는 쿼리 패턴 최적화)
CREATE INDEX IF NOT EXISTS idx_user_data_students ON public.user_data USING GIN ((data->'students'));
CREATE INDEX IF NOT EXISTS idx_user_data_subjects ON public.user_data USING GIN ((data->'subjects'));
CREATE INDEX IF NOT EXISTS idx_user_data_sessions ON public.user_data USING GIN ((data->'sessions'));

-- ==============================================
-- 3. 유용한 JSONB 쿼리 함수들 생성
-- ==============================================

-- 특정 학생의 모든 수업 조회 함수
CREATE OR REPLACE FUNCTION public.get_student_sessions(
    p_user_id UUID,
    p_student_id TEXT
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_path_query_array(
            data, 
            '$.sessions[*] ? (@.student_ids[*] == $student_id)',
            jsonb_build_object('student_id', p_student_id)
        )
        FROM public.user_data 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- 특정 요일의 모든 수업 조회 함수
CREATE OR REPLACE FUNCTION public.get_sessions_by_day(
    p_user_id UUID,
    p_day_of_week INTEGER
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_path_query_array(
            data, 
            '$.sessions[*] ? (@.day_of_week == $day)',
            jsonb_build_object('day', p_day_of_week)
        )
        FROM public.user_data 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- 특정 시간대의 수업 조회 함수
CREATE OR REPLACE FUNCTION public.get_sessions_by_time(
    p_user_id UUID,
    p_start_time TEXT
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_path_query_array(
            data, 
            '$.sessions[*] ? (@.start_time == $time)',
            jsonb_build_object('time', p_start_time)
        )
        FROM public.user_data 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 4. 데이터 무결성 검증 함수
-- ==============================================

-- JSONB 데이터 구조 유효성 검증 함수
CREATE OR REPLACE FUNCTION public.validate_user_data_structure(
    p_data JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 필수 필드 존재 확인
    IF NOT (p_data ? 'students' AND p_data ? 'subjects' AND p_data ? 'sessions' AND p_data ? 'settings' AND p_data ? 'version') THEN
        RETURN FALSE;
    END IF;
    
    -- 각 필드가 올바른 타입인지 확인
    IF NOT (jsonb_typeof(p_data->'students') = 'array' AND 
            jsonb_typeof(p_data->'subjects') = 'array' AND 
            jsonb_typeof(p_data->'sessions') = 'array' AND 
            jsonb_typeof(p_data->'settings') = 'object') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 5. 데이터 백업 및 복원 함수
-- ==============================================

-- 사용자 데이터 백업 함수
CREATE OR REPLACE FUNCTION public.backup_user_data(
    p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT data 
        FROM public.user_data 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- 사용자 데이터 복원 함수
CREATE OR REPLACE FUNCTION public.restore_user_data(
    p_user_id UUID,
    p_data JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 데이터 구조 유효성 검증
    IF NOT public.validate_user_data_structure(p_data) THEN
        RAISE EXCEPTION 'Invalid data structure';
    END IF;
    
    -- 데이터 업데이트 또는 삽입
    INSERT INTO public.user_data (user_id, data, updated_at)
    VALUES (p_user_id, p_data, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        data = EXCLUDED.data,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 6. 테이블 구조 및 함수 확인
-- ==============================================

-- 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_data' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 생성된 함수들 확인
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%user_data%' OR routine_name LIKE '%session%' OR routine_name LIKE '%student%'
ORDER BY routine_name;

-- 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_data' 
AND schemaname = 'public';

-- ==============================================
-- Migration 완료 로그
-- ==============================================

-- Migration 실행 완료 시 다음 정보를 기록 (한국시간 기준)
INSERT INTO public.migration_log (migration_name, executed_at, status, description) 
VALUES (
    '002_integrate_legacy_schema',
    NOW() AT TIME ZONE 'Asia/Seoul',
    'completed',
    '기존 스키마와 Migration 시스템 통합 - JSONB 최적화, 유용한 함수들 생성, 데이터 무결성 검증'
) ON CONFLICT (migration_name) DO NOTHING;
