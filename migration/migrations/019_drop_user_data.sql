-- Migration: 019_drop_user_data.sql
-- Description: JSONB 기반 user_data 테이블 및 관련 함수 제거
-- Context: Phase 2A S1~S5 완료 후 정규화 테이블로 완전 전환.
--          src/ 코드에서 user_data 참조 0건 확인됨.
--          백업: migration/backups/user_data_20260411-2300.json

-- 1. user_data 전용 함수 제거
--    (update_updated_at_column은 academies/sessions 등에서도 사용되므로 유지)
DROP FUNCTION IF EXISTS public.get_student_sessions(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_sessions_by_day(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_sessions_by_time(UUID, TEXT);
DROP FUNCTION IF EXISTS public.validate_user_data_structure(JSONB);
DROP FUNCTION IF EXISTS public.backup_user_data(UUID);
DROP FUNCTION IF EXISTS public.restore_user_data(UUID, JSONB);

-- 2. user_data 테이블 제거 (CASCADE: 관련 트리거, 제약, 인덱스 자동 삭제)
DROP TABLE IF EXISTS public.user_data CASCADE;
