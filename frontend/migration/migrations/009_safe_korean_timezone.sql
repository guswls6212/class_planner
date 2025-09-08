-- Migration: 009_safe_korean_timezone.sql
-- 안전한 한국시간 설정 트리거 함수

-- 1. 기존 트리거 함수 삭제
DROP FUNCTION IF EXISTS set_korean_timezone() CASCADE;

-- 2. 기존 트리거들 삭제
DROP TRIGGER IF EXISTS user_settings_korean_timezone_trigger ON user_settings;
DROP TRIGGER IF EXISTS user_profiles_korean_timezone_trigger ON user_profiles;
DROP TRIGGER IF EXISTS user_data_korean_timezone_trigger ON user_data;
DROP TRIGGER IF EXISTS user_activity_logs_korean_timezone_trigger ON user_activity_logs;
DROP TRIGGER IF EXISTS migration_log_korean_timezone_trigger ON migration_log;

-- 3. 기존 데이터를 한국시간으로 변환
-- user_settings 테이블
UPDATE user_settings 
SET 
    created_at = created_at AT TIME ZONE 'Asia/Seoul',
    updated_at = updated_at AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL OR updated_at IS NOT NULL;

-- user_profiles 테이블
UPDATE user_profiles 
SET 
    created_at = created_at AT TIME ZONE 'Asia/Seoul',
    updated_at = updated_at AT TIME ZONE 'Asia/Seoul',
    subscription_expires_at = subscription_expires_at AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL OR updated_at IS NOT NULL OR subscription_expires_at IS NOT NULL;

-- user_data 테이블
UPDATE user_data 
SET 
    created_at = created_at AT TIME ZONE 'Asia/Seoul',
    updated_at = updated_at AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL OR updated_at IS NOT NULL;

-- user_activity_logs 테이블
UPDATE user_activity_logs 
SET 
    created_at = created_at AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL;

-- migration_log 테이블
UPDATE migration_log 
SET 
    created_at = created_at AT TIME ZONE 'Asia/Seoul',
    executed_at = executed_at AT TIME ZONE 'Asia/Seoul',
    updated_at = updated_at AT TIME ZONE 'Asia/Seoul'
WHERE created_at IS NOT NULL OR executed_at IS NOT NULL OR updated_at IS NOT NULL;

-- 4. 안전한 트리거 함수 생성
CREATE OR REPLACE FUNCTION set_korean_timezone()
RETURNS TRIGGER AS $$
BEGIN
    -- 현재 시간을 한국시간으로 설정
    IF TG_OP = 'INSERT' THEN
        -- created_at 처리 (모든 테이블에 공통)
        IF NEW.created_at IS NULL THEN
            NEW.created_at = NOW() AT TIME ZONE 'Asia/Seoul';
        ELSE
            NEW.created_at = NEW.created_at AT TIME ZONE 'Asia/Seoul';
        END IF;
        
        -- updated_at 처리 (updated_at 필드가 있는 테이블만)
        IF TG_TABLE_NAME IN ('user_settings', 'user_profiles', 'user_data', 'migration_log') THEN
            IF NEW.updated_at IS NULL THEN
                NEW.updated_at = NOW() AT TIME ZONE 'Asia/Seoul';
            ELSE
                NEW.updated_at = NEW.updated_at AT TIME ZONE 'Asia/Seoul';
            END IF;
        END IF;
        
        -- 테이블별 특수 필드 처리
        IF TG_TABLE_NAME = 'user_profiles' THEN
            -- subscription_expires_at 처리
            IF NEW.subscription_expires_at IS NOT NULL THEN
                NEW.subscription_expires_at = NEW.subscription_expires_at AT TIME ZONE 'Asia/Seoul';
            END IF;
        ELSIF TG_TABLE_NAME = 'migration_log' THEN
            -- executed_at 처리
            IF NEW.executed_at IS NULL THEN
                NEW.executed_at = NOW() AT TIME ZONE 'Asia/Seoul';
            ELSE
                NEW.executed_at = NEW.executed_at AT TIME ZONE 'Asia/Seoul';
            END IF;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- updated_at은 항상 현재 한국시간으로 업데이트 (updated_at 필드가 있는 테이블만)
        IF TG_TABLE_NAME IN ('user_settings', 'user_profiles', 'user_data', 'migration_log') THEN
            NEW.updated_at = NOW() AT TIME ZONE 'Asia/Seoul';
        END IF;
        
        -- created_at 처리
        IF NEW.created_at IS NOT NULL THEN
            NEW.created_at = NEW.created_at AT TIME ZONE 'Asia/Seoul';
        END IF;
        
        -- 테이블별 특수 필드 처리
        IF TG_TABLE_NAME = 'user_profiles' THEN
            -- subscription_expires_at 처리
            IF NEW.subscription_expires_at IS NOT NULL THEN
                NEW.subscription_expires_at = NEW.subscription_expires_at AT TIME ZONE 'Asia/Seoul';
            END IF;
        ELSIF TG_TABLE_NAME = 'migration_log' THEN
            -- executed_at 처리
            IF NEW.executed_at IS NOT NULL THEN
                NEW.executed_at = NEW.executed_at AT TIME ZONE 'Asia/Seoul';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 각 테이블에 트리거 설정
-- user_settings 테이블
CREATE TRIGGER user_settings_korean_timezone_trigger
    BEFORE INSERT OR UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION set_korean_timezone();

-- user_profiles 테이블
CREATE TRIGGER user_profiles_korean_timezone_trigger
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION set_korean_timezone();

-- user_data 테이블
CREATE TRIGGER user_data_korean_timezone_trigger
    BEFORE INSERT OR UPDATE ON user_data
    FOR EACH ROW EXECUTE FUNCTION set_korean_timezone();

-- user_activity_logs 테이블
CREATE TRIGGER user_activity_logs_korean_timezone_trigger
    BEFORE INSERT OR UPDATE ON user_activity_logs
    FOR EACH ROW EXECUTE FUNCTION set_korean_timezone();

-- migration_log 테이블
CREATE TRIGGER migration_log_korean_timezone_trigger
    BEFORE INSERT OR UPDATE ON migration_log
    FOR EACH ROW EXECUTE FUNCTION set_korean_timezone();

-- 6. Migration 로그 기록
INSERT INTO migration_log (migration_name, executed_at, status, description)
VALUES (
    '009_safe_korean_timezone',
    NOW() AT TIME ZONE 'Asia/Seoul',
    'completed',
    '안전한 한국시간 설정 트리거 함수 - 필드 존재 여부 확인'
) ON CONFLICT DO NOTHING;

