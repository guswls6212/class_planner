-- Migration: 022_create_app_logs.sql
-- 날짜: 2026-04-15
-- 설명: 애플리케이션 로그 영구 저장 테이블 (Phase 2B Step 2)
--       server/client 에러·경고를 Supabase Postgres에 보관.
--       INSERT는 service_role만 (RLS bypass), SELECT는 academy owner만.

-- ─────────────────────────────────────────
-- 1. 테이블
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ts          TIMESTAMPTZ NOT NULL    DEFAULT now(),
  level       TEXT        NOT NULL    CHECK (level   IN ('error', 'warn', 'info', 'debug')),
  source      TEXT        NOT NULL    CHECK (source  IN ('server', 'client')),
  code        TEXT,                                   -- AppError.code 등 (nullable)
  message     TEXT        NOT NULL,
  context     JSONB,                                  -- LogContext + metadata 자유 형식
  user_id     UUID        REFERENCES auth.users(id)        ON DELETE SET NULL,
  academy_id  UUID        REFERENCES public.academies(id)  ON DELETE CASCADE,
  request_id  TEXT,
  user_agent  TEXT,
  url         TEXT,
  stack       TEXT
);

-- ─────────────────────────────────────────
-- 2. 인덱스 (Step 5 관리자 뷰어 쿼리 패턴 대비)
-- ─────────────────────────────────────────
-- academy 기준 최신순 조회 (메인 뷰어 쿼리)
CREATE INDEX IF NOT EXISTS idx_app_logs_academy_ts ON public.app_logs (academy_id, ts DESC);
-- academy_id IS NULL인 미식별 에러 조회용
CREATE INDEX IF NOT EXISTS idx_app_logs_ts         ON public.app_logs (ts DESC);
-- level/source 필터링
CREATE INDEX IF NOT EXISTS idx_app_logs_level      ON public.app_logs (level);
CREATE INDEX IF NOT EXISTS idx_app_logs_source     ON public.app_logs (source);

-- ─────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 academy의 owner만 조회 가능
-- INSERT/UPDATE/DELETE 정책 없음 → service_role이 RLS를 bypass하여 쓰기
CREATE POLICY "app_logs_select_by_owner"
  ON public.app_logs FOR SELECT
  USING (
    academy_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = app_logs.academy_id
        AND user_id    = auth.uid()
        AND role       = 'owner'
    )
  );

-- ─────────────────────────────────────────
-- 4. TTL 함수 (30일 초과 로그 삭제, 선택)
--    pg_cron 스케줄은 Supabase 대시보드에서 수동 등록:
--    Database → Cron Jobs → "0 3 * * *" → SELECT public.delete_old_app_logs();
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_old_app_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.app_logs
  WHERE ts < now() - interval '30 days';
$$;
