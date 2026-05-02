-- migration/migrations/040_access_code.sql
-- access_code: 학부모용 단기 코드 (예: 이현2A)
-- 학원 내 유니크 (동일 academy에서 코드 중복 불가)
ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_share_tokens_access_code
  ON share_tokens (academy_id, access_code)
  WHERE access_code IS NOT NULL;
