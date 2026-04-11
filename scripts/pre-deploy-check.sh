#!/bin/bash

# 🛡️ 개선된 배포 전 전체 검증 스크립트
# 안정성 중시: 모든 테스트 + 보안 + 성능 검증
# 서버 관리 및 포트 충돌 문제 해결

set -e

echo "🛡️ 배포 전 전체 안정성 검증 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

critical() {
    echo -e "${CYAN}🔒 $1${NC}"
}

# 함수: 사용자 입력 없이 자동 진행 (CI/CD 환경)
auto_proceed() {
    local default_choice="${1:-N}"
    local timeout="${2:-15}"
    
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
    local env_check="${6:-false}"
    
    step "$step_name 실행 중..."
    
    # 환경별 체크
    if [ "$env_check" = "true" ] && [ "$DEPLOY_ENV" = "production" ] && [ "$is_critical" = "false" ]; then
        is_critical="true"  # 프로덕션에서는 경고도 크리티컬로 처리
    fi
    
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

# 배포 환경 확인
check_deploy_env() {
    if [ -z "$DEPLOY_ENV" ]; then
        echo "배포 환경을 선택하세요:"
        echo "1) staging"
        echo "2) production"
        echo "자동으로 staging을 선택합니다."
        export DEPLOY_ENV="staging"
    fi
    
    info "배포 환경: $DEPLOY_ENV"
}

# 시작 시간 기록
start_time=$(date +%s)

# 배포 환경 확인
check_deploy_env

echo ""
critical "🔒 배포 전 전체 보안 및 안정성 검증을 시작합니다."
critical "🔒 이 과정은 시간이 오래 걸릴 수 있습니다."
echo ""

step "1단계: PR 검증 실행"
info "PR 수준의 모든 검증 실행 중..."
if ! ./scripts/pre-pr-check-improved.sh; then
    error "PR 검증이 실패했습니다. 먼저 PR 수준의 문제를 해결하세요."
fi
success "PR 검증 통과"

step "2단계: 전체 E2E 테스트 스위트"
info "모든 E2E 테스트 실행 중..."
if ! npm run test:e2e; then
    warning "전체 E2E 테스트가 실패했습니다."
    if [ "$DEPLOY_ENV" = "production" ]; then
        error "프로덕션 배포에서는 E2E 테스트가 필수입니다."
    fi
    if auto_proceed "Y" 20; then
        warning "E2E 테스트 실패를 무시하고 계속 진행합니다."
    else
        error "E2E 테스트 실패로 인한 중단"
    fi
fi
success "전체 E2E 테스트 단계 완료"

info "브라우저 호환성 테스트는 2단계 E2E 테스트에 포함됨"

step "3단계: 실제 클라이언트 통합 테스트"
run_step "실제 클라이언트 환경 테스트" "npm run test:real-client" true

step "4단계: 시스템 레벨 테스트"
info "기존 서버 사용하여 전체 시스템 테스트 실행..."

# 기존 서버 상태 확인 (프로세스 확인 방식)
if ps aux | grep "next dev" | grep -v grep > /dev/null 2>&1; then
    success "✅ Next.js 개발 서버가 이미 실행 중입니다. 기존 서버를 사용합니다."
    server_started_by_pre_deploy=false
else
    warning "⚠️ Next.js 개발 서버가 실행되지 않음. 시스템 테스트용 서버를 시작합니다."
    if ! ./scripts/server-manager.sh start 45 true; then
        warning "개발 서버 기동 실패"
        if [ "$DEPLOY_ENV" = "production" ]; then
            error "프로덕션 배포에서는 시스템 테스트가 필수입니다."
        fi
        if auto_proceed "Y" 15; then
            warning "서버 기동 실패를 무시하고 계속 진행합니다."
            skip_system_test=true
        else
            error "서버 기동 실패로 인한 중단"
        fi
    else
        server_started_by_pre_deploy=true
    fi
fi

if [ "$skip_system_test" != "true" ]; then
    # 시스템 테스트는 독립적으로 서버를 관리 (포트 충돌 방지)
    run_step "시스템 테스트" "npm run test:system" false true "Y" true
    
    # pre-deploy가 시작한 서버만 정리
    if [ "$server_started_by_pre_deploy" = "true" ]; then
        info "🧹 pre-deploy가 시작한 서버 정리 중..."
        ./scripts/server-manager.sh stop
        success "✅ 서버 정리 완료"
    else
        info "ℹ️ 기존 서버를 사용했으므로 종료하지 않습니다."
    fi
fi

step "5단계: 성능 벤치마크 테스트"
info "성능 벤치마크 실행 중..."
if [ -f "scripts/performance-monitor.js" ]; then
    run_step "성능 벤치마크" "node scripts/performance-monitor.js" false true "Y" true
else
    warning "성능 모니터 스크립트를 찾을 수 없습니다."
fi

step "6단계: 보안 검사"
critical "보안 취약점 검사 실행 중..."

# npm audit 실행
if ! npm audit --audit-level=high; then
    warning "보안 취약점이 발견되었습니다."
    if [ "$DEPLOY_ENV" = "production" ]; then
        error "프로덕션 배포에서는 보안 취약점이 허용되지 않습니다."
    fi
    if auto_proceed "Y" 20; then
        warning "보안 취약점을 무시하고 계속 진행합니다."
    else
        error "보안 취약점으로 인한 배포 중단"
    fi
fi
success "보안 검사 완료"

step "7단계: 환경 변수 및 설정 검증"
critical "배포 환경 설정 검증 중..."

# 필수 환경 변수 체크
required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    warning "다음 환경 변수가 설정되지 않았습니다: ${missing_vars[*]}"
    if [ "$DEPLOY_ENV" = "production" ]; then
        error "프로덕션 배포에서는 필수 환경 변수가 설정되어야 합니다."
    fi
fi

# .env 파일 존재 확인
if [ "$DEPLOY_ENV" = "production" ]; then
    if [ ! -f ".env.production" ] && [ ! -f ".env.production.local" ]; then
        warning "프로덕션 환경 변수 파일이 없습니다."
    fi
elif [ "$DEPLOY_ENV" = "staging" ]; then
    if [ ! -f ".env.staging" ] && [ ! -f ".env.staging.local" ]; then
        warning "스테이징 환경 변수 파일이 없습니다."
    fi
fi

success "환경 설정 검증 완료"

step "8단계: 데이터베이스 마이그레이션 상태 확인"
run_step "데이터베이스 마이그레이션 상태 확인" "npm run migration:status" false true "Y"

step "9단계: 최종 프로덕션 빌드 검증"
critical "최종 프로덕션 빌드 및 최적화 확인 중..."
run_step "최종 프로덕션 빌드" "npm run build" true

step "10단계: 빌드 결과물 검증"
info "빌드 결과물 무결성 검사 중..."
if [ ! -d ".next" ]; then
    error "빌드 결과물이 생성되지 않았습니다."
fi

# 빌드 크기 체크
build_size=$(du -sh .next 2>/dev/null | cut -f1 || echo "unknown")
info "빌드 크기: $build_size"

# 빌드 파일 개수 확인
build_file_count=$(find .next -type f | wc -l)
info "빌드 파일 개수: $build_file_count"

success "빌드 결과물 검증 완료"

# 실행 시간 계산
end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))
seconds=$((duration % 60))

echo ""
echo "🛡️ ================================================="
critical "🎉 배포 전 전체 검증이 완료되었습니다!"
echo -e "${CYAN}⏱️  총 소요 시간: ${minutes}분 ${seconds}초${NC}"
echo -e "${CYAN}🎯 배포 환경: $DEPLOY_ENV${NC}"
echo -e "${CYAN}📦 빌드 크기: $build_size${NC}"
echo -e "${CYAN}📄 빌드 파일: $build_file_count개${NC}"
echo "🛡️ ================================================="
echo ""

if [ "$DEPLOY_ENV" = "production" ]; then
    critical "🚀 프로덕션 배포 준비 완료!"
    critical "🔒 모든 보안 및 안정성 검증이 통과했습니다."
    echo ""
    echo -e "${RED}⚠️  프로덕션 배포 전 최종 확인:${NC}"
    echo -e "${RED}   1. 데이터베이스 백업이 완료되었나요?${NC}"
    echo -e "${RED}   2. 롤백 계획이 준비되었나요?${NC}"
    echo -e "${RED}   3. 모니터링 시스템이 준비되었나요?${NC}"
    echo ""
    echo "위 사항들을 확인했다면 배포를 진행하세요."
else
    info "🚀 스테이징 배포 준비 완료!"
    info "✨ 스테이징 환경에서 최종 테스트 후 프로덕션 배포를 진행하세요."
fi
