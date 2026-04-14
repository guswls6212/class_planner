# 환경 설정 가이드 (Next.js + Supabase)

## 📋 개요

이 가이드는 **Next.js + Supabase** 환경에서 Class Planner 프로젝트를 설정하는 방법을 설명합니다.

## 🔑 Supabase API 키 확인 방법

### 1. Supabase 대시보드 접속

```
https://supabase.com/dashboard/project/your-project-id
```

### 2. API 키 확인

1. **왼쪽 메뉴에서 "Settings" 클릭** (⚙️ 아이콘)
2. **"API" 메뉴 클릭**
3. **다음 키들을 복사:**
   - **Project URL**: `https://your-project-id.supabase.co`
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
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # 테스트용 계정 정보 (선택사항)
   TEST_EMAIL=your-test-email@gmail.com
   TEST_PASSWORD=your-test-password
   ```

### 프로덕션 배포 환경 (.env.production)

> **배포 플랫폼: AWS Lightsail + Docker** (Vercel이 아님)
> 상세: [docs/deployment-guide.md](./deployment-guide.md)

1. **서버에 `.env.production` 파일 생성**

   ```bash
   # Lightsail 서버에서 (프로젝트 루트)
   cat > .env.production << 'EOF'
   NEXT_PUBLIC_SUPABASE_URL=https://iqzcnyujkagwgshbecpg.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   EOF
   ```

2. **Docker Compose에서 자동 주입** (`docker-compose.yml`의 `env_file: .env.production`)

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
3. **.env.production 파일은 서버에만 보관 (Git에 커밋하지 마세요)**

## ✅ 설정 확인

### 로컬에서 확인

```bash
# 개발 서버 실행
npm run dev

# 브라우저 콘솔에서 확인
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### Lightsail 서버에서 확인

```bash
# 서버 접속
ssh class-planner

# 환경 변수 파일 확인
cat /app/.env.production | grep NEXT_PUBLIC_SUPABASE_URL
```

## 🚀 다음 단계

환경 변수 설정 완료 후:

1. **로컬 개발 서버 실행**

   ```bash
   npm run dev
   ```

2. **테스트 실행**

   ```bash
   npm run check:quick   # tsc + unit (빠른 피드백)
   npm run check         # tsc + unit + build
   ```

3. **프로덕션 배포**

   ```bash
   bash scripts/deploy.sh
   # 또는 GitHub Actions deploy.yml 자동 트리거 (main 브랜치 push)
   ```

4. **프로덕션 환경 확인**: https://class-planner.info365.studio

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

- [deployment-guide.md](./deployment-guide.md) — Lightsail 전체 배포 절차
- [ARCHITECTURE.md](../ARCHITECTURE.md) — 배포 아키텍처 섹션
- [Next.js 환경 변수 문서](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase 클라이언트 설정](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
