-- migration/migrations/036_teachers_rls_member_own.sql
-- owner/admin: can UPDATE any teacher row in their academy
CREATE POLICY "teachers_update_owner_admin" ON teachers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- member: can UPDATE only their own teacher row (private fields only — enforced at API level)
CREATE POLICY "teachers_update_own" ON teachers
  FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
        AND role = 'member'
    )
  );
