-- Migration: 018_migrate_jsonb_to_normalized.sql
-- 날짜: 2026-04-11
-- 설명: 기존 5명의 user_data JSONB 데이터를 정규화 테이블로 마이그레이션
--   - 각 사용자마다 "내 학원" 생성 + owner 등록
--   - students, subjects, enrollments, sessions, session_enrollments INSERT
--   - 기존 UUID 유지 (localStorage 호환성 보장)
--   - 비-UUID ID(default-1, default-math 등)는 md5(user_id:original_id)로 결정론적 UUID 생성
--   - user_data 테이블은 드롭하지 않음 (019에서 별도 제거)
-- 참조: Phase 2A-1 계획, migration/backups/user_data_20260411-2300.json

DO $$
DECLARE
  user_row           RECORD;
  new_academy_id     UUID;
  student_item       JSONB;
  subject_item       JSONB;
  enrollment_item    JSONB;
  session_item       JSONB;
  enrollment_id_str  TEXT;
  migrated_count     INT := 0;
  skipped_count      INT := 0;
  -- ID 매핑: 비-UUID string id → deterministic UUID
  id_map             JSONB;
  orig_id            TEXT;
  orig_ref           TEXT;
  mapped_uuid        UUID;
  student_uuid       UUID;
  subject_uuid       UUID;
  enrollment_uuid    UUID;
  session_uuid       UUID;
BEGIN

  FOR user_row IN SELECT user_id, data FROM public.user_data LOOP

    -- 멱등성: 이미 마이그레이션된 사용자는 스킵
    IF EXISTS (
      SELECT 1 FROM public.academy_members WHERE user_id = user_row.user_id
    ) THEN
      skipped_count := skipped_count + 1;
      RAISE NOTICE 'user_id % 이미 마이그레이션됨, 스킵', user_row.user_id;
      CONTINUE;
    END IF;

    id_map := '{}'::jsonb;

    -- 1. "내 학원" 생성
    INSERT INTO public.academies (name, created_by)
    VALUES ('내 학원', user_row.user_id)
    RETURNING id INTO new_academy_id;

    -- 2. owner 등록
    INSERT INTO public.academy_members (academy_id, user_id, role)
    VALUES (new_academy_id, user_row.user_id, 'owner');

    -- 3. students (모두 유효한 UUID, 매핑 필요 없음)
    FOR student_item IN
      SELECT * FROM jsonb_array_elements(COALESCE(user_row.data->'students', '[]'::jsonb))
    LOOP
      orig_id := student_item ->> 'id';
      IF orig_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        mapped_uuid := orig_id::UUID;
      ELSE
        mapped_uuid := (regexp_replace(
          md5(user_row.user_id::text || ':' || orig_id),
          '([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})',
          '\1-\2-\3-\4-\5'
        ))::uuid;
      END IF;
      id_map := jsonb_set(id_map, ARRAY[orig_id], to_jsonb(mapped_uuid::text));

      INSERT INTO public.students (id, academy_id, name, gender)
      VALUES (mapped_uuid, new_academy_id, student_item->>'name', student_item->>'gender')
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    -- 4. subjects (default-1, default-math 등 비UUID ID 포함 → 결정론적 UUID로 변환)
    FOR subject_item IN
      SELECT * FROM jsonb_array_elements(COALESCE(user_row.data->'subjects', '[]'::jsonb))
    LOOP
      orig_id := subject_item ->> 'id';
      IF orig_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        mapped_uuid := orig_id::UUID;
      ELSE
        mapped_uuid := (regexp_replace(
          md5(user_row.user_id::text || ':' || orig_id),
          '([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})',
          '\1-\2-\3-\4-\5'
        ))::uuid;
      END IF;
      id_map := jsonb_set(id_map, ARRAY[orig_id], to_jsonb(mapped_uuid::text));

      INSERT INTO public.subjects (id, academy_id, name, color)
      VALUES (mapped_uuid, new_academy_id, subject_item->>'name', subject_item->>'color')
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    -- 5. enrollments (studentId: 항상 UUID, subjectId: id_map 통해 해석)
    FOR enrollment_item IN
      SELECT * FROM jsonb_array_elements(COALESCE(user_row.data->'enrollments', '[]'::jsonb))
    LOOP
      orig_id  := enrollment_item ->> 'id';
      orig_ref := enrollment_item ->> 'studentId';

      IF orig_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        enrollment_uuid := orig_id::UUID;
      ELSE
        enrollment_uuid := (regexp_replace(
          md5(user_row.user_id::text || ':' || orig_id),
          '([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})',
          '\1-\2-\3-\4-\5'
        ))::uuid;
      END IF;
      id_map := jsonb_set(id_map, ARRAY[orig_id], to_jsonb(enrollment_uuid::text));

      IF orig_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        student_uuid := orig_ref::UUID;
      ELSE
        student_uuid := (id_map ->> orig_ref)::UUID;
      END IF;

      orig_ref := enrollment_item ->> 'subjectId';
      IF orig_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        subject_uuid := orig_ref::UUID;
      ELSE
        subject_uuid := (id_map ->> orig_ref)::UUID;
      END IF;

      INSERT INTO public.enrollments (id, student_id, subject_id)
      VALUES (enrollment_uuid, student_uuid, subject_uuid)
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    -- 6. sessions + session_enrollments (subjectId: id_map 통해 해석)
    FOR session_item IN
      SELECT * FROM jsonb_array_elements(COALESCE(user_row.data->'sessions', '[]'::jsonb))
    LOOP
      orig_id  := session_item ->> 'id';
      orig_ref := session_item ->> 'subjectId';

      IF orig_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        session_uuid := orig_id::UUID;
      ELSE
        session_uuid := (regexp_replace(
          md5(user_row.user_id::text || ':' || orig_id),
          '([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})',
          '\1-\2-\3-\4-\5'
        ))::uuid;
      END IF;

      IF orig_ref IS NULL THEN
        subject_uuid := NULL;
      ELSIF orig_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        subject_uuid := orig_ref::UUID;
      ELSE
        subject_uuid := (id_map ->> orig_ref)::UUID;
      END IF;

      -- NOTE: sessions 테이블에 subject_id 컬럼은 없음. subjectId는 session_enrollments를 통해 과목 연결.
      -- sessions 테이블은 순수 시간/장소 정보만 저장.
      INSERT INTO public.sessions (id, academy_id, weekday, starts_at, ends_at, room, y_position)
      VALUES (
        session_uuid,
        new_academy_id,
        (session_item ->> 'weekday')::INT,
        (session_item ->> 'startsAt')::TIME,
        (session_item ->> 'endsAt')::TIME,
        COALESCE(session_item ->> 'room', ''),
        COALESCE((session_item ->> 'yPosition')::INT, 1)
      )
      ON CONFLICT (id) DO NOTHING;

      -- session_enrollments: enrollmentIds 배열 순회
      FOR enrollment_id_str IN
        SELECT jsonb_array_elements_text(COALESCE(session_item->'enrollmentIds', '[]'::jsonb))
      LOOP
        IF enrollment_id_str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          enrollment_uuid := enrollment_id_str::UUID;
        ELSE
          enrollment_uuid := (id_map ->> enrollment_id_str)::UUID;
        END IF;

        IF enrollment_uuid IS NOT NULL THEN
          INSERT INTO public.session_enrollments (session_id, enrollment_id)
          VALUES (session_uuid, enrollment_uuid)
          ON CONFLICT (session_id, enrollment_id) DO NOTHING;
        END IF;
      END LOOP;

    END LOOP;

    migrated_count := migrated_count + 1;
    RAISE NOTICE 'user_id % → academy_id % 마이그레이션 완료', user_row.user_id, new_academy_id;

  END LOOP;

  RAISE NOTICE '마이그레이션 완료: %명 처리, %명 스킵', migrated_count, skipped_count;

END $$;

-- =====================================================
-- 마이그레이션 로그
-- =====================================================
INSERT INTO public.migration_log (migration_name, executed_at, status, description)
VALUES (
  '018_migrate_jsonb_to_normalized',
  NOW(),
  'completed',
  'user_data JSONB → 정규화 테이블 마이그레이션: 5명 사용자 각자 학원 생성 + students/subjects/enrollments/sessions 이전, 기존 UUID 유지, 비UUID ID는 md5 결정론적 변환'
)
ON CONFLICT (migration_name) DO NOTHING;

-- =====================================================
-- 검증 쿼리 (적용 완료 후 수동 실행)
-- =====================================================
-- SELECT u.user_id,
--   (SELECT COUNT(*) FROM academy_members am WHERE am.user_id = u.user_id)                         AS academies,
--   jsonb_array_length(COALESCE(u.data->'students','[]'::jsonb))                                   AS jsonb_students,
--   (SELECT COUNT(*) FROM students s JOIN academy_members am ON s.academy_id = am.academy_id WHERE am.user_id = u.user_id) AS norm_students,
--   jsonb_array_length(COALESCE(u.data->'subjects','[]'::jsonb))                                   AS jsonb_subjects,
--   (SELECT COUNT(*) FROM subjects s JOIN academy_members am ON s.academy_id = am.academy_id WHERE am.user_id = u.user_id) AS norm_subjects,
--   jsonb_array_length(COALESCE(u.data->'sessions','[]'::jsonb))                                   AS jsonb_sessions,
--   (SELECT COUNT(*) FROM sessions se JOIN academy_members am ON se.academy_id = am.academy_id WHERE am.user_id = u.user_id) AS norm_sessions,
--   jsonb_array_length(COALESCE(u.data->'enrollments','[]'::jsonb))                                AS jsonb_enrollments,
--   (SELECT COUNT(*) FROM enrollments e JOIN students st ON e.student_id = st.id JOIN academy_members am ON st.academy_id = am.academy_id WHERE am.user_id = u.user_id) AS norm_enrollments
-- FROM public.user_data u ORDER BY u.user_id;
