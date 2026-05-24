-- In-app 피드백 채널 (Step 1.1 Phase B, Variant A — Sidebar floating button).
-- design-exploration feedback-channel-design 의 Variant A 채택 (2026-05-24).
-- Phase 1 routing: 개발자 (HYUNJIN) 수신 only. 학원 내부 communication 은
-- Phase 2 진입 시 별도 feature 도입 결정 (Option E, proposal phase1-production-release).
-- target column 은 Phase 2 진입 시 추가 (현재는 모든 피드백 = 개발자 수신).

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('bug', 'feature', 'difficulty', 'general')),
  body TEXT NOT NULL CHECK (length(body) >= 1 AND length(body) <= 4000),
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_note TEXT
);

COMMENT ON TABLE feedback IS
  'In-app 피드백 채널 (Phase 1: 개발자 수신 only). 학원 멤버 (owner/admin/member) 만 작성 가능. share-token viewer 차단.';

COMMENT ON COLUMN feedback.category IS
  'bug | feature | difficulty | general — UI category chip 선택값 (default general)';

COMMENT ON COLUMN feedback.url IS
  '피드백 작성 시점의 URL (디버깅용). e.g. https://class-planner.info365.studio/schedule';

COMMENT ON COLUMN feedback.user_agent IS
  '피드백 작성 시점의 navigator.userAgent (browser/OS 디버깅용)';

-- 자주 조회 패턴: 최근 미해결 피드백 (관리자 dashboard).
CREATE INDEX IF NOT EXISTS idx_feedback_unresolved
  ON feedback (created_at DESC)
  WHERE resolved_at IS NULL;

-- 학원별 조회 (Phase 2 진입 시 owner 가 자기 학원 피드백 보는 용).
CREATE INDEX IF NOT EXISTS idx_feedback_academy
  ON feedback (academy_id, created_at DESC);

-- RLS — 학원 멤버만 본인 작성 INSERT. HYUNJIN 의 dev dashboard 는
-- service_role 으로 우회 (server-side only).
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 본인이 작성한 피드백만 SELECT (디버깅용 + 본인 확인).
CREATE POLICY feedback_select_own ON feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- 학원 멤버 (academy_members 에 row 있음) 만 INSERT 가능.
CREATE POLICY feedback_insert_member ON feedback
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_members.user_id = auth.uid()
        AND academy_members.academy_id = feedback.academy_id
    )
  );
