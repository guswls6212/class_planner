-- Migration: 중복된 user_data 행 정리
-- 날짜: 2025-01-08
-- 설명: 같은 user_id를 가진 중복 행들을 최신 것만 남기고 삭제

-- 중복된 user_data 행들을 최신 것만 남기고 삭제
WITH ranked_data AS (
  SELECT 
    id,
    user_id,
    data,
    updated_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM public.user_data
  WHERE user_id = '0611d53a-faae-47d9-bd1e-54951167e482'
)
DELETE FROM public.user_data 
WHERE id IN (
  SELECT id FROM ranked_data WHERE rn > 1
);

-- 정리 후 결과 확인
SELECT 
  user_id,
  COUNT(*) as row_count,
  MAX(updated_at) as latest_update
FROM public.user_data 
WHERE user_id = '0611d53a-faae-47d9-bd1e-54951167e482'
GROUP BY user_id;

-- Migration 로그 기록
INSERT INTO public.migration_log (migration_name, executed_at, status, description)
VALUES (
  '012_cleanup_duplicate_user_data',
  NOW(),
  'completed',
  '중복된 user_data 행 정리 완료 - 같은 user_id를 가진 중복 행들을 최신 것만 남기고 삭제'
)
ON CONFLICT (migration_name) DO NOTHING;

