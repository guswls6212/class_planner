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


