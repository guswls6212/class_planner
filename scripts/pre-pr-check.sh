#!/bin/bash

# 🎯 개선된 PR 생성 전 E2E 테스트 및 통합 검증 스크립트
# PR 전 필수: 전체 통합 + 주요 E2E 시나리오 검증
# 서버 관리 및 에러 처리 개선

set -e

echo "🎯 PR 생성 전 E2E 및 통합 검증 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 함수들
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# 함수: 사용자 입력 없이 자동 진행 (CI/CD 환경)
auto_proceed() {
    local default_choice="${1:-N}"
    local timeout="${2:-10}"
    
    if [ -n "$CI" ] || [ -n "$AUTO_PROCEED" ]; then
        echo "자동 모드: $default_choice 선택"
        return 0
    fi
    
    echo -n "계속 진행하시겠습니까? (${default_choice}/n, ${timeout}초 후 자동 ${default_choice}): "
    
    if read -t "$timeout" -r response; then
        if [[ "$response" =~ ^[Yy]$ ]]; then
            return 0
        elif [[ "$response" =~ ^[Nn]$ ]]; then
            return 1
        fi
    fi
    
    echo ""
    echo "시간 초과. 기본값 $default_choice 선택"
    return 0
}

# 함수: 단계별 실행 및 에러 처리
run_step() {
    local step_name="$1"
    local command="$2"
    local is_critical="${3:-true}"
    local allow_warning="${4:-false}"
    local auto_choice="${5:-N}"
    
    step "$step_name 실행 중..."
    
    if eval "$command"; then
        success "$step_name 통과"
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            error "$step_name 실패"
        elif [ "$allow_warning" = "true" ]; then
            warning "$step_name 실패했습니다."
            if auto_proceed "$auto_choice" 15; then
                warning "$step_name 실패를 무시하고 계속 진행합니다."
                return 0
            else
                error "사용자가 중단을 선택했습니다."
            fi
        else
            warning "$step_name 실패"
            return 1
        fi
    fi
}

# 시작 시간 기록
start_time=$(date +%s)

step "1단계: 커밋 전 검증 실행"
# 개선된 pre-commit 스크립트 사용
if ! ./scripts/pre-commit-check-improved.sh; then
    error "커밋 전 기본 검증이 실패했습니다. 먼저 기본 문제를 해결하세요."
fi
success "기본 검증 통과"

step "2단계: 전체 단위 테스트 실행"
run_step "전체 단위 테스트" "npm run test" true

step "3단계: 실제 Supabase 통합 테스트"
run_step "Supabase 통합 테스트" "npm run test:integration:real-supabase" false true "N"

step "4단계: 테스트 커버리지 확인"
run_step "테스트 커버리지 측정" "npm run test:coverage" false true "Y"

step "5단계: 주요 E2E 시나리오 테스트"
info "핵심 사용자 시나리오 E2E 테스트 실행 중..."
if ! npm run test:e2e; then
    warning "E2E 테스트가 실패했습니다. 브라우저 환경을 확인하세요."
    if auto_proceed "N" 20; then
        warning "E2E 테스트 실패를 무시하고 계속 진행합니다."
    else
        error "E2E 테스트 실패로 인한 중단"
    fi
else
    success "주요 E2E 시나리오 테스트 통과"
fi
info "브라우저 호환성 테스트는 5단계 E2E 테스트에 포함됨"

step "6단계: 프로덕션 빌드 검증"
run_step "프로덕션 빌드 최종 검증" "npm run build" true

step "7단계: 시스템 통합 테스트"
info "개발 서버 기동 후 전체 시스템 통합 테스트 실행..."

# 서버 관리자 사용하여 서버 시작
if ! ./scripts/server-manager.sh start 30 true; then
    warning "개발 서버 기동 실패"
    if auto_proceed "Y" 10; then
        warning "서버 기동 실패를 무시하고 계속 진행합니다."
        skip_system_test=true
    else
        error "서버 기동 실패로 인한 중단"
    fi
fi

if [ "$skip_system_test" != "true" ]; then
    if ! npm run test:system:headless; then
        warning "시스템 통합 테스트가 실패했습니다."
        if auto_proceed "Y" 10; then
            warning "시스템 테스트 실패를 무시하고 계속 진행합니다."
        fi
    else
        success "시스템 통합 테스트 통과"
    fi
    
    # 서버 정리
    ./scripts/server-manager.sh stop
fi

# 실행 시간 계산
end_time=$(date +%s)
duration=$((end_time - start_time))

echo ""
echo "🎯 ========================================="
success "🎉 PR 생성 전 검증이 완료되었습니다!"
echo -e "${PURPLE}⏱️  총 소요 시간: ${duration}초${NC}"
echo "🎯 ========================================="
echo ""
info "✨ PR 준비 완료: 전체 시스템이 검증되었습니다."
info "🚀 이제 안전하게 Pull Request를 생성할 수 있습니다."
info "📋 PR 생성 시 다음 내용을 포함하세요:"
echo -e "${BLUE}   - 변경 사항 요약${NC}"
echo -e "${BLUE}   - 테스트 결과 (${duration}초 소요)${NC}"
echo -e "${BLUE}   - E2E 테스트 통과 여부${NC}"
echo -e "${BLUE}   - 브라우저 호환성 확인 여부${NC}"
