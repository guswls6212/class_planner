# 환경 설정 가이드 (Next.js + Supabase)

## 📋 개요

이 가이드는 **Next.js + Supabase** 환경에서 Class Planner 프로젝트를 설정하는 방법을 설명합니다.

## 🔑 Supabase API 키 확인 방법

### 1. Supabase 대시보드 접속

```
https://supabase.com/dashboard/project/kcyqftasdxtqslrhbctv
```

### 2. API 키 확인

1. **왼쪽 메뉴에서 "Settings" 클릭** (⚙️ 아이콘)
2. **"API" 메뉴 클릭**
3. **다음 키들을 복사:**
   - **Project URL**: `https://kcyqftasdxtqslrhbctv.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (긴 문자열)
   - **service_role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (긴 문자열)

## 📁 환경 변수 설정

### 로컬 개발 환경 (.env.local)

1. **프로젝트 루트에 .env.local 파일 생성**

   ```bash
   # 프로젝트 루트 디렉토리에서
   touch .env.local
   ```

2. **환경 변수 추가**

   ```bash
   # Supabase 설정 (Next.js 방식)
   NEXT_PUBLIC_SUPABASE_URL=https://kcyqftasdxtqslrhbctv.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # 테스트용 계정 정보 (선택사항)
   TEST_EMAIL=your-test-email@gmail.com
   TEST_PASSWORD=your-test-password
   ```

### Vercel 배포 환경

1. **Vercel 대시보드 접속**

   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택**

   - class-planner 프로젝트 클릭

3. **Settings > Environment Variables**

   - Settings 탭 클릭
   - "Environment Variables" 섹션 찾기

4. **환경 변수 추가 (3개 모두)**

   ```
   Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://kcyqftasdxtqslrhbctv.supabase.co
   Environment: Production, Preview, Development (모두 선택)
   ```

   ```
   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Environment: Production, Preview, Development (모두 선택)
   ```

   ```
   Name: SUPABASE_SERVICE_ROLE_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Environment: Production, Preview, Development (모두 선택)
   ```

## 🔐 키 종류 설명

### **NEXT_PUBLIC_SUPABASE_URL**

- Supabase 프로젝트 URL
- 공개되어도 안전함
- 프론트엔드와 백엔드 모두 사용

### **NEXT_PUBLIC_SUPABASE_ANON_KEY**

- 공개 키 (anon public)
- 프론트엔드에서 사용
- 제한된 권한 (RLS 정책 적용)

### **SUPABASE_SERVICE_ROLE_KEY**

- 비밀 키 (service_role)
- 서버사이드에서만 사용
- 모든 권한 (RLS 정책 우회)

## ⚠️ 보안 주의사항

1. **service_role 키는 절대 프론트엔드에 노출하지 마세요**
2. **.env.local 파일은 Git에 커밋하지 마세요**
3. **Vercel에서 환경 변수 설정 시 모든 환경(Production, Preview, Development)에 설정하세요**

## ✅ 설정 확인

### 로컬에서 확인

```bash
# 개발 서버 실행
npm run dev

# 브라우저 콘솔에서 확인
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### Vercel에서 확인

- Vercel 대시보드 > 프로젝트 > Settings > Environment Variables
- 설정된 변수들이 모두 표시되는지 확인

## 🚀 다음 단계

환경 변수 설정 완료 후:

1. **로컬 개발 서버 실행**

   ```bash
   npm run dev
   ```

2. **테스트 실행**

   ```bash
   npm run test
   npm run test:e2e
   ```

3. **Vercel 배포**

   ```bash
   vercel --prod
   ```

4. **프로덕션 환경 테스트**

## 🔧 Next.js 환경 변수 특징

### NEXT*PUBLIC* 접두사

- `NEXT_PUBLIC_` 접두사가 있는 변수는 클라이언트 사이드에서 접근 가능
- 브라우저에서 `process.env.NEXT_PUBLIC_SUPABASE_URL`로 접근 가능
- 보안에 민감한 정보는 이 접두사를 사용하지 않음

### 서버 사이드 전용 변수

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 사용
- API Routes (`src/app/api/`)에서만 접근 가능
- 클라이언트 사이드에서는 절대 노출되지 않음

## 📚 관련 문서

- [Next.js 환경 변수 문서](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase 클라이언트 설정](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Vercel 환경 변수 설정](https://vercel.com/docs/projects/environment-variables)
