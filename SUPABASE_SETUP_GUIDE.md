# Supabase 연결 테스트를 위한 환경 변수 설정

## 1. Supabase 대시보드에서 API 키 확인

1. https://supabase.com/dashboard/project/kcyqftasdxtqslrhbctv 접속
2. Settings > API 메뉴 클릭
3. 다음 키들을 복사:
   - Project URL: https://kcyqftasdxtqslrhbctv.supabase.co
   - anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (긴 문자열)

## 2. .env.local 파일 생성

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```bash
# Supabase 설정 (Next.js 방식)
NEXT_PUBLIC_SUPABASE_URL=https://kcyqftasdxtqslrhbctv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...실제키여기에
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...실제키여기에
```

## 3. 개발 서버 재시작

환경 변수 설정 후 개발 서버를 재시작해야 합니다:

```bash
# 개발 서버 중지
pkill -f "next dev"

# 개발 서버 재시작
npm run dev
```

## 4. 테스트

1. http://localhost:3000 접속
2. 로그인 버튼 클릭
3. Google로 로그인
4. 로그인 상태 확인

## 5. 브라우저 콘솔에서 확인

```javascript
// 환경 변수 확인
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "Supabase Key:",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "설정됨" : "설정되지 않음"
);

// 로그인 상태 확인
window.supabase.auth.getUser().then(({ data: { user } }) => {
  console.log("현재 사용자:", user);
});
```

## ⚠️ 주의사항

1. **실제 API 키를 사용해야 합니다** - 현재는 플레이스홀더 값이 설정되어 있음
2. **`.env.local` 파일은 Git에 커밋하지 마세요**
3. **환경 변수 설정 후 반드시 개발 서버를 재시작하세요**

