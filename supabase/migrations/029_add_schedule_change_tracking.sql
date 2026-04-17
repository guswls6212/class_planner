-- academies: 해당 학원의 시간표가 마지막으로 변경된 시각
ALTER TABLE academies
  ADD COLUMN schedule_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- share_tokens: 해당 토큰이 마지막으로 열람된 시각 (NULL = 최초 방문 전)
ALTER TABLE share_tokens
  ADD COLUMN last_viewed_at TIMESTAMPTZ;

-- sessions INSERT/UPDATE/DELETE 시 academy.schedule_updated_at 을 bump 하는 trigger
CREATE OR REPLACE FUNCTION bump_academy_schedule_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  target_academy UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_academy := OLD.academy_id;
  ELSE
    target_academy := NEW.academy_id;
  END IF;

  UPDATE academies
     SET schedule_updated_at = now()
   WHERE id = target_academy;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sessions_bump_academy_schedule
AFTER INSERT OR UPDATE OR DELETE ON sessions
FOR EACH ROW
EXECUTE FUNCTION bump_academy_schedule_updated_at();

-- 기존 academy에 대한 baseline 설정 (가장 최근 session.updated_at 또는 created_at)
UPDATE academies a
   SET schedule_updated_at = COALESCE(
         (SELECT MAX(s.updated_at) FROM sessions s WHERE s.academy_id = a.id),
         a.created_at,
         now()
       );
