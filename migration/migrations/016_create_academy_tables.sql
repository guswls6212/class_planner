-- Migration: 016_create_academy_tables.sql
-- 날짜: 2026-04-11
-- 설명: Academy 기반 멀티테넌트 정규화 스키마 생성
--   - academies, academy_members: 학원/멤버 관계
--   - students, subjects, enrollments, sessions, session_enrollments: 정규화 비즈니스 데이터
-- 참조: docs/adr/002-academy-multitenant-architecture.md, Phase 2A-1 계획

-- =====================================================
-- 1. academies 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.academies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. academy_members 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.academy_members (
  academy_id  UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (academy_id, user_id)
);

-- =====================================================
-- 3. students 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  gender      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. subjects 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. enrollments 테이블 (학생-과목 수강 관계)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, subject_id)
);

-- =====================================================
-- 6. sessions 테이블 (시간표 수업 블록)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  weekday     INT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  starts_at   TIME NOT NULL,
  ends_at     TIME NOT NULL,
  room        TEXT DEFAULT '',
  y_position  INT DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 7. session_enrollments 테이블 (수업 블록-수강관계 연결)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.session_enrollments (
  session_id    UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, enrollment_id)
);

-- =====================================================
-- 8. 인덱스 생성
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_academy_members_user_id     ON public.academy_members(user_id);
CREATE INDEX IF NOT EXISTS idx_students_academy_id         ON public.students(academy_id);
CREATE INDEX IF NOT EXISTS idx_subjects_academy_id         ON public.subjects(academy_id);
CREATE INDEX IF NOT EXISTS idx_sessions_academy_id         ON public.sessions(academy_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id      ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject_id      ON public.enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_session_enrollments_sess    ON public.session_enrollments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_enrollments_enroll  ON public.session_enrollments(enrollment_id);

-- =====================================================
-- 9. updated_at 자동 갱신 트리거 (함수는 015에서 이미 생성됨)
-- =====================================================
CREATE TRIGGER update_academies_updated_at
  BEFORE UPDATE ON public.academies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. 마이그레이션 로그
-- =====================================================
INSERT INTO public.migration_log (migration_name, executed_at, status, description)
VALUES (
  '016_create_academy_tables',
  NOW(),
  'completed',
  'Academy 기반 멀티테넌트 정규화 스키마 생성: academies, academy_members, students, subjects, enrollments, sessions, session_enrollments'
)
ON CONFLICT (migration_name) DO NOTHING;
