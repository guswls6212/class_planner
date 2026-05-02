-- migration/migrations/041_academy_slug.sql
ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_academies_slug ON academies (slug);
