-- 033_invite_teacher_link.sql
-- Adds teacher_id FK to invite_tokens (required for member invites)
-- Adds UNIQUE constraint so each user links to at most one teacher per academy

-- Add teacher_id column to invite_tokens
ALTER TABLE public.invite_tokens
  ADD COLUMN IF NOT EXISTS teacher_id UUID NULL REFERENCES public.teachers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invite_tokens_teacher_id
  ON public.invite_tokens(teacher_id);

-- member invites MUST have teacher_id; admin invites may be NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_invite_member_requires_teacher'
  ) THEN
    ALTER TABLE public.invite_tokens
      ADD CONSTRAINT chk_invite_member_requires_teacher
      CHECK (role = 'admin' OR (role = 'member' AND teacher_id IS NOT NULL));
  END IF;
END $$;

-- Each user can be linked to at most one teacher per academy
CREATE UNIQUE INDEX IF NOT EXISTS uniq_teachers_academy_user
  ON public.teachers(academy_id, user_id)
  WHERE user_id IS NOT NULL;
