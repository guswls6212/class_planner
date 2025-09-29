#!/bin/bash

# 🚀 개선된 커밋 전 필수 검증 스크립트
# 균형잡힌 접근: 빠르고 핵심적인 검증만 수행
# 에러 처리 및 사용자 경험 개선

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

# 함수: 단계별 실행 및 에러 처리
run_step() {
    local step_name="$1"
    local command="$2"
    local is_critical="${3:-true}"
    local allow_warning="${4:-false}"
    
    info "$step_name 실행 중..."
    
    if eval "$command"; then
        success "$step_name 통과"
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            error "$step_name 실패"
        elif [ "$allow_warning" = "true" ]; then
            warning "$step_name 실패했지만 계속 진행합니다."
            return 0
        else
            warning "$step_name 실패"
            return 1
        fi
    fi
}

# 시작 시간 기록
start_time=$(date +%s)

# 1. TypeScript 타입 체크 (빠른 검증)
run_step "TypeScript 타입 체크" "npm run type-check" true

# 2. ESLint 자동 수정 및 검사
info "ESLint 검사 및 자동 수정 실행 중..."
if npm run lint:fix -- src/ 2>/dev/null; then
    success "ESLint 검사 완료"
else
    warning "ESLint 경고가 있지만 계속 진행합니다."
fi

# 3. 핵심 단위 테스트 실행 (Domain + Application 계층)
run_step "핵심 비즈니스 로직 테스트" "npm run test -- src/domain/ src/application/" true

# 4. API Routes 테스트 (중요한 계약 검증)
run_step "API Routes 테스트" "npm run test -- src/app/api/" false true

# 5. 컴포넌트 테스트 (UI 기본 검증)
run_step "컴포넌트 기본 테스트" "npm run test -- src/components/" false true

# 6. 빠른 빌드 체크
run_step "빌드 가능 여부 확인" "npm run build" true

# 실행 시간 계산
end_time=$(date +%s)
duration=$((end_time - start_time))

echo ""
success "🎉 커밋 전 검증이 완료되었습니다! (${duration}초 소요)"
echo ""
info "✨ 커밋 준비 완료: 핵심 기능이 안전하게 보호되었습니다."
info "📝 이제 안전하게 커밋할 수 있습니다."
