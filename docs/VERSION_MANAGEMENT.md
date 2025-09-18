# 버전 관리 전략 (Version Management Strategy)

## 📋 개요

이 문서는 Class Planner 프로젝트의 버전 관리 전략을 정의합니다. 안정적인 서비스 운영과 체계적인 개발 관리를 위해 **Git Flow** 방식을 채택합니다.

## 🏛️ 핵심 브랜치 전략

### 1. Main 브랜치 (Production)
- **목적**: 실제 사용자가 사용 중인 가장 안정적인 버전의 코드만 존재
- **특징**: 
  - 오직 릴리스와 긴급 버그 수정 내용만 병합(merge)
  - 항상 배포 가능한 상태 유지
  - 각 릴리스마다 버전 태그(Tag) 부여

### 2. Develop 브랜치 (Development)
- **목적**: 다음 릴리스를 준비하는 모든 개발 작업이 통합되는 공간
- **특징**:
  - 새로운 기능, 개선 사항 등 모든 변경 사항이 먼저 병합
  - 다음 릴리스 버전을 향한 개발 작업의 중심
  - 안정화 후 main 브랜치로 병합

## 🔢 버전 번호 규칙 (Semantic Versioning)

### 형식: `MAJOR.MINOR.PATCH` (예: v1.0.1)

#### MAJOR (주 버전)
- **조건**: 기존 버전과 호환되지 않는 큰 변경
- **예시**: v1.1.5 → v2.0.0
- **사례**: 
  - API 구조 대폭 변경
  - 데이터베이스 스키마 호환성 깨짐
  - 주요 아키텍처 변경

#### MINOR (부 버전)
- **조건**: 기존 버전과 호환되면서 새로운 기능 추가
- **예시**: v1.0.1 → v1.1.0
- **사례**:
  - 새로운 기능 추가 (알림 시스템, 통계 대시보드 등)
  - UI/UX 개선
  - 성능 최적화

#### PATCH (패치 버전)
- **조건**: 기존 버전과 호환되는 단순 버그 수정
- **예시**: v1.0.0 → v1.0.1
- **사례**:
  - 버그 수정
  - 보안 패치
  - 문서 업데이트

## 🚀 릴리스 프로세스

### 1. 정기 릴리스 (Regular Release)

#### Step 1: 기능 개발
```bash
# develop 브랜치에서 새로운 기능 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/new-notification-system

# 개발 완료 후 develop으로 병합
git checkout develop
git merge feature/new-notification-system
git push origin develop
```

#### Step 2: 릴리스 준비
```bash
# develop 브랜치를 main으로 병합
git checkout main
git pull origin main
git merge develop

# 버전 태그 생성 및 푸시
git tag -a v1.1.0 -m "Release v1.1.0: Add notification system"
git push origin main
git push origin v1.1.0
```

#### Step 3: 배포
- main 브랜치의 태그된 버전을 프로덕션 환경에 배포
- 배포 완료 후 develop 브랜치에 릴리스 브랜치 병합

### 2. 긴급 수정 (Hotfix)

#### Step 1: 긴급 수정 브랜치 생성
```bash
# main 브랜치에서 직접 hotfix 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/critical-login-bug
```

#### Step 2: 수정 및 릴리스
```bash
# 버그 수정 완료 후 main으로 병합
git checkout main
git merge hotfix/critical-login-bug

# 패치 버전 태그 생성
git tag -a v1.0.1 -m "Hotfix v1.0.1: Fix critical login bug"
git push origin main
git push origin v1.0.1
```

#### Step 3: develop 브랜치 동기화
```bash
# 중요: hotfix 내용을 develop 브랜치에도 반영
git checkout develop
git merge hotfix/critical-login-bug
git push origin develop
```

## 📝 브랜치 명명 규칙

### 기능 브랜치 (Feature Branches)
- **형식**: `feature/기능명`
- **예시**: 
  - `feature/user-dashboard`
  - `feature/email-notifications`
  - `feature/data-export`

### 버그 수정 브랜치 (Bugfix Branches)
- **형식**: `bugfix/버그설명`
- **예시**:
  - `bugfix/session-drag-drop`
  - `bugfix/login-validation`

### 긴급 수정 브랜치 (Hotfix Branches)
- **형식**: `hotfix/긴급수정내용`
- **예시**:
  - `hotfix/security-patch`
  - `hotfix/critical-data-loss`

### 릴리스 브랜치 (Release Branches)
- **형식**: `release/버전번호`
- **예시**:
  - `release/v1.1.0`
  - `release/v2.0.0`

## 🏷️ 태그 관리

### 태그 생성 명령어
```bash
# 주석이 있는 태그 생성
git tag -a v1.0.0 -m "Release v1.0.0: Initial release"

# 원격 저장소에 태그 푸시
git push origin v1.0.0

# 모든 태그 푸시
git push origin --tags
```

### 태그 조회
```bash
# 모든 태그 목록 조회
git tag -l

# 특정 패턴 태그 조회
git tag -l "v1.*"

# 태그 상세 정보 조회
git show v1.0.0
```

## 📊 버전 관리 체크리스트

### 릴리스 전 체크리스트
- [ ] 모든 기능 개발 완료
- [ ] 테스트 통과 확인
- [ ] 문서 업데이트 완료
- [ ] 버전 번호 결정
- [ ] 릴리스 노트 작성

### Hotfix 전 체크리스트
- [ ] 버그 재현 가능
- [ ] 수정 사항 검증
- [ ] 테스트 케이스 추가
- [ ] develop 브랜치 동기화 계획

## 🔄 브랜치 전략 다이어그램

```
main     ●────●────●────●────●────●────●────●
         │    │    │    │    │    │    │    │
         v1.0 │    │    │    │    │    │    │
              │    │    │    │    │    │    │
develop  ●────●────●────●────●────●────●────●
         │    │    │    │    │    │    │    │
         │    │    │    │    │    │    │    │
feature  ●────●────●────●────●────●────●────●
         │    │    │    │    │    │    │    │
hotfix   ●────●────●────●────●────●────●────●
```

## 📚 참고 자료

- [Semantic Versioning](https://semver.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Git Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)

---

**마지막 업데이트**: 2025-01-18  
**문서 버전**: v1.0.0
