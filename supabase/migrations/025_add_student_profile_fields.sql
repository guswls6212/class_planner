-- Add student profile fields: grade, school, phone
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
