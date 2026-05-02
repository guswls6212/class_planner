-- migration/migrations/035_audit_log.sql
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  uuid REFERENCES academies NOT NULL,
  actor_id    uuid REFERENCES auth.users,
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  before      jsonb,
  after       jsonb,
  at          timestamptz DEFAULT now()
);

CREATE INDEX audit_log_academy_at ON audit_log (academy_id, at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- owner/admin only read
CREATE POLICY "audit_log_select_admin" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_id = audit_log.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- INSERT via service role only (API uses service role client)
CREATE POLICY "audit_log_insert_service" ON audit_log
  FOR INSERT WITH CHECK (true);
