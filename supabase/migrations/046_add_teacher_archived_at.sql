-- Add archived_at to teachers for soft archive (PR 6 Phase 1).
-- design-exploration teacher-replace-ux 의 Variant C 채택 (2026-05-23).
-- 강사 row 를 "보관" 처리 — 목록에서 숨김 + 정보·담당 수업 보존 + 복구 가능.
-- 완전 삭제 (hard DELETE) 는 별도 흐름으로 유지 (Phase 3 에서 고급 옵션화).

ALTER TABLE teachers
  ADD COLUMN archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN teachers.archived_at IS
  '보관 시점. NULL = 활성, NOT NULL = 보관됨. 복구 시 NULL 로 복원.';

-- 자주 조회되는 패턴: WHERE academy_id = ? AND archived_at IS NULL.
-- 일반 강사 목록 조회에 partial index 권장.
CREATE INDEX IF NOT EXISTS idx_teachers_active
  ON teachers (academy_id)
  WHERE archived_at IS NULL;
