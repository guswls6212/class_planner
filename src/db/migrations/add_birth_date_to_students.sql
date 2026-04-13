-- Migration: Add birth_date column to students table
-- Apply this in Supabase SQL Editor before deploying
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;
