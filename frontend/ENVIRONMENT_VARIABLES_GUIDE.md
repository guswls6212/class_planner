# 환경 변수 설정 가이드

## 📋 개요

이 문서는 클래스 플래너 프로젝트에서 사용하는 모든 환경 변수에 대한 설정 가이드입니다.

## 🏗️ 아키텍처별 환경 변수

### 1. GitHub Pages (프론트엔드)

**위치**: GitHub Secrets
**용도**: 브라우저에서 Supabase 클라이언트 초기화

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**설정 방법**:
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. New repository secret 클릭
3. 위 변수들을 추가

### 2. Vercel (백엔드 API)

**위치**: Vercel 대시보드
**용도**: 서버리스 함수에서 Supabase 데이터베이스 접근

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**설정 방법**:
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 위 변수들을 추가

### 3. 로컬 개발 환경

**위치**: `frontend/.env.local`
**용도**: 로컬 개발 서버에서 사용

```bash
# 프론트엔드용
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# 백엔드용 (선택사항)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**설정 방법**:
```bash
cd frontend
npm run setup-env  # .env.local 파일 생성
# 실제 값으로 교체
```

## 🔑 Supabase 키 정보

### Project URL
- **위치**: Supabase 대시보드 → Settings → API → Project URL
- **용도**: Supabase 프로젝트 식별

### Anon Key (공개 키)
- **위치**: Supabase 대시보드 → Settings → API → anon public
- **용도**: 브라우저에서 사용 (공개 가능)
- **권한**: 제한된 읽기/쓰기 권한

### Service Role Key (서비스 키)
- **위치**: Supabase 대시보드 → Settings → API → service_role
- **용도**: 서버에서 사용 (비공개)
- **권한**: 관리자 권한 (모든 작업 가능)
- **⚠️ 주의**: 절대 공개하지 마세요!

## 🚀 설정 순서

### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 가입
2. 새 프로젝트 생성
3. API 키 정보 확인

### 2. GitHub Pages 설정
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가

### 3. Vercel 설정
1. [Vercel](https://vercel.com) 가입
2. GitHub 저장소 연결
3. Environment Variables에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 추가

### 4. 로컬 개발 환경 설정
```bash
cd frontend
npm run setup-env
# .env.local 파일에 실제 값 입력
npm run dev
```

## 🔒 보안 주의사항

### 공개 가능한 변수
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 비공개 변수 (절대 공개 금지)
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID`

## 🛠️ 문제 해결

### 환경 변수가 적용되지 않는 경우
1. **로컬**: `.env.local` 파일 존재 확인
2. **GitHub Pages**: GitHub Secrets 설정 확인
3. **Vercel**: Environment Variables 설정 확인

### 브라우저에서 환경 변수 확인
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### Vercel에서 환경 변수 확인
```javascript
console.log(process.env.SUPABASE_URL);
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY);
```

## 📚 참고 자료

- [Supabase 환경 변수 가이드](https://supabase.com/docs/guides/getting-started/local-development)
- [Vercel 환경 변수 설정](https://vercel.com/docs/projects/environment-variables)
- [GitHub Secrets 설정](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
