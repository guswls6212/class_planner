# Class Planner

> 학원 운영자를 위한 시간표 관리 시스템. 학생/과목/수업을 관리하고 PDF로 바로 인쇄할 수 있습니다.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.9-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth+DB-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-yellow?style=flat-square&logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-red?style=flat-square&logo=playwright)](https://playwright.dev/)

**서비스 URL:** https://class-planner.info365.studio

## 주요 기능

- **학생 관리** — 학생 추가/삭제, 성별/생년월일 관리
- **과목 관리** — 과목 추가/삭제/편집, 색상 선택
- **시간표** — 드래그앤드롭 수업 배치, 그룹 수업 지원, 충돌 자동 감지/재배치
- **익명 우선** — 로그인 없이 바로 사용. 로그인 시 데이터 자동 동기화
- **PDF 다운로드** — 시간표를 A4 PDF로 인쇄
- **다크/라이트 테마**

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 15.5.9 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4.0 |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Supabase (정규화 테이블, Academy 멀티테넌트) |
| Auth | Supabase Auth (Google OAuth) |
| Testing | Vitest, Playwright, React Testing Library |
| Architecture | Clean Architecture + Atomic Design |
| Deployment | AWS Lightsail + Docker + Nginx + Let's Encrypt |
| CI/CD | GitHub Actions (ci.yml → deploy.yml) |

## 로컬 개발

```bash
# 의존성 설치
npm install

# 환경 변수 설정 (Supabase 키 입력)
cp .env.example .env.local   # 또는 직접 작성

# 개발 서버 실행
npm run dev
# → http://localhost:3000

# 빠른 검증 (tsc + unit tests)
npm run check:quick

# 전체 검증 (tsc + unit + build)
npm run check
```

## 환경 변수

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

상세: [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md)

## 테스트

```bash
npm run test           # Vitest 유닛/통합 테스트
npm run test:e2e       # Playwright E2E (개발 서버 실행 필요)
npm run check          # tsc + 유닛 + 빌드
```

## 배포

main 브랜치 merge 시 GitHub Actions가 자동 배포 (AWS Lightsail).

수동 배포: `bash scripts/deploy.sh`

상세: [docs/deployment-guide.md](docs/deployment-guide.md)

## 문서 (AI 어시스턴트 진입점)

| 문서 | 내용 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | AI 지침 + 문서 맵 + 개발 규칙 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 계층 구조, 데이터 모델, 배포 |
| [UI_SPEC.md](UI_SPEC.md) | UI 동작 소스 오브 트루스 |
| [TASKS.md](TASKS.md) | Phase별 진행 현황 |
| [docs/](docs/) | 상세 가이드 (테스트, 배포, 컴포넌트 등) |

## 프로젝트 구조

```
src/
├── app/               # Next.js App Router (pages + API routes)
│   ├── schedule/      # 시간표 (가장 복잡한 페이지)
│   ├── students/      # 학생 관리
│   ├── subjects/      # 과목 관리
│   ├── about/         # 소개
│   └── api/           # API Routes (students, subjects, sessions, enrollments, onboarding)
├── components/        # Atomic Design (atoms → molecules → organisms)
├── hooks/             # Custom React Hooks (useIntegratedDataLocal, useGlobalDataInitialization 등)
├── lib/               # 핵심 유틸리티 (localStorageCrud, apiSync, sessionCollisionUtils 등)
├── domain/            # Clean Architecture Domain Layer
├── application/       # Clean Architecture Application Layer
├── infrastructure/    # Clean Architecture Infrastructure Layer
└── contexts/          # React Context (ThemeContext)
```
