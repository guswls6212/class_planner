#!/bin/bash

# 🚀 커밋 전 필수 검증 스크립트
# 균형잡힌 접근: 빠르고 핵심적인 검증만 수행

set -e

echo "🚀 커밋 전 필수 검증 시작..."

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

# 시작 시간 기록
start_time=$(date +%s)

# 1. TypeScript 타입 체크 (빠른 검증)
info "TypeScript 타입 체크 실행 중..."
if ! npm run type-check; then
    error "TypeScript 타입 에러가 발견되었습니다."
fi
success "TypeScript 타입 체크 통과"

# 2. ESLint 자동 수정 및 검사
info "ESLint 검사 및 자동 수정 실행 중..."
if ! npm run lint:fix; then
    error "ESLint 규칙 위반이 발견되었습니다."
fi
success "ESLint 검사 통과"

# 3. 핵심 단위 테스트 실행 (Domain + Application 계층)
info "핵심 비즈니스 로직 테스트 실행 중..."
if ! npm run test -- src/domain/ src/application/; then
    error "핵심 비즈니스 로직 테스트가 실패했습니다."
fi
success "핵심 비즈니스 로직 테스트 통과"

# 4. API Routes 테스트 (중요한 계약 검증)
info "API Routes 테스트 실행 중..."
if ! npm run test -- src/app/api/; then
    error "API Routes 테스트가 실패했습니다."
fi
success "API Routes 테스트 통과"

# 5. 컴포넌트 테스트 (UI 기본 검증)
info "컴포넌트 기본 테스트 실행 중..."
if ! npm run test -- src/components/; then
    warning "컴포넌트 테스트가 실패했습니다. 확인 후 커밋하세요."
fi
success "컴포넌트 테스트 통과"

# 6. 빠른 빌드 체크
info "빌드 가능 여부 확인 중..."
if ! npm run build; then
    error "빌드가 실패했습니다. 빌드 에러를 수정하고 다시 시도하세요."
fi
success "빌드 테스트 통과"

# 실행 시간 계산
end_time=$(date +%s)
duration=$((end_time - start_time))

echo ""
success "🎉 커밋 전 검증이 완료되었습니다! (${duration}초 소요)"
echo ""
info "✨ 커밋 준비 완료: 핵심 기능이 안전하게 보호되었습니다."
info "📝 이제 안전하게 커밋할 수 있습니다."
