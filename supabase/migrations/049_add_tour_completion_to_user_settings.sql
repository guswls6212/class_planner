-- migration: 049_add_tour_completion_to_user_settings
-- date: 2026-05-27
-- proposal: tour-persistence-cross-device (parent: phase1-production-release)
--
-- tour 완료 상태를 user_settings 에 영속화 — localStorage device 격리 한계 해소.
-- 현재 useTour.ts 가 localStorage `onboarding_completed_${userId}` / `onboarding_login_completed_${userId}`
-- 만 사용 → 새 브라우저/incognito/다른 디바이스 진입 시 tour 재시작 (사용자 의도 X).
-- 본 migration 후 hybrid (DB SSOT + localStorage cache) 로 전환.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS tour_core_completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS tour_login_completed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN user_settings.tour_core_completed_at IS
  'Tour 의 core segment (anonymous + login 공통 step) 완료 timestamp. NULL = 미완료. useTour.ts complete() 호출 시 갱신.';
COMMENT ON COLUMN user_settings.tour_login_completed_at IS
  'Tour 의 login segment (로그인 전용 step) 완료 timestamp. NULL = 미완료. useTour.ts complete() 호출 시 갱신.';
