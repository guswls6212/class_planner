-- Migration: 000_migration_system_setup.sql
-- Description: Migration 시스템을 위한 로그 테이블 생성
-- Created: 2025-01-06
-- Author: Class Planner Team

-- ==============================================
-- Migration 로그 테이블 생성
-- ==============================================

CREATE TABLE IF NOT EXISTS public.migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'completed',
    description TEXT,
    rollback_sql TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_migration_log_name ON public.migration_log (migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_log_executed_at ON public.migration_log (executed_at);

-- RLS 정책 설정 (migration_log는 관리자만 접근)
ALTER TABLE public.migration_log ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능하도록 정책 설정
CREATE POLICY "Only service role can access migration_log" 
ON public.migration_log FOR ALL 
USING (auth.role() = 'service_role');

-- ==============================================
-- Migration 실행 함수 생성 (자동 로그 기록)
-- ==============================================

CREATE OR REPLACE FUNCTION public.execute_migration(
    migration_name TEXT,
    migration_sql TEXT,
    description TEXT DEFAULT NULL,
    rollback_sql TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- 이미 실행된 migration인지 확인
    IF EXISTS (SELECT 1 FROM public.migration_log WHERE migration_name = $1) THEN
        RAISE NOTICE 'Migration % already executed', $1;
        RETURN FALSE;
    END IF;
    
    -- Migration 실행
    BEGIN
        EXECUTE migration_sql;
        
        -- 성공 시 로그 기록
        INSERT INTO public.migration_log (migration_name, status, description, rollback_sql)
        VALUES ($1, 'completed', $3, $4);
        
        RAISE NOTICE 'Migration % executed successfully', $1;
        RETURN TRUE;
        
    EXCEPTION WHEN OTHERS THEN
        -- 실패 시 로그 기록
        INSERT INTO public.migration_log (migration_name, status, description)
        VALUES ($1, 'failed', $3 || ' - Error: ' || SQLERRM);
        
        RAISE NOTICE 'Migration % failed: %', $1, SQLERRM;
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Migration 파일 자동 실행 함수 생성
-- ==============================================

CREATE OR REPLACE FUNCTION public.run_migration_file(
    migration_name TEXT,
    description TEXT DEFAULT NULL,
    rollback_sql TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    migration_sql TEXT;
BEGIN
    -- Migration 파일 내용을 읽어서 실행
    -- 이 함수는 run-migration.sh 스크립트에서 호출됨
    
    -- 이미 실행된 migration인지 확인
    IF EXISTS (SELECT 1 FROM public.migration_log WHERE migration_name = $1) THEN
        RAISE NOTICE 'Migration % already executed', $1;
        RETURN FALSE;
    END IF;
    
    -- Migration 실행 시작 로그
    INSERT INTO public.migration_log (migration_name, status, description, rollback_sql)
    VALUES ($1, 'running', $2, $3);
    
    RAISE NOTICE 'Migration % started', $1;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    -- 실패 시 로그 기록
    INSERT INTO public.migration_log (migration_name, status, description)
    VALUES ($1, 'failed', $2 || ' - Error: ' || SQLERRM);
    
    RAISE NOTICE 'Migration % failed: %', $1, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Migration 롤백 함수 생성
-- ==============================================

CREATE OR REPLACE FUNCTION public.rollback_migration(
    migration_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    rollback_sql TEXT;
BEGIN
    -- 롤백 SQL 가져오기
    SELECT rollback_sql INTO rollback_sql 
    FROM public.migration_log 
    WHERE migration_name = $1 AND status = 'completed';
    
    IF rollback_sql IS NULL THEN
        RAISE NOTICE 'No rollback SQL found for migration %', $1;
        RETURN FALSE;
    END IF;
    
    -- 롤백 실행
    BEGIN
        EXECUTE rollback_sql;
        
        -- 롤백 완료 시 로그 업데이트
        UPDATE public.migration_log 
        SET status = 'rolled_back', updated_at = NOW()
        WHERE migration_name = $1;
        
        RAISE NOTICE 'Migration % rolled back successfully', $1;
        RETURN TRUE;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Rollback failed for migration %: %', $1, SQLERRM;
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Migration 상태 확인 함수 생성
-- ==============================================

CREATE OR REPLACE FUNCTION public.get_migration_status()
RETURNS TABLE (
    migration_name TEXT,
    status TEXT,
    executed_at TIMESTAMPTZ,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.migration_name,
        ml.status,
        ml.executed_at AT TIME ZONE 'Asia/Seoul' AS executed_at,
        ml.description
    FROM public.migration_log ml
    ORDER BY ml.executed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Migration 완료 로그
-- ==============================================

-- Migration 실행 완료 시 다음 정보를 기록 (한국시간 기준)
INSERT INTO public.migration_log (migration_name, executed_at, status, description) 
VALUES (
    '000_migration_system_setup',
    NOW() AT TIME ZONE 'Asia/Seoul',
    'completed',
    'Migration 시스템 구축 완료 - migration_log 테이블 및 관리 함수들 생성'
) ON CONFLICT (migration_name) DO NOTHING;
