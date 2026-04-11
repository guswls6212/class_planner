-- Migration: 017_rls_academy_based.sql
-- 날짜: 2026-04-11
-- 설명: Academy 기반 RLS(Row Level Security) 정책 설정
--   - 모든 신규 테이블에 RLS 활성화
--   - 무한재귀 방지: academy_members는 user_id = auth.uid() 직접 비교
--   - 2A-1 범위: academy_members INSERT/DELETE 정책 비활성화 (초대 기능은 2A-2에서)
-- 참조: Phase 2A-1 계획

-- =====================================================
-- 1. 모든 신규 테이블에 RLS 활성화
-- =====================================================
ALTER TABLE public.academies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_enrollments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. academies 정책
--   SELECT/UPDATE: 내가 멤버인 학원만 (EXISTS로 무한재귀 방지)
--   INSERT: created_by = 본인
-- =====================================================
DROP POLICY IF EXISTS "academies_select"  ON public.academies;
DROP POLICY IF EXISTS "academies_insert"  ON public.academies;
DROP POLICY IF EXISTS "academies_update"  ON public.academies;

CREATE POLICY "academies_select" ON public.academies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "academies_insert" ON public.academies
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "academies_update" ON public.academies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = id AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 3. academy_members 정책
--   SELECT: user_id = auth.uid() 직접 비교 (재귀 없음)
--   INSERT/DELETE: 2A-1에서는 허용하지 않음 (2A-2 초대 기능에서 추가)
-- =====================================================
DROP POLICY IF EXISTS "academy_members_select" ON public.academy_members;

CREATE POLICY "academy_members_select" ON public.academy_members
  FOR SELECT USING (user_id = auth.uid());

-- 서비스 롤(service_role)은 RLS를 우회하므로 018 마이그레이션(owner INSERT)에 문제 없음

-- =====================================================
-- 4. students 정책
--   내가 멤버인 학원 소속 학생만 접근
-- =====================================================
DROP POLICY IF EXISTS "students_select"  ON public.students;
DROP POLICY IF EXISTS "students_insert"  ON public.students;
DROP POLICY IF EXISTS "students_update"  ON public.students;
DROP POLICY IF EXISTS "students_delete"  ON public.students;

CREATE POLICY "students_select" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = students.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "students_insert" ON public.students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = students.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "students_update" ON public.students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = students.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "students_delete" ON public.students
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = students.academy_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. subjects 정책
-- =====================================================
DROP POLICY IF EXISTS "subjects_select"  ON public.subjects;
DROP POLICY IF EXISTS "subjects_insert"  ON public.subjects;
DROP POLICY IF EXISTS "subjects_update"  ON public.subjects;
DROP POLICY IF EXISTS "subjects_delete"  ON public.subjects;

CREATE POLICY "subjects_select" ON public.subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = subjects.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "subjects_insert" ON public.subjects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = subjects.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "subjects_update" ON public.subjects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = subjects.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "subjects_delete" ON public.subjects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = subjects.academy_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. enrollments 정책 (student → academy 조인)
-- =====================================================
DROP POLICY IF EXISTS "enrollments_select"  ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert"  ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update"  ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete"  ON public.enrollments;

CREATE POLICY "enrollments_select" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = enrollments.student_id AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_insert" ON public.enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = enrollments.student_id AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_update" ON public.enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = enrollments.student_id AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_delete" ON public.enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = enrollments.student_id AND am.user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. sessions 정책
-- =====================================================
DROP POLICY IF EXISTS "sessions_select"  ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert"  ON public.sessions;
DROP POLICY IF EXISTS "sessions_update"  ON public.sessions;
DROP POLICY IF EXISTS "sessions_delete"  ON public.sessions;

CREATE POLICY "sessions_select" ON public.sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = sessions.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "sessions_insert" ON public.sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = sessions.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "sessions_update" ON public.sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = sessions.academy_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "sessions_delete" ON public.sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = sessions.academy_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. session_enrollments 정책 (session → academy 조인)
-- =====================================================
DROP POLICY IF EXISTS "session_enrollments_select"  ON public.session_enrollments;
DROP POLICY IF EXISTS "session_enrollments_insert"  ON public.session_enrollments;
DROP POLICY IF EXISTS "session_enrollments_delete"  ON public.session_enrollments;

CREATE POLICY "session_enrollments_select" ON public.session_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = session_enrollments.session_id AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "session_enrollments_insert" ON public.session_enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = session_enrollments.session_id AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "session_enrollments_delete" ON public.session_enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.academy_members am ON am.academy_id = s.academy_id
      WHERE s.id = session_enrollments.session_id AND am.user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. 마이그레이션 로그
-- =====================================================
INSERT INTO public.migration_log (migration_name, executed_at, status, description)
VALUES (
  '017_rls_academy_based',
  NOW(),
  'completed',
  'Academy 기반 RLS 정책 설정: 모든 신규 테이블 RLS 활성화, 무한재귀 방지, 2A-1 범위(academy_members INSERT/DELETE 비활성화)'
)
ON CONFLICT (migration_name) DO NOTHING;
