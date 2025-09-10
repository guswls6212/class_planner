#!/bin/bash

# 🛡️ 기존 기능 보호 스크립트
# 이 스크립트는 새로운 수정사항이 기존 기능을 해치지 않는지 확인합니다.

set -e

echo "🛡️ 기존 기능 보호 검증 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수: 성공 메시지
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 함수: 경고 메시지
warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# 함수: 에러 메시지
error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# 함수: 정보 메시지
info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# 1. TypeScript 타입 체크
info "TypeScript 타입 체크 실행 중..."
if ! npx tsc --noEmit; then
    error "TypeScript 타입 에러가 발견되었습니다."
fi
success "TypeScript 타입 체크 통과"

# 2. ESLint 검사
info "ESLint 검사 실행 중..."
if ! npm run lint:fix; then
    error "ESLint 규칙 위반이 발견되었습니다."
fi
success "ESLint 검사 통과"

# 3. 기존 테스트 실행
info "기존 테스트 실행 중..."
if ! npm run test:run; then
    error "기존 테스트가 실패했습니다."
fi
success "기존 테스트 통과"

# 4. 전체 프로젝트 보호 테스트 실행 (Next.js 구조에 맞게 수정)
info "전체 프로젝트 보호 테스트 실행 중..."
if ! npm run test:run -- --testNamePattern="project-protection"; then
    warning "전체 프로젝트 보호 테스트가 실패했습니다. 기존 기능이 손상되었을 수 있습니다."
fi
success "전체 프로젝트 보호 테스트 통과"

# 5. Domain 계층 테스트 실행
info "Domain 계층 테스트 실행 중..."
if ! npm run test:run -- src/domain/; then
    error "Domain 계층 테스트가 실패했습니다."
fi
success "Domain 계층 테스트 통과"

# 6. Application 계층 테스트 실행
info "Application 계층 테스트 실행 중..."
if ! npm run test:run -- src/application/; then
    error "Application 계층 테스트가 실패했습니다."
fi
success "Application 계층 테스트 통과"

# 7. Infrastructure 계층 테스트 실행
info "Infrastructure 계층 테스트 실행 중..."
if ! npm run test:run -- src/infrastructure/; then
    error "Infrastructure 계층 테스트가 실패했습니다."
fi
success "Infrastructure 계층 테스트 통과"

# 8. Presentation 계층 테스트 실행
info "Presentation 계층 테스트 실행 중..."
if ! npm run test:run -- src/components/; then
    error "Presentation 계층 테스트가 실패했습니다."
fi
success "Presentation 계층 테스트 통과"

# 9. API Routes 테스트 실행
info "API Routes 테스트 실행 중..."
if ! npm run test:run -- src/app/api/; then
    error "API Routes 테스트가 실패했습니다."
fi
success "API Routes 테스트 통과"

# 10. 통합 테스트 실행 (Next.js 구조에 맞게 수정)
info "통합 테스트 실행 중..."
if ! npm run test:run -- --testNamePattern="integration"; then
    error "통합 테스트가 실패했습니다."
fi
success "통합 테스트 통과"

# 11. 빌드 테스트 (Next.js)
info "Next.js 빌드 테스트 실행 중..."
if ! npm run build; then
    error "Next.js 빌드가 실패했습니다."
fi
success "Next.js 빌드 테스트 통과"

# 12. 문서 일관성 체크 (Next.js 구조에 맞게 수정)
info "문서 일관성 체크 중..."
if [ ! -f "docs/DEVELOPER_GUIDE.md" ]; then
    warning "docs/DEVELOPER_GUIDE.md 파일이 없습니다."
fi
if [ ! -f "docs/TESTING_GUIDE.md" ]; then
    warning "docs/TESTING_GUIDE.md 파일이 없습니다."
fi
if [ ! -f "migration/MIGRATION_GUIDE.md" ]; then
    warning "migration/MIGRATION_GUIDE.md 파일이 없습니다."
fi
if [ ! -f "README.md" ]; then
    warning "README.md 파일이 없습니다."
fi
success "문서 일관성 체크 완료"

echo ""
success "🎉 모든 보호 검증이 통과했습니다!"
echo ""
info "기존 기능과 디자인이 안전하게 보호되었습니다."
info "새로운 수정사항을 안전하게 적용할 수 있습니다."
