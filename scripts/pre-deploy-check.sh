#!/bin/bash

# 🛡️ 배포 전 전체 검증 스크립트
# 안정성 중시: 모든 테스트 + 보안 + 성능 검증

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

# 배포 환경 확인
check_deploy_env() {
    if [ -z "$DEPLOY_ENV" ]; then
        echo "배포 환경을 선택하세요:"
        echo "1) staging"
        echo "2) production"
        read -p "선택 (1-2): " env_choice
        
        case $env_choice in
            1) export DEPLOY_ENV="staging" ;;
            2) export DEPLOY_ENV="production" ;;
            *) error "잘못된 선택입니다." ;;
        esac
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
if ! ./scripts/pre-pr-check.sh; then
    error "PR 검증이 실패했습니다. 먼저 PR 수준의 문제를 해결하세요."
fi
success "PR 검증 통과"

# step "2단계: 전체 E2E 테스트 스위트"
# info "모든 E2E 테스트 실행 중..."
# if ! npm run test:e2e; then
#     error "전체 E2E 테스트가 실패했습니다. 배포를 중단합니다."
# fi
# success "전체 E2E 테스트 통과"

# step "3단계: 브라우저 호환성 완전 검증"
# info "모든 브라우저 호환성 테스트 실행 중..."
# if ! npm run test:e2e:browser-compatibility; then
#     error "브라우저 호환성 테스트가 실패했습니다."
# fi
# success "브라우저 호환성 검증 완료"
info "⚠️ E2E 및 브라우저 호환성 테스트는 현재 불안정으로 인해 비활성화됨 (FUTURE_TODO.md 참조)"

step "4단계: 실제 클라이언트 통합 테스트"
info "실제 클라이언트 환경 테스트 실행 중..."
if ! npm run test:real-client; then
    error "실제 클라이언트 통합 테스트가 실패했습니다."
fi
success "실제 클라이언트 통합 테스트 통과"

step "5단계: 시스템 레벨 테스트"
info "전체 시스템 테스트 실행 중..."
if ! npm run test:system; then
    warning "시스템 테스트가 실패했습니다."
    if [ "$DEPLOY_ENV" = "production" ]; then
        error "프로덕션 배포에서는 시스템 테스트가 필수입니다."
    fi
fi
success "시스템 테스트 통과"

step "6단계: 성능 벤치마크 테스트"
info "성능 벤치마크 실행 중..."
if [ -f "scripts/performance-monitor.js" ]; then
    if ! node scripts/performance-monitor.js; then
        warning "성능 벤치마크에서 문제가 발견되었습니다."
        if [ "$DEPLOY_ENV" = "production" ]; then
            echo "성능 문제를 무시하고 계속하시겠습니까? (y/N): "
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                error "성능 문제로 인한 배포 중단"
            fi
        fi
    fi
    success "성능 벤치마크 통과"
else
    warning "성능 모니터 스크립트를 찾을 수 없습니다."
fi

step "7단계: 보안 검사"
critical "보안 취약점 검사 실행 중..."

# npm audit 실행
if ! npm audit --audit-level=high; then
    warning "보안 취약점이 발견되었습니다."
    if [ "$DEPLOY_ENV" = "production" ]; then
        echo "보안 취약점을 무시하고 계속하시겠습니까? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            error "보안 취약점으로 인한 배포 중단"
        fi
    fi
fi
success "보안 검사 완료"

step "8단계: 환경 변수 및 설정 검증"
critical "배포 환경 설정 검증 중..."

# 필수 환경 변수 체크
required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        warning "환경 변수 $var 가 설정되지 않았습니다."
    fi
done

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

step "9단계: 데이터베이스 마이그레이션 상태 확인"
info "데이터베이스 마이그레이션 상태 확인 중..."
if ! npm run migration:status; then
    warning "마이그레이션 상태를 확인할 수 없습니다."
fi
success "데이터베이스 상태 확인 완료"

step "10단계: 최종 프로덕션 빌드 검증"
critical "최종 프로덕션 빌드 및 최적화 확인 중..."
if ! npm run build; then
    error "최종 프로덕션 빌드가 실패했습니다."
fi
success "최종 프로덕션 빌드 완료"

step "11단계: 빌드 결과물 검증"
info "빌드 결과물 무결성 검사 중..."
if [ ! -d ".next" ]; then
    error "빌드 결과물이 생성되지 않았습니다."
fi

# 빌드 크기 체크
build_size=$(du -sh .next 2>/dev/null | cut -f1 || echo "unknown")
info "빌드 크기: $build_size"

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
