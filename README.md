# Class Planner

개발 환경 실행
- 프론트: `cd frontend && npm run dev`
- 백엔드: `cd backend && npm run dev`

환경변수(.env)
- backend/.env: `PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD, PORT`
- Supabase 사용 시: `SUPABASE_URL, SUPABASE_ANON_KEY` 추가 예정

데이터베이스 스키마 초안은 `backend/sql/schema.sql` 참고


## 🔧 환경 변수 설정

### 로컬 개발 환경 설정

1. **환경 변수 파일 생성**:
   ```bash
   cd frontend
   npm run setup-env
   ```

2. **Supabase 프로젝트 정보 입력**:
   - Supabase 대시보드 → Settings → API
   - Project URL과 anon key를 복사하여 `.env.local`에 입력

3. **개발 서버 실행**:
   ```bash
   npm run dev:setup
   ```

### 브랜치 전환 시 주의사항

- `.env.local` 파일은 Git에서 제외되므로 브랜치 전환 시 사라집니다
- 새로운 브랜치에서 작업할 때마다 `npm run setup-env` 실행
- 또는 `npm run dev:setup`으로 환경 설정과 개발 서버를 한 번에 실행



## 🔧 환경 변수 설정

### 전체 환경 변수 목록

| 플랫폼 | 변수명 | 용도 | 공개 여부 |
|--------|--------|------|-----------|
| **GitHub Pages** | `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 공개 |
| **GitHub Pages** | `VITE_SUPABASE_ANON_KEY` | Supabase 공개 키 | 공개 |
| **Vercel** | `SUPABASE_URL` | Supabase 프로젝트 URL | 비공개 |
| **Vercel** | `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 | 비공개 |

### 빠른 설정

```bash
# 1. 환경 변수 파일 생성
cd frontend
npm run setup-env

# 2. Supabase 프로젝트 정보 입력
# .env.local 파일에 실제 값으로 교체

# 3. 개발 서버 실행
npm run dev:setup
```

### 상세 설정 가이드

자세한 설정 방법은 [ENVIRONMENT_VARIABLES_GUIDE.md](frontend/ENVIRONMENT_VARIABLES_GUIDE.md)를 참고하세요.


## 🔧 자동 환경 변수 설정

### Git Hooks 자동 설치

프로젝트를 클론하거나 `npm install` 실행 시 자동으로 Git hooks가 설치됩니다.

```bash
# 자동 설치 (npm install 시 실행됨)
npm install

# 수동 설치
npm run install-hooks
```

### 자동 생성되는 상황

다음 작업 시 자동으로 `.env.local` 파일이 생성됩니다:

- `git checkout <branch>` - 브랜치 전환
- `git pull` - 원격 저장소에서 코드 가져오기
- `git merge` - 브랜치 병합

### 수동 설정

```bash
# 환경 변수 파일 생성
cd frontend
npm run setup-env

# 환경 설정 + 개발 서버 실행
npm run dev:setup
```

