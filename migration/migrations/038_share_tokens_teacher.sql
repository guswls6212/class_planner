-- migration/migrations/038_share_tokens_teacher.sql
-- share_tokens: 교사 FK, watermark 메타데이터 추가 + created_by nullable (M5)
ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL;

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS watermark_meta jsonb;

-- from-invite: auth user 없이 share_token 생성 허용
ALTER TABLE share_tokens
  ALTER COLUMN created_by DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_share_tokens_teacher_id ON share_tokens(teacher_id)
  WHERE teacher_id IS NOT NULL;

COMMENT ON COLUMN share_tokens.teacher_id IS
  'Reference to the teacher this share token is linked to (when created by a from-invite flow).';

COMMENT ON COLUMN share_tokens.watermark_meta IS
  'JSON metadata for watermark display customization (e.g., header, footer text, logo configuration).';
