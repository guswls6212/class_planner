#!/bin/bash

# 🔧 서버 관리 유틸리티 스크립트
# 포트 충돌 방지 및 서버 생명주기 관리

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수들
info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

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

# 포트 3000 사용 중인 프로세스 종료
kill_port_3000() {
    info "포트 3000 사용 중인 프로세스 확인 중..."
    
    # 포트 3000 사용 중인 프로세스 찾기
    local pids=$(lsof -ti:3000 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        warning "포트 3000 사용 중인 프로세스 발견: $pids"
        info "기존 프로세스들을 종료합니다..."
        
        # graceful shutdown 시도
        echo "$pids" | xargs -r kill -TERM 2>/dev/null || true
        sleep 2
        
        # 강제 종료
        echo "$pids" | xargs -r kill -9 2>/dev/null || true
        sleep 1
        
        # 추가로 next dev 프로세스들도 정리
        pkill -f "next dev" 2>/dev/null || true
        sleep 1
        
        success "포트 3000 정리 완료"
    else
        info "포트 3000이 사용 중이지 않습니다."
    fi
}

# 개발 서버 시작
start_dev_server() {
    local timeout=${1:-30}
    local silent=${2:-false}
    
    info "개발 서버 시작 중... (타임아웃: ${timeout}초)"
    
    # 기존 프로세스 정리
    kill_port_3000
    
    # 서버 백그라운드 시작
    if [ "$silent" = "true" ]; then
        npm run dev >/dev/null 2>&1 &
    else
        npm run dev &
    fi
    
    local server_pid=$!
    echo $server_pid > .dev-server.pid
    
    # 서버 시작 대기
    info "서버 시작 대기 중..."
    local count=0
    while [ $count -lt $timeout ]; do
        if curl -sSf http://localhost:3000 >/dev/null 2>&1; then
            success "개발 서버가 성공적으로 시작되었습니다. (PID: $server_pid)"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        if [ $((count % 5)) -eq 0 ]; then
            info "서버 시작 대기 중... (${count}/${timeout}초)"
        fi
    done
    
    warning "서버 시작 타임아웃 (${timeout}초)"
    kill_dev_server
    return 1
}

# 개발 서버 종료
kill_dev_server() {
    info "개발 서버 종료 중..."
    
    # PID 파일에서 서버 PID 읽기
    if [ -f ".dev-server.pid" ]; then
        local server_pid=$(cat .dev-server.pid)
        if [ -n "$server_pid" ] && kill -0 "$server_pid" 2>/dev/null; then
            info "서버 종료 중... (PID: $server_pid)"
            kill -TERM "$server_pid" 2>/dev/null || true
            sleep 2
            kill -9 "$server_pid" 2>/dev/null || true
        fi
        rm -f .dev-server.pid
    fi
    
    # 포트 정리
    kill_port_3000
    
    success "개발 서버 종료 완료"
}

# 서버 상태 확인
check_server_status() {
    if curl -sSf http://localhost:3000 >/dev/null 2>&1; then
        return 0  # 서버 실행 중
    else
        return 1  # 서버 중지
    fi
}

# 트랩 설정 (스크립트 종료 시 서버 정리)
setup_cleanup_trap() {
    trap 'kill_dev_server' EXIT INT TERM
}

# 메인 함수들
case "${1:-}" in
    "start")
        setup_cleanup_trap
        start_dev_server "${2:-30}" "${3:-false}"
        ;;
    "stop")
        kill_dev_server
        ;;
    "restart")
        kill_dev_server
        sleep 1
        setup_cleanup_trap
        start_dev_server "${2:-30}" "${3:-false}"
        ;;
    "status")
        if check_server_status; then
            success "서버가 실행 중입니다."
            exit 0
        else
            warning "서버가 중지되었습니다."
            exit 1
        fi
        ;;
    "clean")
        kill_port_3000
        ;;
    *)
        echo "사용법: $0 {start|stop|restart|status|clean} [timeout] [silent]"
        echo "  start   - 개발 서버 시작"
        echo "  stop    - 개발 서버 종료"
        echo "  restart - 개발 서버 재시작"
        echo "  status  - 서버 상태 확인"
        echo "  clean   - 포트 3000 정리"
        echo ""
        echo "옵션:"
        echo "  timeout - 서버 시작 타임아웃 (기본: 30초)"
        echo "  silent  - 무음 모드 (true/false, 기본: false)"
        exit 1
        ;;
esac
