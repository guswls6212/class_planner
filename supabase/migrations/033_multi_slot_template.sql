-- ============================================================================
-- Migration 033: Multi-slot template (T2)
-- ============================================================================
-- Date: 2026-05-05
-- Refs: ADR-008, plan .claude/plans/nifty-munching-reddy.md (T2 PR-B)
--
-- Purpose:
--   ADR-004 의 "학원당 1개 템플릿" → ADR-008 의 "학원당 2 슬롯" 으로 확장.
--   슬롯 3-N 은 향후 unlock 예정 (paywall 도입 시점). 본 migration 은
--   schema 변경 + 기존 dead row 정리 + (academy_id, slot_index) unique 강제.
--
-- Steps:
--   1. slot_index 컬럼 추가 (DEFAULT 0, NOT NULL)
--   2. F4 cleanup — created_at DESC 상위 2개만 keep, 나머지 삭제
--      (현진학원 829d7cc2 의 5/4 14:08 "테스트템플릿" 1 row 영향 — dry-run 확정)
--   3. slot_index 재할당 (academy 별 created_at DESC 0/1)
--   4. (academy_id, slot_index) unique constraint
--
-- Idempotency: IF NOT EXISTS 사용 + atomic transaction (BEGIN/COMMIT).
--   재실행 안전. 단, F4 cleanup 의 DELETE 는 row 가 없으면 0 영향 (멱등).
-- ============================================================================

BEGIN;

-- Step 1: slot_index 컬럼 추가
ALTER TABLE templates ADD COLUMN IF NOT EXISTS slot_index INT DEFAULT 0;
UPDATE templates SET slot_index = 0 WHERE slot_index IS NULL;
ALTER TABLE templates ALTER COLUMN slot_index SET NOT NULL;

-- Step 2: F4 cleanup — academy 당 created_at DESC 상위 2개만 keep
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY academy_id ORDER BY created_at DESC) AS rn
  FROM templates
)
DELETE FROM templates
WHERE id IN (SELECT id FROM ranked WHERE rn > 2);

-- Step 3: slot_index 재할당 (cleanup 후, academy 당 0 = 최신, 1 = 두 번째)
WITH ranked AS (
  SELECT id,
    (ROW_NUMBER() OVER (PARTITION BY academy_id ORDER BY created_at DESC) - 1) AS new_slot
  FROM templates
)
UPDATE templates t
SET slot_index = ranked.new_slot
FROM ranked
WHERE t.id = ranked.id;

-- Step 4: (academy_id, slot_index) unique constraint
-- ADR-008 의 free 2 슬롯 정책 강제. 향후 unlock 시 슬롯 N 확장 가능.
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_academy_slot_unique
  ON templates(academy_id, slot_index);

COMMIT;

-- ============================================================================
-- 검증 (post-apply)
-- ============================================================================
-- 1. 모든 row 의 slot_index 가 0 또는 1 인지:
--    SELECT slot_index, COUNT(*) FROM templates GROUP BY slot_index;
--
-- 2. (academy_id, slot_index) 의 unique 보장:
--    SELECT academy_id, slot_index, COUNT(*) FROM templates
--    GROUP BY academy_id, slot_index HAVING COUNT(*) > 1;
--    (결과 0 row 가 정상)
--
-- 3. F4 cleanup 영향 — 현진학원:
--    SELECT id, name, slot_index, created_at FROM templates
--    WHERE academy_id = '829d7cc2-7fe9-4618-8b3b-7df2d473e8ea'
--    ORDER BY slot_index;
--    (예상: 2 rows, slot_index 0/1)
-- ============================================================================
