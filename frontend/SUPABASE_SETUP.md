# Supabase 환경 변수 설정 가이드

## 📋 필요한 환경 변수

### 1. Supabase 프로젝트 정보 확인

- Supabase 대시보드: https://supabase.com/dashboard/project/kcyqftasdxtqslrhbctv
- Settings > API 메뉴에서 확인 가능

### 2. 환경 변수 목록

```bash
# Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_URL=https://kcyqftasdxtqslrhbctv.supabase.co

# Supabase Anon Key (공개 키)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Service Role Key (서버사이드용, 비밀키)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 🚀 설정 방법

### 1. 로컬 개발 환경

```bash
# frontend/.env.local 파일 생성
cp .env.example .env.local

# 실제 값으로 교체
NEXT_PUBLIC_SUPABASE_URL=https://kcyqftasdxtqslrhbctv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=실제_anon_key
SUPABASE_SERVICE_ROLE_KEY=실제_service_role_key
```

### 2. Vercel 배포 환경

1. Vercel 대시보드 접속
2. 프로젝트 선택 > Settings > Environment Variables
3. 다음 변수들을 각각 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Production, Preview, Development 환경 모두 설정

## 🔐 보안 주의사항

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 공개 키 (프론트엔드에서 사용)
- `SUPABASE_SERVICE_ROLE_KEY`: 비밀 키 (서버사이드에서만 사용)
- `.env.local` 파일은 절대 Git에 커밋하지 마세요

## ✅ 설정 확인

환경 변수가 올바르게 설정되었는지 확인:

```bash
# 로컬에서 확인
npm run dev

# 브라우저 콘솔에서 확인
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```
