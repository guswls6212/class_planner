-- migration/migrations/037_invite_tokens_email.sql
-- invite_tokens에 email 컬럼 추가 (M4: 초대 대상 이메일 특정, 수락 시 검증용)
ALTER TABLE public.invite_tokens
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.invite_tokens.email IS
  'The specific email address this invite is intended for. If set, acceptance is restricted to users with a matching email.';
