# Migration 관리 가이드

## 📋 개요

이 문서는 Supabase 데이터베이스의 Migration 관리 방법을 설명합니다.

## 🗂️ Migration 파일 구조

```
migrations/
├── 000_migration_system_setup.sql          # Migration 시스템 설정
├── 001_supabase_cross_browser_sync_setup.sql # 크로스 브라우저 동기화 설정
└── [추가 migration 파일들...]
```

## 🚀 Migration 실행 방법

### 1. 환경변수 설정

**방법 1: .env.local 파일 사용 (권장)**

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 설정 (Next.js 방식)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Migration용 Supabase 설정 (관리자 권한 필요)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 자동화 테스트용 계정 정보
TEST_EMAIL=your-test-email@gmail.com
TEST_PASSWORD=your-test-password
```

**방법 2: 환경변수 직접 설정**

```bash
# Supabase 설정
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
```

### 2. Migration 실행

```bash
# Migration 시스템 설정 (최초 1회)
./run-migration.sh 000_migration_system_setup.sql

# 크로스 브라우저 동기화 설정
./run-migration.sh 001_supabase_cross_browser_sync_setup.sql
```

### 3. Migration 상태 확인

```sql
-- Supabase SQL Editor에서 실행
SELECT * FROM public.get_migration_status();
```

## 📝 새로운 Migration 생성 방법

### 1. Migration 파일 생성

```bash
# 새로운 migration 파일 생성
touch migrations/002_your_migration_name.sql
```

### 2. Migration 파일 작성

```sql
-- Migration: 002_your_migration_name.sql
-- Description: Migration 설명
-- Created: 2025-01-06
-- Author: Class Planner Team

-- ==============================================
-- Migration 내용
-- ==============================================

-- SQL 명령어들...

-- ==============================================
-- Migration 완료 로그
-- ==============================================

-- Migration 실행 완료 시 다음 정보를 기록 (한국시간 기준)
INSERT INTO public.migration_log (migration_name, executed_at, status, description)
VALUES (
    '002_your_migration_name',
    NOW() AT TIME ZONE 'Asia/Seoul',
    'completed',
    'Migration 설명'
) ON CONFLICT (migration_name) DO NOTHING;
```

### 3. Migration 실행

```bash
./run-migration.sh 002_your_migration_name.sql
```

### 4. 자동 로그 기록

**✅ 모든 Migration 파일에는 자동 로그 기록이 포함됩니다:**

- Migration 실행 시 자동으로 `migration_log` 테이블에 기록
- 중복 실행 방지 (`ON CONFLICT DO NOTHING`)
- 실행 시간, 상태, 설명 자동 기록
- 일관된 Migration 관리 가능
- **한국시간 지원**: 모든 시간이 한국시간(KST)으로 표시

## 🕐 시간대 설정

### **한국시간으로 조회**

```sql
-- Migration 상태를 한국시간으로 조회
SELECT * FROM public.get_migration_status();

-- 직접 쿼리로 한국시간 조회
SELECT
    migration_name,
    status,
    executed_at AT TIME ZONE 'Asia/Seoul' AS executed_at_korea,
    description
FROM public.migration_log
ORDER BY executed_at DESC;
```

### **시간대 변환**

```sql
-- UTC → 한국시간 변환
SELECT NOW() AT TIME ZONE 'Asia/Seoul' AS korea_time;

-- 한국시간 → UTC 변환
SELECT '2025-01-06 15:30:00'::timestamp AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC' AS utc_time;
```

## 🔄 Migration 롤백 방법

### 1. 롤백 SQL 작성

Migration 파일에 롤백 SQL을 포함:

```sql
-- Migration 실행 시 롤백 SQL도 함께 기록
INSERT INTO public.migration_log (migration_name, executed_at, status, description, rollback_sql)
VALUES (
    '002_your_migration_name',
    NOW(),
    'completed',
    'Migration 설명',
    'DROP TABLE IF EXISTS your_table;'  -- 롤백 SQL
) ON CONFLICT DO NOTHING;
```

### 2. 롤백 실행

```sql
-- Supabase SQL Editor에서 실행
SELECT public.rollback_migration('002_your_migration_name');
```

## 📊 Migration 관리 명령어

### Migration 상태 확인

```sql
-- 모든 migration 상태 확인
SELECT * FROM public.get_migration_status();

-- 특정 migration 상태 확인
SELECT * FROM public.migration_log WHERE migration_name = '001_supabase_cross_browser_sync_setup';
```

### Migration 로그 확인

```sql
-- Migration 실행 로그 확인
SELECT
    migration_name,
    status,
    executed_at,
    description
FROM public.migration_log
ORDER BY executed_at DESC;
```

## ⚠️ 주의사항

1. **백업**: Migration 실행 전에 데이터베이스 백업을 권장합니다.
2. **테스트**: 프로덕션 환경에 적용하기 전에 개발 환경에서 테스트합니다.
3. **순서**: Migration은 파일명 순서대로 실행되어야 합니다.
4. **중복 실행**: 동일한 migration은 중복 실행되지 않습니다.

## 🔧 문제 해결

### Migration 실행 실패 시

1. **로그 확인**: `migration_log` 테이블에서 실패 원인 확인
2. **수동 실행**: Supabase SQL Editor에서 직접 SQL 실행
3. **롤백**: 문제가 있는 migration을 롤백

### 환경변수 문제 시

```bash
# 환경변수 확인
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 환경변수 설정
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
```

## 📚 참고 자료

- [Supabase Migration 가이드](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL Migration 모범 사례](https://www.postgresql.org/docs/current/ddl-alter.html)
