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

# 4. 전체 프로젝트 보호 테스트 실행
info "전체 프로젝트 보호 테스트 실행 중..."
if ! npm run test:run -- project-protection; then
    error "전체 프로젝트 보호 테스트가 실패했습니다. 기존 기능이 손상되었을 수 있습니다."
fi
success "전체 프로젝트 보호 테스트 통과"



# 6. 통합 테스트 실행
info "통합 테스트 실행 중..."
if ! npm run test:run -- Schedule.integration; then
    error "Schedule 통합 테스트가 실패했습니다."
fi
if ! npm run test:run -- Students.integration; then
    error "Students 통합 테스트가 실패했습니다."
fi
success "통합 테스트 통과"

# 7. 빌드 테스트
info "빌드 테스트 실행 중..."
if ! npm run build; then
    error "빌드가 실패했습니다."
fi
success "빌드 테스트 통과"

# 8. 문서 일관성 체크
info "문서 일관성 체크 중..."
if [ ! -f "COMMAND_IMPACT_SCOPE.md" ]; then
    warning "COMMAND_IMPACT_SCOPE.md 파일이 없습니다."
fi
if [ ! -f "PAGES_REFERENCE.md" ]; then
    warning "PAGES_REFERENCE.md 파일이 없습니다."
fi
if [ ! -f "FUNCTIONALITY_CHECKLIST.md" ]; then
    warning "FUNCTIONALITY_CHECKLIST.md 파일이 없습니다."
fi
success "문서 일관성 체크 완료"

echo ""
success "🎉 모든 보호 검증이 통과했습니다!"
echo ""
info "기존 기능과 디자인이 안전하게 보호되었습니다."
info "새로운 수정사항을 안전하게 적용할 수 있습니다."
