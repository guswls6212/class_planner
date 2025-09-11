# Supabase 연결 테스트를 위한 환경 변수 설정 가이드

## 1. Supabase 대시보드에서 API 키 확인

1. https://supabase.com/dashboard/project/kcyqftasdxtqslrhbctv 접속
2. Settings > API 메뉴 클릭
3. 다음 키들을 복사:
   - Project URL: https://kcyqftasdxtqslrhbctv.supabase.co
   - anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (긴 문자열)

## 2. .env.local 파일 수정

```bash
# 실제 API 키로 교체하세요
NEXT_PUBLIC_SUPABASE_URL=https://kcyqftasdxtqslrhbctv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...실제키여기에
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...실제키여기에
```

## 3. 테스트 실행

```bash
# 환경 변수 로드 후 테스트 실행
npm run test:run -- real-supabase.test.ts
```

## 4. 브라우저에서 테스트

1. npm run dev 실행
2. http://localhost:3000 접속
3. 브라우저 개발자 도구 콘솔 열기
4. test-supabase-connection.js 파일 내용 복사하여 실행
5. testDataSync() 함수 실행

## 5. 로그인 테스트

1. 로그인 버튼 클릭
2. Google 또는 Kakao로 로그인
3. 데이터 동기화 모달 확인
4. 학생/과목 추가/삭제 테스트
5. 브라우저 새로고침 후 데이터 유지 확인

