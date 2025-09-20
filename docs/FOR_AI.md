# FOR AI - 프로젝트 가이드

## 📋 프로젝트 개요

**Class Planner**: Next.js + Atomic Design + Clean Architecture 기반 학원 시간표 관리 시스템

### 🏗️ 기술 스택

- **Frontend**: Next.js 15.5.2, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Authentication)
- **Testing**: Vitest, Playwright, React Testing Library
- **Architecture**: Clean Architecture + Atomic Design
- **Styling**: Tailwind CSS 4.0

### 📁 주요 디렉토리

```
src/
├── app/                    # Next.js App Router (페이지 + API Routes)
├── components/             # Atomic Design (atoms/molecules/organisms)
├── domain/                 # Clean Architecture - Domain 계층
├── application/            # Clean Architecture - Application 계층
├── infrastructure/         # Clean Architecture - Infrastructure 계층
├── hooks/                  # React 커스텀 훅
├── lib/                    # 유틸리티 함수
└── shared/                 # 공유 타입 및 상수
```

## 🚀 권장 워크플로우

### 1. 🔄 **개발 중** (매번 커밋 시)

```bash
# 코드 수정 후
git add .
npm run pre-commit          # 1-3분 (타입체크, 린트, 핵심테스트, 빌드)
git commit -m "feat: 기능 설명"

# 프로젝트 구조 문서 최신화 (중요한 변경사항 있을 시)
# PROJECT_STRUCTURE.md 파일을 수동으로 업데이트하거나
# 다음 명령어로 구조 확인 후 문서 업데이트
tree src/ -I 'node_modules|.git|.next' -L 3 > temp_structure.txt
```

### 2. 🎯 **기능 완성 후** (매일)

```bash
# 기능 개발 완료 후
npm run pre-pr              # 5-15분 (전체테스트, E2E, 통합테스트)
# Pull Request 생성
```

### 3. 🛡️ **릴리스 준비** (릴리스할 시)

```bash
# 배포 전 최종 검증
npm run pre-deploy          # 15-30분 (보안, 성능, 완전검증)
# 배포 진행
```

## 📋 주요 명령어

### 테스트

```bash
npm run test                # 단위 테스트
npm run test:watch          # 개발 중 감시 모드
npm run test:e2e            # E2E 테스트
npm run test:coverage       # 커버리지 측정
```

### 개발

```bash
npm run dev                 # 개발 서버 시작
npm run build               # 프로덕션 빌드
npm run type-check          # TypeScript 타입 체크
npm run lint:fix            # ESLint 자동 수정
```

### 3단계 검증 스크립트

```bash
npm run pre-commit          # 커밋 전 필수 검증 (1-3분)
npm run pre-pr              # PR 전 통합 검증 (5-15분)
npm run pre-deploy          # 배포 전 완전 검증 (15-30분)
```

## 🎯 AI 명령어 처리 시 주의사항

### 1. **테스트 전략**

- **개발 중**: `pre-commit` 스크립트 사용 (빠른 검증)
- **기능 완성**: `pre-pr` 스크립트 사용 (통합 검증)
- **배포 준비**: `pre-deploy` 스크립트 사용 (완전 검증)

### 2. **아키텍처 준수**

- **Domain**: 비즈니스 로직, 엔티티, 값 객체
- **Application**: 유스케이스, 서비스, 매퍼
- **Infrastructure**: 외부 의존성, 리포지토리 구현
- **Presentation**: React 컴포넌트 (Atomic Design)

### 3. **코드 수정 시**

- **타입 안전성**: TypeScript 엄격 모드 준수
- **테스트**: 수정된 코드에 대한 테스트 작성/업데이트
- **문서**: 중요한 변경사항은 관련 문서 업데이트
- **스타일**: Tailwind CSS 사용, 인라인 스타일 금지

### 4. **파일 구조 변경 시**

- **PROJECT_STRUCTURE.md** 문서 업데이트 필수
- **Clean Architecture** 계층 분리 유지
- **Atomic Design** 컴포넌트 분류 준수

## 🔍 현재 프로젝트 상태

### ✅ 완료된 기능

- 학생 관리 (CRUD)
- 과목 관리 (CRUD)
- 시간표 관리 (드래그앤드롭)
- Supabase 통합
- 3단계 테스트 전략 구현
- Clean Architecture 구조
- Atomic Design 컴포넌트

### 📝 알려진 이슈

- TypeScript 타입 에러 다수 존재 (기존 코드)
- 일부 테스트 실패 (통합 테스트 환경 의존적)

### 🎯 개발 우선순위

1. TypeScript 타입 에러 수정
2. 테스트 안정화
3. 성능 최적화
4. 사용자 경험 개선

## 📚 주요 문서

- `docs/TESTING_COMMANDS.md`: 테스트 실행 가이드
- `docs/PROJECT_STRUCTURE.md`: 프로젝트 구조 상세
- `docs/TESTING_STRATEGY.md`: 테스트 전략
- `docs/DEVELOPMENT_WORKFLOW.md`: 개발 워크플로우

## 💡 AI 명령어 처리 팁

1. **항상 워크플로우 준수**: 변경사항 규모에 맞는 검증 스크립트 실행
2. **문서 동기화**: 구조 변경 시 PROJECT_STRUCTURE.md 업데이트
3. **테스트 우선**: 기능 수정 시 관련 테스트 확인/업데이트
4. **아키텍처 일관성**: Clean Architecture 원칙 준수
5. **타입 안전성**: TypeScript 에러 해결 우선

---

**마지막 업데이트**: 2025-01-18  
**프로젝트 버전**: v0.1.0
