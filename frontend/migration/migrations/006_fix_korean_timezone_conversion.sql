-- Migration: 006_fix_korean_timezone_conversion.sql
-- 한국시간 변환 수정 - 올바른 방법으로 시간대 변환

-- 1. 기존 데이터를 한국시간으로 올바르게 변환
-- user_settings 테이블
UPDATE user_settings 
SET 
    created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
    updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL OR updated_at IS NOT NULL;

-- user_profiles 테이블
UPDATE user_profiles 
SET 
    created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
    updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
    subscription_expires_at = (subscription_expires_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL OR updated_at IS NOT NULL OR subscription_expires_at IS NOT NULL;

-- user_data 테이블
UPDATE user_data 
SET 
    created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
    updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL OR updated_at IS NOT NULL;

-- user_activity_logs 테이블
UPDATE user_activity_logs 
SET 
    created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL;

-- migration_log 테이블
UPDATE migration_log 
SET 
    created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
    executed_at = (executed_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
    updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL OR executed_at IS NOT NULL OR updated_at IS NOT NULL;

-- 2. 트리거 함수 수정 - 한국시간으로 올바르게 설정
CREATE OR REPLACE FUNCTION set_korean_timezone()
RETURNS TRIGGER AS $$
BEGIN
    -- 현재 시간을 한국시간으로 설정
    IF TG_OP = 'INSERT' THEN
        -- created_at 처리
        IF NEW.created_at IS NULL THEN
            NEW.created_at = (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
        ELSE
            NEW.created_at = (NEW.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
        END IF;
        
        -- updated_at 처리
        IF NEW.updated_at IS NULL THEN
            NEW.updated_at = (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
        ELSE
            NEW.updated_at = (NEW.updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
        END IF;
        
        -- 테이블별 특수 필드 처리
        IF TG_TABLE_NAME = 'user_profiles' THEN
            -- subscription_expires_at 처리
            IF NEW.subscription_expires_at IS NOT NULL THEN
                NEW.subscription_expires_at = (NEW.subscription_expires_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
            END IF;
        ELSIF TG_TABLE_NAME = 'migration_log' THEN
            -- executed_at 처리
            IF NEW.executed_at IS NULL THEN
                NEW.executed_at = (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
            ELSE
                NEW.executed_at = (NEW.executed_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
            END IF;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- updated_at은 항상 현재 한국시간으로 업데이트
        NEW.updated_at = (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
        
        -- created_at 처리
        IF NEW.created_at IS NOT NULL THEN
            NEW.created_at = (NEW.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
        END IF;
        
        -- 테이블별 특수 필드 처리
        IF TG_TABLE_NAME = 'user_profiles' THEN
            -- subscription_expires_at 처리
            IF NEW.subscription_expires_at IS NOT NULL THEN
                NEW.subscription_expires_at = (NEW.subscription_expires_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
            END IF;
        ELSIF TG_TABLE_NAME = 'migration_log' THEN
            -- executed_at 처리
            IF NEW.executed_at IS NOT NULL THEN
                NEW.executed_at = (NEW.executed_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Migration 로그 기록
INSERT INTO migration_log (migration_name, executed_at, status, description)
VALUES (
    '006_fix_korean_timezone_conversion',
    (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
    'completed',
    '한국시간 변환 수정 - 올바른 방법으로 시간대 변환 및 트리거 함수 수정'
) ON CONFLICT DO NOTHING;
