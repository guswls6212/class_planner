# 📚 Class Planner

> **Next.js + Atomic Design + Clean Architecture** 기반의 현대적인 클래스 관리 시스템

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-yellow?style=flat-square&logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-red?style=flat-square&logo=playwright)](https://playwright.dev/)

## 🎯 프로젝트 개요

Class Planner는 **학생 관리**, **과목 관리**, **시간표 생성**을 통합적으로 제공하는 웹 애플리케이션입니다.

### ✨ 주요 기능

- 🎓 **학생 관리**: 학생 추가, 삭제, 선택 및 기본 과목 자동 생성
- 📚 **과목 관리**: 과목 추가, 삭제, 편집, 색상 선택 및 실시간 검색
- 📅 **시간표 관리**: 드래그 앤 드롭으로 수업 추가, 편집, 삭제
- 👥 **다중 학생 수업**: 여러 학생이 참여하는 그룹 수업 지원
- 📱 **반응형 디자인**: 모바일과 데스크톱 모두 지원
- 🌙 **다크/라이트 테마**: 사용자 선호에 따른 테마 전환
- 🔐 **소셜 로그인**: Google, Kakao OAuth 지원
- 💾 **데이터 동기화**: localStorage와 클라우드 DB 간 자동 동기화
- 📄 **PDF 다운로드**: 시간표를 PDF로 내보내기

## 🏗️ 아키텍처

### 기술 스택

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: CSS Modules, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Testing**: Vitest, Playwright, React Testing Library
- **Deployment**: Vercel

### 아키텍처 패턴

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  Next.js App Router + Atomic Design Components            │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                        │
│  Use Cases + Application Services + DTOs                  │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                           │
│  Entities + Value Objects + Domain Services                │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│  Supabase Repositories + External APIs                     │
└─────────────────────────────────────────────────────────────┘
```

### 최근 아키텍처 개선사항

- ✅ **Clean Architecture 강화**: Domain 엔티티와 Application 계층 간 명확한 분리
- ✅ **타입 안정성 향상**: Value Objects와 Plain Objects 간 타입 호환성 개선
- ✅ **Repository 패턴 개선**: Mock과 실제 구현 간 일관된 인터페이스
- ✅ **테스트 아키텍처**: 각 계층별 적절한 테스트 전략 적용
- ✅ **코드 품질 관리**: ESLint + TypeScript + Pre-commit 훅으로 품질 보장

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18+
- npm 또는 yarn
- Git

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/class-planner.git
cd class-planner

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 편집하여 Supabase 설정 추가

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 📁 프로젝트 구조

```
class-planner/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── students/          # 학생 페이지
│   │   ├── subjects/          # 과목 페이지
│   │   ├── schedule/          # 시간표 페이지
│   │   └── layout.tsx         # 루트 레이아웃
│   ├── components/            # Atomic Design 컴포넌트
│   │   ├── atoms/            # 원자 컴포넌트
│   │   ├── molecules/        # 분자 컴포넌트
│   │   └── organisms/        # 유기체 컴포넌트
│   ├── domain/               # Clean Architecture - Domain
│   │   ├── entities/         # 도메인 엔티티
│   │   ├── value-objects/    # 값 객체
│   │   └── repositories/     # 리포지토리 인터페이스
│   ├── application/          # Clean Architecture - Application
│   │   ├── services/         # 애플리케이션 서비스
│   │   ├── use-cases/        # 유스케이스
│   │   └── mappers/          # 데이터 매퍼
│   ├── infrastructure/       # Clean Architecture - Infrastructure
│   │   └── repositories/     # Supabase 리포지토리 구현
│   └── hooks/                # 커스텀 훅
├── tests/                    # 테스트 파일
│   ├── e2e/                 # E2E 테스트
│   └── integration/         # 통합 테스트
├── docs/                    # 프로젝트 문서
└── migration/               # 데이터베이스 마이그레이션
```

## 🧪 테스트

### 테스트 실행

```bash
# 전체 테스트 실행 (watch 모드)
npm run test

# 테스트 실행 (자동 종료)
npm run test:run

# E2E 테스트 실행
npm run test:e2e

# 테스트 커버리지 확인
npm run test:coverage

# 특정 계층 테스트
npm run test -- src/domain/        # Domain 계층
npm run test -- src/application/   # Application 계층
npm run test -- src/components/    # Presentation 계층
npm run test -- src/app/api/       # API Routes
```

### 테스트 전략

- **Domain 계층**: 순수한 단위 테스트 (100% 커버리지 목표)
- **Application 계층**: Mock을 사용한 통합 테스트 (90%+ 커버리지 목표)
- **Infrastructure 계층**: 실제 외부 의존성 테스트 (80%+ 커버리지 목표)
- **Presentation 계층**: 컴포넌트 테스트 (70%+ 커버리지 목표)
- **E2E 테스트**: 사용자 시나리오 테스트
- **API Routes**: Repository Mock을 사용한 단위 테스트

### 최근 개선사항

- ✅ **TypeScript 구조적 문제 해결**: Domain 엔티티와 Application 계층 간 타입 호환성 개선
- ✅ **ESLint 설정 최적화**: TypeScript 지원 강화 및 코드 품질 규칙 적용
- ✅ **테스트 데이터 표준화**: 모든 테스트에서 유효한 UUID 사용
- ✅ **Repository Mock 전략**: API Routes 테스트에서 Repository Factory 직접 Mock
- ✅ **테스트 안정성 향상**: 일관된 Mock 데이터와 예측 가능한 테스트 결과

## 📚 문서

- [개발자 가이드](docs/DEVELOPER_GUIDE.md) - 개발 환경 설정 및 프로젝트 구조
- [테스트 가이드](docs/TESTING_GUIDE.md) - 테스트 작성 방법 및 전략
- [환경 설정 가이드](docs/ENVIRONMENT_SETUP.md) - 환경 변수 및 설정
- [Supabase 가이드](docs/SUPABASE_JSONB_GUIDE.md) - 데이터베이스 구조 및 사용법
- [마이그레이션 가이드](migration/MIGRATION_GUIDE.md) - 데이터베이스 마이그레이션

## 🔧 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 코드 품질 검사
npm run lint
npm run lint:fix

# 코드 포맷팅
npm run format

# 커밋/푸시 전 검증
npm run check
```

## 🌐 배포

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 환경 변수 설정

배포 시 다음 환경 변수를 설정해야 합니다:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 개발 가이드라인

- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) 패턴 준수
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) 원칙 적용
- TypeScript 타입 안정성 유지 (Domain Value Objects와 Application Plain Objects 구분)
- 테스트 코드 작성 필수 (각 계층별 적절한 테스트 전략 적용)
- ESLint 및 Prettier 규칙 준수
- Pre-commit 훅을 통한 코드 품질 검증 필수
- UUID 표준 사용 (테스트 데이터 포함)
- Repository Mock 전략을 통한 안정적인 테스트 작성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

문제가 발생하거나 질문이 있으시면 다음을 통해 연락해 주세요:

- [Issues](https://github.com/your-username/class-planner/issues) - 버그 리포트 및 기능 요청
- [Discussions](https://github.com/your-username/class-planner/discussions) - 일반적인 질문 및 토론

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받아 만들어졌습니다:

- [Next.js](https://nextjs.org/) - React 프레임워크
- [Supabase](https://supabase.com/) - Backend-as-a-Service
- [Vitest](https://vitest.dev/) - 테스트 프레임워크
- [Playwright](https://playwright.dev/) - E2E 테스트 도구

---

**Made with ❤️ by [Your Name]**
