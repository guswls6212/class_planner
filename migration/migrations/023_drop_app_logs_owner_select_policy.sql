-- app_logs_select_by_owner 정책 제거
-- app_logs는 개발자 전용 기술 로그 테이블. service_role로만 SELECT (RLS bypass).
-- 학원장 대상 activity log/audit는 향후 audit_events 별도 테이블에서 구현 예정.
DROP POLICY IF EXISTS "app_logs_select_by_owner" ON public.app_logs;
