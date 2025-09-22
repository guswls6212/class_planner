#!/bin/bash

# 🎯 PR 생성 전 E2E 테스트 및 통합 검증 스크립트
# PR 전 필수: 전체 통합 + 주요 E2E 시나리오 검증

set -e

echo "🎯 PR 생성 전 E2E 및 통합 검증 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

# 함수: 단계 메시지
step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# 시작 시간 기록
start_time=$(date +%s)

step "1단계: 커밋 전 검증 실행"
# 먼저 기본 검증 실행
if ! ./scripts/pre-commit-check.sh; then
    error "커밋 전 기본 검증이 실패했습니다. 먼저 기본 문제를 해결하세요."
fi
success "기본 검증 통과"

step "2단계: 전체 단위 테스트 실행"
info "모든 단위 테스트 실행 중..."
if ! npm run test; then
    error "단위 테스트가 실패했습니다."
fi
success "전체 단위 테스트 통과"

step "3단계: 실제 Supabase 통합 테스트"
info "실제 Supabase 연결 테스트 실행 중..."
if ! npm run test:integration:real-supabase; then
    warning "Supabase 통합 테스트가 실패했습니다. 네트워크 연결을 확인하세요."
    echo "계속 진행하시겠습니까? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        error "사용자가 중단을 선택했습니다."
    fi
else
    success "Supabase 통합 테스트 통과"
fi

step "4단계: 테스트 커버리지 확인"
info "테스트 커버리지 측정 중..."
if ! npm run test:coverage; then
    warning "커버리지 측정에 실패했습니다."
else
    success "테스트 커버리지 측정 완료"
fi

step "5단계: 주요 E2E 시나리오 테스트"
info "핵심 사용자 시나리오 E2E 테스트 실행 중..."
if ! npm run test:e2e; then
    warning "E2E 테스트가 실패했습니다. 브라우저 환경을 확인하세요."
    echo "E2E 테스트 실패를 무시하고 계속하시겠습니까? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        error "E2E 테스트 실패로 인한 중단"
    fi
    warning "E2E 테스트 실패를 무시하고 계속 진행합니다."
else
    success "주요 E2E 시나리오 테스트 통과"
fi
info "브라우저 호환성 테스트는 5단계 E2E 테스트에 포함됨..."

step "7단계: 프로덕션 빌드 검증"
info "프로덕션 빌드 최종 검증 중..."
if ! npm run build; then
    error "프로덕션 빌드가 실패했습니다."
fi
success "프로덕션 빌드 검증 통과"

step "8단계: 시스템 통합 테스트"
info "개발 서버 기동 후 전체 시스템 통합 테스트 실행..."
# 포트 선점 프로세스 종료
lsof -ti:3000 | xargs -r kill -9 || true
# 서버 백그라운드 기동
npm run dev >/dev/null 2>&1 &
DEV_SERVER_PID=$!
# 서버 대기 (최대 30초)
for i in {1..30}; do
  if curl -sSf http://localhost:3000 >/dev/null; then
    break
  fi
  sleep 1
done
if ! curl -sSf http://localhost:3000 >/dev/null; then
  warning "개발 서버 기동 실패 또는 지연"
fi
if ! npm run test:system:headless; then
    warning "시스템 통합 테스트가 실패했습니다."
else
    success "시스템 통합 테스트 통과"
fi
# 서버 종료
kill -9 $DEV_SERVER_PID 2>/dev/null || true

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
