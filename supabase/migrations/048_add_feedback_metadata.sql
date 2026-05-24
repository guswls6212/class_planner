-- Step 1.1 metadata 확장 (Tier 1 + 2, 2026-05-24).
-- 디버깅 가치 최대화 — IP / screen / viewport / referrer / timezone / locale /
-- role / academy / screenshot. proposal phase1-production-release #step-1.1.

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

COMMENT ON COLUMN feedback.metadata IS
  'Tier 1 metadata JSONB — screen/viewport/devicePixelRatio/referrer/timezone/locale/online/cookieEnabled/role/academy_name/historyLength';

COMMENT ON COLUMN feedback.ip_address IS
  'x-forwarded-for 추출 (Lightsail Nginx). PIPA 개인정보 — Phase 2 진입 시 사용자 동의 modal 추가 의무';

COMMENT ON COLUMN feedback.screenshot_url IS
  'Supabase Storage feedback-screenshots bucket 의 path. signed URL 은 server 에서 발급';

CREATE INDEX IF NOT EXISTS idx_feedback_metadata_gin
  ON feedback USING GIN (metadata);

-- Storage bucket 'feedback-screenshots' (private).
-- size limit 1MB/file, mime image/jpeg + image/png only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  1048576,  -- 1MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies — 학원 멤버 INSERT, 본인 작성만 SELECT.
-- service role 은 자동 bypass (HYUNJIN dev dashboard 용).
CREATE POLICY "screenshot_insert_member" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
    AND EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_members.user_id = auth.uid()
    )
  );

CREATE POLICY "screenshot_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-screenshots'
    AND owner = auth.uid()
  );
