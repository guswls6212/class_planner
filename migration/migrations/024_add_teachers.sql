-- Migration: 024_add_teachers.sql
-- Description: 강사(Teacher) 테이블 생성 + sessions.teacher_id FK 추가

-- 1. teachers 테이블 생성
CREATE TABLE IF NOT EXISTS public.teachers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(academy_id, name)
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_teachers_academy_id ON public.teachers(academy_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);

-- 3. RLS 활성화
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 academy 멤버 전체 조회 가능
CREATE POLICY "teachers_select_by_academy_members"
  ON public.teachers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
    )
  );

-- INSERT: owner/admin만 생성 가능
CREATE POLICY "teachers_insert_by_academy_admins"
  ON public.teachers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- UPDATE: owner/admin만 수정 가능
CREATE POLICY "teachers_update_by_academy_admins"
  ON public.teachers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE: owner/admin만 삭제 가능
CREATE POLICY "teachers_delete_by_academy_admins"
  ON public.teachers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- 4. sessions 테이블에 teacher_id FK 추가
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON public.sessions(teacher_id);
