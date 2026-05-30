-- 043_drop_teachers_unique_name.sql
--
-- teachers 테이블의 (academy_id, name) UNIQUE 제약 제거.
--
-- 배경:
--   UAT 2026-05-10 결정으로 강사 동명이인 등록을 허용 (이름+이메일+전화 모두
--   일치 시에만 동일인). TeacherApplicationServiceImpl.addTeacher가 이름+이메일+
--   전화 조합으로 idempotent get-or-create 구현.
--
--   그러나 DB에는 (academy_id, name) UNIQUE 제약이 남아있어, 동명이인 INSERT 시
--   PostgreSQL 23505 violation으로 500 에러 발생 (동기화 10회 retry 모두 실패).
--   본 마이그레이션으로 정책-스키마 불일치를 해소하고, students/subjects의 정책과
--   일관성을 회복한다 (둘 다 unique 없음).
--
-- 검증:
--   1) 같은 academy 내 동일 이름 강사 INSERT 가능 (이메일/전화로 식별)
--   2) 진짜 중복(이름+이메일+전화 모두 일치)은 application service의 idempotent
--      get-or-create가 차단

ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_academy_id_name_key;
