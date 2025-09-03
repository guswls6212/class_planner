# 클래스 플래너 (Class Planner)

## 📋 개요

클래스 플래너는 학생과 수업을 효율적으로 관리할 수 있는 웹 기반 시간표 관리 시스템입니다. 직관적인 인터페이스와 강력한 기능을 통해 교육 기관의 수업 관리를 간소화합니다.

## 🚀 주요 기능

- **학생 관리**: 학생 추가, 삭제, 선택 기능
- **시간표 관리**: 9:00-23:00, 30분 단위 시간표 표시
- **드래그 앤 드롭**: 직관적인 수업 추가 방식
- **PDF 다운로드**: 시간표를 PDF로 내보내기
- **반응형 디자인**: 다양한 화면 크기 지원
- **다크/라이트 테마**: 사용자 선호에 따른 테마 전환

## 🛠️ 기술 스택

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **Styling**: CSS Modules
- **Deployment**: GitHub Pages

## 📦 설치 및 실행

### 필수 요구사항

- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 테스트 실행
npm run test:run
```

## 📚 문서

- **[사용자 매뉴얼](./USER_MANUAL.md)**: 애플리케이션 사용법 가이드
- **[개발자 가이드](./DEVELOPER_GUIDE.md)**: 개발자를 위한 종합 가이드

## 🧪 테스트

```bash
# 전체 테스트 실행
npm run test:run

# 테스트 커버리지
npm run test:coverage

# 보호 테스트 (기존 기능 보호)
npm run protection-check
```

## 🚀 배포

```bash
# 커밋 전 검증
npm run prepare-commit

# 배포
npm run deploy
```

## 📊 현재 상태

- **완료된 기능**: 28개
- **전체 진행률**: 70%
- **테스트 커버리지**: 90%+

## 🤝 기여하기

1. 이슈를 생성하여 문제나 개선사항을 보고
2. 브랜치를 생성하여 작업
3. 테스트를 작성하고 실행
4. Pull Request를 생성

## 📄 라이선스

MIT License

---

_클래스 플래너는 교육 기관의 수업 관리를 더욱 효율적으로 만들어줍니다._
