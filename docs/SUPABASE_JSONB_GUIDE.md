# Supabase JSONB 데이터베이스 설정 가이드

## 🎯 완료된 작업

### ✅ 1. 데이터베이스 스키마 생성

- `frontend/supabase-schema.sql` 파일 생성
- JSONB 기반 유연한 데이터 구조 설계
- Row Level Security (RLS) 설정
- 인덱스 최적화 설정

### ✅ 2. API 함수 업데이트

- `api/students/add.ts` - JSONB 구조로 학생 추가
- `api/students/list.ts` - JSONB 구조로 학생 목록 조회
- `api/students/delete.ts` - JSONB 구조로 학생 삭제
- TypeScript 타입 안정성 확보

### ✅ 3. 타입 정의 업데이트

- `src/types/apiTypes.ts` - JSONB 구조에 맞는 타입 정의
- `src/utils/apiClient.ts` - API 클라이언트 업데이트

## 🚀 다음 단계: Supabase 데이터베이스 설정

### 1. Supabase 대시보드에서 테이블 생성

1. **Supabase 대시보드 접속**
   - URL: https://supabase.com/dashboard/project/kcyqftasdxtqslrhbctv
   - SQL Editor 메뉴 선택

2. **스키마 실행**

   ```sql
   -- frontend/supabase-schema.sql 파일의 내용을 복사하여 실행
   ```

3. **테이블 확인**
   - Table Editor에서 `users`와 `user_data` 테이블이 생성되었는지 확인

### 2. 환경 변수 설정

1. **Supabase 프로젝트 정보 확인**
   - Settings > API 메뉴에서 확인
   - Project URL과 API Keys 복사

2. **로컬 환경 변수 설정**

   ```bash
   # frontend/.env.local 파일 생성
   NEXT_PUBLIC_SUPABASE_URL=https://kcyqftasdxtqslrhbctv.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Vercel 환경 변수 설정**
   - Vercel 대시보드 > 프로젝트 > Settings > Environment Variables
   - 위 변수들을 Production, Preview, Development 환경에 모두 설정

### 3. 연결 테스트

1. **API 테스트**

   ```bash
   # 로컬에서 테스트
   npm run dev

   # API 엔드포인트 테스트
   curl -X POST http://localhost:3000/api/students/add \
     -H "Content-Type: application/json" \
     -d '{"studentName": "테스트 학생", "userId": "test-user-123"}'
   ```

2. **데이터베이스 확인**
   - Supabase Table Editor에서 `user_data` 테이블 확인
   - JSONB 데이터가 올바르게 저장되었는지 확인

## 📊 JSONB 데이터 구조

### 기본 구조

```json
{
  "students": [
    {
      "id": "uuid-1",
      "name": "김철수",
      "grade": "중2",
      "phone": "010-1234-5678",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "subjects": [
    {
      "id": "uuid-2",
      "name": "중등수학",
      "color": "#3B82F6",
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
    "default_subject_color": "#3B82F6"
  },
  "version": "1.0"
}
```

## 🔧 유용한 JSONB 쿼리

### 특정 학생의 모든 수업 조회

```sql
SELECT jsonb_path_query_array(
  data,
  '$.sessions[*] ? (@.student_ids[*] == "uuid-1")'
) as student_sessions
FROM user_data WHERE user_id = $1;
```

### 특정 요일의 모든 수업 조회

```sql
SELECT jsonb_path_query_array(
  data,
  '$.sessions[*] ? (@.day_of_week == 1)'
) as monday_sessions
FROM user_data WHERE user_id = $1;
```

### 특정 시간대의 수업 조회

```sql
SELECT jsonb_path_query_array(
  data,
  '$.sessions[*] ? (@.start_time == "14:00")'
) as afternoon_sessions
FROM user_data WHERE user_id = $1;
```

## 🎯 장점

### 1. **유연성**

- 새로운 필드 추가가 매우 쉬움
- 스키마 변경 비용 최소화
- 빠른 프로토타이핑 가능

### 2. **성능**

- 적절한 인덱스로 빠른 조회
- JSONB 타입의 효율적인 저장
- 복잡한 쿼리 패턴 지원

### 3. **확장성**

- 사용자별 데이터 격리
- 다중 사용자 지원
- 향후 기능 확장 용이

## ⚠️ 주의사항

1. **데이터 무결성**: JSONB 구조 검증을 위한 CHECK 제약 조건 설정
2. **인덱스**: 자주 사용되는 쿼리 패턴에 맞는 인덱스 생성
3. **보안**: RLS 정책으로 사용자별 데이터 격리
4. **백업**: 정기적인 데이터 백업 권장

## 🚀 다음 단계

1. **Supabase 데이터베이스 설정 완료**
2. **환경 변수 설정**
3. **API 연결 테스트**
4. **프론트엔드 localStorage에서 Supabase로 마이그레이션**
5. **과목 및 세션 API 구현**
6. **Vercel 배포 테스트**

이제 Supabase 대시보드에서 스키마를 실행하고 환경 변수를 설정하면 JSONB 기반 데이터베이스가 준비됩니다!
