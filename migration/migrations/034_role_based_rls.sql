-- Migration: 034_role_based_rls.sql
-- Date: 2026-05-02
-- Description: Defense-in-depth — role-based (owner/admin) guards on mutation RLS policies
--
-- Context:
--   API routes use the service-role client which BYPASSES RLS entirely.
--   Phase 4 enforces requireRole checks at the route level.
--   This migration adds a second enforcement layer to protect against:
--     1. Supabase Studio direct access by developers accidentally editing data
--     2. Future routes that omit Phase 4 requireRole checks
--     3. Direct database connections via anon/authenticated JWT
--
-- Tables NOT touched (already have owner/admin RLS gates):
--   - teachers        (migration 024: already owner/admin for INSERT/UPDATE/DELETE)
--   - invite_tokens   (migration 020: already owner/admin for INSERT/DELETE + SELECT)
--   - academies       (migration 017: INSERT = created_by, UPDATE = owner/admin)
--   - academy_members (migration 017: SELECT only = direct user_id comparison)
--
-- Tables skipped (do not exist in schema):
--   - share_tokens, templates, attendance

-- =====================================================
-- === students ===
-- Original policies (migration 017): any academy member can INSERT/UPDATE/DELETE
-- New policies: require role IN ('owner', 'admin')
-- SELECT policy ("students_select") is unchanged — members can still read
-- =====================================================
DROP POLICY IF EXISTS "students_insert"  ON public.students;
DROP POLICY IF EXISTS "students_update"  ON public.students;
DROP POLICY IF EXISTS "students_delete"  ON public.students;

CREATE POLICY "students_insert_admin" ON public.students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = students.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "students_update_admin" ON public.students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = students.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "students_delete_admin" ON public.students
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = students.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- === subjects ===
-- Original policies (migration 017): any academy member can INSERT/UPDATE/DELETE
-- New policies: require role IN ('owner', 'admin')
-- SELECT policy ("subjects_select") is unchanged
-- =====================================================
DROP POLICY IF EXISTS "subjects_insert"  ON public.subjects;
DROP POLICY IF EXISTS "subjects_update"  ON public.subjects;
DROP POLICY IF EXISTS "subjects_delete"  ON public.subjects;

CREATE POLICY "subjects_insert_admin" ON public.subjects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = subjects.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "subjects_update_admin" ON public.subjects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = subjects.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "subjects_delete_admin" ON public.subjects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = subjects.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- === sessions ===
-- Original policies (migration 017): any academy member can INSERT/UPDATE/DELETE
-- New policies: require role IN ('owner', 'admin')
-- SELECT policy ("sessions_select") is unchanged
-- =====================================================
DROP POLICY IF EXISTS "sessions_insert"  ON public.sessions;
DROP POLICY IF EXISTS "sessions_update"  ON public.sessions;
DROP POLICY IF EXISTS "sessions_delete"  ON public.sessions;

CREATE POLICY "sessions_insert_admin" ON public.sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = sessions.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sessions_update_admin" ON public.sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = sessions.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sessions_delete_admin" ON public.sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = sessions.academy_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- === enrollments ===
-- Original policies (migration 017): any academy member can INSERT/UPDATE/DELETE
--   (via student → academy JOIN)
-- New policies: require role IN ('owner', 'admin') via same JOIN path
-- SELECT policy ("enrollments_select") is unchanged
-- =====================================================
DROP POLICY IF EXISTS "enrollments_insert"  ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update"  ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete"  ON public.enrollments;

CREATE POLICY "enrollments_insert_admin" ON public.enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = enrollments.student_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "enrollments_update_admin" ON public.enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = enrollments.student_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "enrollments_delete_admin" ON public.enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = enrollments.student_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- === session_enrollments ===
-- Original policies (migration 017): any academy member can INSERT/DELETE
--   (via session → academy JOIN; no UPDATE policy was defined)
-- New policies: require role IN ('owner', 'admin') via same JOIN path
-- SELECT policy ("session_enrollments_select") is unchanged
-- =====================================================
DROP POLICY IF EXISTS "session_enrollments_insert"  ON public.session_enrollments;
DROP POLICY IF EXISTS "session_enrollments_delete"  ON public.session_enrollments;

CREATE POLICY "session_enrollments_insert_admin" ON public.session_enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = session_enrollments.session_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "session_enrollments_delete_admin" ON public.session_enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = session_enrollments.session_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- Migration log
-- =====================================================
INSERT INTO public.migration_log (migration_name, executed_at, status, description)
VALUES (
  '034_role_based_rls',
  NOW(),
  'completed',
  'Defense-in-depth: role-based (owner/admin) mutation RLS policies for students, subjects, sessions, enrollments, session_enrollments'
)
ON CONFLICT (migration_name) DO NOTHING;
