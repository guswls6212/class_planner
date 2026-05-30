-- 034_create_data_snapshots.sql
-- 데이터 백업/복구 시스템 — 충돌 직전 / 템플릿 저장 / 사용자 수동 백업의 3가지
-- snapshot_type 으로 academy 데이터 전체(JSONB)를 보존.
--
-- Retention 정책 (API 라우트에서 atomic enforce, cron 불필요):
--   - auto_template: 30일 + max 10개 (11번째 들어오면 가장 오래된 것 자동 삭제)
--   - before_conflict: 무제한 (핵심 안전망 — 무료 사용자도 잘못된 충돌 선택 복구)
--   - manual: max 5개 (프리미엄 전용, 무료엔 0개 정책)
--
-- RLS: ENABLE만 (정책 없음) → service_role 접근만. API 라우트가
-- academy_members 검증 패턴으로 access control. (templates / attendance 동일 패턴)

BEGIN;

CREATE TABLE IF NOT EXISTS data_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (
    snapshot_type IN ('auto_template', 'before_conflict', 'manual')
  ),
  data_payload JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 복원 시 chain of safety — 어느 snapshot으로부터 복원했는지 기록
  restored_from_id UUID REFERENCES data_snapshots(id) ON DELETE SET NULL,
  description TEXT
);

-- 시간순 list (설정 페이지 데이터 이력) + retention 정리(가장 오래된 것 찾기)
CREATE INDEX IF NOT EXISTS idx_snapshots_academy_created
  ON data_snapshots(academy_id, created_at DESC);

-- type별 list (auto_template / before_conflict / manual 필터)
CREATE INDEX IF NOT EXISTS idx_snapshots_type
  ON data_snapshots(academy_id, snapshot_type, created_at DESC);

ALTER TABLE data_snapshots ENABLE ROW LEVEL SECURITY;
-- (no policies) — service_role 접근만

COMMIT;

-- 검증 (post-apply)
-- SELECT count(*) FROM data_snapshots;
-- INSERT INTO data_snapshots (academy_id, snapshot_type, data_payload)
--   VALUES ('<academy_uuid>', 'manual', '{"test": true}');
