-- 1. Teacher 프로필 필드 추가
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS role TEXT
  CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. 강사-과목 M:N 조인 테이블
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON public.teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON public.teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_academy ON public.teacher_subjects(academy_id);

-- RLS (teachers 테이블과 동일 정책: academy_members owner/admin만 쓰기)
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_subjects_select" ON public.teacher_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = teacher_subjects.academy_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "teacher_subjects_insert" ON public.teacher_subjects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = teacher_subjects.academy_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "teacher_subjects_delete" ON public.teacher_subjects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = teacher_subjects.academy_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
