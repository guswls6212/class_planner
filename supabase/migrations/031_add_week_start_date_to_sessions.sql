-- 1. 컬럼 추가 (nullable로 시작하여 기존 row에 NULL 허용)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS week_start_date DATE;

-- 2. 기존 row를 마이그레이션 시점의 주(KST 기준 월요일)에 일괄 할당
UPDATE sessions
  SET week_start_date = (
    (CURRENT_DATE AT TIME ZONE 'Asia/Seoul')::DATE
    - EXTRACT(ISODOW FROM (CURRENT_DATE AT TIME ZONE 'Asia/Seoul'))::INTEGER + 1
  )::DATE
  WHERE week_start_date IS NULL;

-- 3. NOT NULL 제약 적용
ALTER TABLE sessions
  ALTER COLUMN week_start_date SET NOT NULL;

-- 4. 조회 성능을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_sessions_academy_week
  ON sessions(academy_id, week_start_date);

-- 5. 기록용 코멘트
COMMENT ON COLUMN sessions.week_start_date IS
  '시간표가 속한 주의 월요일 날짜 (KST 기준). 주별 격리 모델 도입 (2026-04-30)';
