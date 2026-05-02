-- migration/migrations/039_sessions_notes.sql
-- Session note 2-tier (M3 from spec):
-- public_description: 학생/학부모 share page에 노출, owner/admin만 편집
-- internal_note: 운영자+강사만 봄, 강사도 편집 가능
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS public_description text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS internal_note text;
