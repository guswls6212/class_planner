-- Migration: 003_user_management_tables.sql
-- Description: 로그인 사용자 관리 테이블 생성 및 설정
-- Created: 2025-01-06
-- Author: Class Planner Team

-- ==============================================
-- 1. 사용자 프로필 테이블 생성
-- ==============================================

-- 사용자 프로필 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium')),
    subscription_expires_at TIMESTAMPTZ,
    student_limit INTEGER DEFAULT 10 CHECK (student_limit > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription ON public.user_profiles (subscription_type);

-- ==============================================
-- 2. 사용자 설정 테이블 생성
-- ==============================================

-- 사용자별 개인 설정을 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'ko' CHECK (language IN ('ko', 'en')),
    timezone TEXT DEFAULT 'Asia/Seoul',
    notifications JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    privacy_settings JSONB DEFAULT '{"profile_public": false, "data_sharing": false}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);

-- ==============================================
-- 3. 사용자 활동 로그 테이블 생성
-- ==============================================

-- 사용자 활동을 추적하는 테이블
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'data_sync', 'export', 'import', 'settings_change')),
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs (activity_type);

-- ==============================================
-- 4. Row Level Security (RLS) 정책 설정
-- ==============================================

-- user_profiles 테이블 RLS 설정
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필만 조회/수정 가능
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- user_settings 테이블 RLS 설정
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 설정만 조회/수정 가능
CREATE POLICY "Users can view own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- user_activity_logs 테이블 RLS 설정
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 활동 로그만 조회 가능
CREATE POLICY "Users can view own activity logs" 
ON public.user_activity_logs FOR SELECT 
USING (auth.uid() = user_id);

-- 모든 사용자는 활동 로그를 기록할 수 있음
CREATE POLICY "Users can insert activity logs" 
ON public.user_activity_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- 5. 자동 업데이트 트리거 설정
-- ==============================================

-- user_profiles 테이블 업데이트 트리거
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON public.user_profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_settings 테이블 업데이트 트리거
CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON public.user_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 6. 사용자 관리 함수들 생성
-- ==============================================

-- 사용자 프로필 생성 함수
CREATE OR REPLACE FUNCTION public.create_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'student'
)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
BEGIN
    INSERT INTO public.user_profiles (
        user_id, email, display_name, avatar_url, phone, role
    ) VALUES (
        p_user_id, p_email, p_display_name, p_avatar_url, p_phone, p_role
    ) RETURNING id INTO profile_id;
    
    -- 기본 설정도 함께 생성
    INSERT INTO public.user_settings (user_id) VALUES (p_user_id);
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- 사용자 구독 정보 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_user_subscription(
    p_user_id UUID,
    p_subscription_type TEXT,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_student_limit INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_profiles 
    SET 
        subscription_type = p_subscription_type,
        subscription_expires_at = p_expires_at,
        student_limit = COALESCE(p_student_limit, student_limit),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 사용자 활동 로그 기록 함수
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_activity_data JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.user_activity_logs (
        user_id, activity_type, activity_data, ip_address, user_agent
    ) VALUES (
        p_user_id, p_activity_type, p_activity_data, p_ip_address, p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 사용자 데이터 통계 조회 함수
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object(
                'display_name', display_name,
                'email', email,
                'role', role,
                'subscription_type', subscription_type,
                'student_limit', student_limit,
                'created_at', created_at
            )
            FROM public.user_profiles 
            WHERE user_id = p_user_id
        ),
        'data_stats', (
            SELECT jsonb_build_object(
                'students_count', jsonb_array_length(COALESCE(data->'students', '[]'::jsonb)),
                'subjects_count', jsonb_array_length(COALESCE(data->'subjects', '[]'::jsonb)),
                'sessions_count', jsonb_array_length(COALESCE(data->'sessions', '[]'::jsonb)),
                'last_updated', updated_at
            )
            FROM public.user_data 
            WHERE user_id = p_user_id
        ),
        'activity_stats', (
            SELECT jsonb_build_object(
                'total_activities', COUNT(*),
                'last_login', MAX(CASE WHEN activity_type = 'login' THEN created_at END),
                'last_data_sync', MAX(CASE WHEN activity_type = 'data_sync' THEN created_at END)
            )
            FROM public.user_activity_logs 
            WHERE user_id = p_user_id
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 7. Realtime 기능 활성화
-- ==============================================

-- user_profiles 테이블에 Realtime 활성화 (수동으로 Supabase 대시보드에서 설정 필요)
-- Table Editor → user_profiles → Realtime → Enable Realtime

-- user_settings 테이블에 Realtime 활성화 (수동으로 Supabase 대시보드에서 설정 필요)
-- Table Editor → user_settings → Realtime → Enable Realtime

-- ==============================================
-- 8. 테이블 구조 확인
-- ==============================================

-- 생성된 테이블들 확인
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'user_settings', 'user_activity_logs')
ORDER BY table_name;

-- 생성된 함수들 확인
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- ==============================================
-- Migration 완료 로그
-- ==============================================

-- Migration 실행 완료 시 다음 정보를 기록 (한국시간 기준)
INSERT INTO public.migration_log (migration_name, executed_at, status, description) 
VALUES (
    '003_user_management_tables',
    NOW() AT TIME ZONE 'Asia/Seoul',
    'completed',
    '로그인 사용자 관리 테이블 생성 - user_profiles, user_settings, user_activity_logs 및 관련 함수들'
) ON CONFLICT (migration_name) DO NOTHING;
