-- sessions: 수업에 참여하는 enrollment ID 배열 (학생-과목 매핑)
-- Local-first 구조에서 localStorage에만 있던 enrollment_ids를 서버에도 저장하여
-- 공유 링크 등 서버 데이터 기반 기능에서 활용 가능하도록 함
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS enrollment_ids UUID[] NOT NULL DEFAULT '{}';
