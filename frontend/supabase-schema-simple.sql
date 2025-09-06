-- =============================================
-- 학원시간표 웹앱 Supabase 데이터베이스 스키마 (간소화 버전)
-- JSONB 기반 유연한 구조 (인증 없이 작동)
-- =============================================

-- 1. 사용자 데이터 테이블 (JSONB 기반) - 인증 없이 작동
CREATE TABLE IF NOT EXISTS user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- UUID 대신 TEXT로 변경하여 유연성 확보
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Row Level Security 비활성화 (인증 없이 작동)
ALTER TABLE user_data DISABLE ROW LEVEL SECURITY;

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_gin ON user_data USING GIN (data);

-- 4. JSONB 구조 검증을 위한 CHECK 제약
ALTER TABLE user_data 
ADD CONSTRAINT valid_jsonb_structure 
CHECK (jsonb_typeof(data) = 'object');

-- 5. 업데이트 시간 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. 트리거 설정
CREATE TRIGGER update_user_data_updated_at 
  BEFORE UPDATE ON user_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- JSONB 데이터 구조 가이드
-- =============================================

/*
JSONB 데이터 구조 예시:

{
  "students": [
    {
      "id": "uuid-1",
      "name": "김철수",
      "grade": "중2",
      "phone": "010-1234-5678",
      "parent_contact": "010-9876-5432",
      "notes": "수학에 약함",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "subjects": [
    {
      "id": "uuid-2", 
      "name": "중등수학",
      "color": "#3B82F6",
      "description": "중학교 2학년 수학",
      "textbook": "수학의 정석",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "sessions": [
    {
      "id": "uuid-3",
      "subject_id": "uuid-2",
      "student_ids": ["uuid-1"],
      "start_time": "14:00",
      "end_time": "15:00", 
      "day_of_week": 1,
      "room": "A101",
      "notes": "개별 수업",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "settings": {
    "timezone": "Asia/Seoul",
    "working_hours": {
      "start": "09:00",
      "end": "22:00"
    },
    "default_subject_color": "#3B82F6",
    "panel_position": {
      "x": 100,
      "y": 100
    }
  },
  "version": "1.0"
}

유용한 JSONB 쿼리 예시:

-- 특정 학생의 모든 수업 조회
SELECT jsonb_path_query_array(
  data, 
  '$.sessions[*] ? (@.student_ids[*] == "uuid-1")'
) as student_sessions
FROM user_data WHERE user_id = $1;

-- 특정 요일의 모든 수업 조회
SELECT jsonb_path_query_array(
  data, 
  '$.sessions[*] ? (@.day_of_week == 1)'
) as monday_sessions
FROM user_data WHERE user_id = $1;

-- 특정 시간대의 수업 조회
SELECT jsonb_path_query_array(
  data, 
  '$.sessions[*] ? (@.start_time == "14:00")'
) as afternoon_sessions
FROM user_data WHERE user_id = $1;
*/
