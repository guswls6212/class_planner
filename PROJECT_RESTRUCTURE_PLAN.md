# 프로젝트 구조 재정리 계획

## 🎯 목표

- `class-planner-nextjs` 폴더의 내용을 루트 디렉토리로 이동
- Next.js + Atomic Design + Clean Architecture 구조로 정리
- 불필요한 파일/폴더 삭제
- frontend 폴더의 기능과 디자인 유지

## 📋 작업 단계

### Phase 1: 현재 상태 분석

- [ ] 현재 프로젝트 구조 파악
- [ ] 필요한 파일/폴더 식별
- [ ] 불필요한 파일/폴더 목록 작성

### Phase 2: 백업 및 준비

- [ ] 중요한 파일들 백업
- [ ] 작업 전 현재 상태 기록

### Phase 3: 파일 이동 및 정리

- [ ] `class-planner-nextjs` 내용을 루트로 이동
- [ ] 목표 구조에 맞게 파일 재배치
- [ ] 불필요한 파일/폴더 삭제

### Phase 4: 설정 파일 수정

- [ ] `package.json` 수정
- [ ] `tsconfig.json` 수정
- [ ] `next.config.js` 수정
- [ ] 환경 변수 파일 정리

### Phase 5: 테스트 및 검증

- [ ] 서버 실행 테스트
- [ ] API 라우트 테스트
- [ ] 페이지 렌더링 테스트

## 🗂️ 목표 구조

```
class_planner/
├── .env.local              # 환경 변수
├── .gitignore              # Git 무시 파일
├── next.config.ts          # Next.js 설정
├── package.json            # 프로젝트 의존성
├── tailwind.config.ts      # Tailwind CSS 설정
├── tsconfig.json           # TypeScript 설정
├── public/                 # 정적 파일
│   ├── favicon.ico
│   └── logo.png
└── src/                    # 소스 코드
    ├── app/                # App Router
    │   ├── api/            # API 라우트
    │   │   ├── students/
    │   │   ├── subjects/
    │   │   └── sessions/
    │   ├── students/       # 학생 관리 페이지
    │   ├── subjects/       # 과목 관리 페이지
    │   ├── schedule/       # 스케줄 페이지
    │   ├── manual/         # 매뉴얼 페이지
    │   ├── globals.css     # 전역 스타일
    │   ├── layout.tsx      # 최상위 레이아웃
    │   └── page.tsx        # 홈페이지
    ├── components/         # Atomic Design 컴포넌트
    │   ├── atoms/          # 원자 컴포넌트
    │   ├── molecules/      # 분자 컴포넌트
    │   └── organisms/      # 유기체 컴포넌트
    ├── entities/           # Clean Architecture - 엔티티
    ├── application/        # Clean Architecture - 애플리케이션
    ├── infrastructure/     # Clean Architecture - 인프라
    ├── hooks/              # 커스텀 훅
    ├── lib/                # 유틸리티 함수
    └── contexts/           # React Context
```

## 🔍 유지해야 할 기능들

- 학생 관리 (추가, 삭제, 선택)
- 과목 관리 (추가, 삭제, 편집, 색상 선택)
- 시간표 표시 및 관리
- 드래그 앤 드롭 기능
- PDF 다운로드
- 반응형 디자인
- 다크/라이트 테마
- localStorage 데이터 저장
- Supabase 연동 준비

## 🗑️ 삭제할 파일/폴더들

- `frontend/` 폴더 (기능은 유지하되 구조만 정리)
- `backend/` 폴더 (사용하지 않음)
- 중복된 설정 파일들
- 불필요한 테스트 파일들
- 사용하지 않는 의존성들

## ⚠️ 주의사항

- 작업 전 전체 백업 필수
- 각 단계마다 테스트 진행
- 문제 발생 시 즉시 롤백
- 사용자 승인 후 다음 단계 진행
