#!/bin/bash

# Migration 실행 스크립트 (Supabase SQL Editor 방식)
# 사용법: ./run-migration.sh [migration-file-name]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# .env.local 파일에서 환경변수 로드
if [ -f ".env.local" ]; then
    echo -e "${BLUE}📁 .env.local 파일에서 환경변수 로드 중...${NC}"
    export $(grep -v '^#' .env.local | xargs)
else
    echo -e "${YELLOW}⚠️  .env.local 파일이 없습니다. 환경변수를 직접 설정해주세요.${NC}"
fi

# Supabase 설정 확인
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Supabase 환경변수가 설정되지 않았습니다.${NC}"
    echo -e "${YELLOW}다음 중 하나의 방법으로 설정해주세요:${NC}"
    echo ""
    echo -e "${BLUE}방법 1: .env.local 파일 생성${NC}"
    echo "  SUPABASE_URL=https://your-project.supabase.co"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    echo -e "${BLUE}방법 2: 환경변수 직접 설정${NC}"
    echo "  export SUPABASE_URL='your-supabase-url'"
    echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
    exit 1
fi

# 환경변수 확인 (보안을 위해 일부만 표시)
echo -e "${GREEN}✅ Supabase 설정 확인 완료${NC}"
echo -e "${BLUE}  URL: ${SUPABASE_URL}${NC}"
echo -e "${BLUE}  Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}...${NC}"

# Migration 파일 경로
MIGRATION_DIR="migrations"
MIGRATION_FILE="$1"

# Migration 파일 확인
if [ -z "$MIGRATION_FILE" ]; then
    echo -e "${YELLOW}사용법: $0 [migration-file-name]${NC}"
    echo -e "${BLUE}사용 가능한 migration 파일들:${NC}"
    ls -la "$MIGRATION_DIR"/*.sql 2>/dev/null || echo "  (migration 파일이 없습니다)"
    exit 1
fi

if [ ! -f "$MIGRATION_DIR/$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration 파일을 찾을 수 없습니다: $MIGRATION_DIR/$MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Migration 실행 시작: $MIGRATION_FILE${NC}"

# Migration 이름 추출 (파일명에서 .sql 제거)
MIGRATION_NAME=$(basename "$MIGRATION_FILE" .sql)

# Migration 파일 내용 표시
echo -e "${YELLOW}📝 Migration SQL 내용:${NC}"
echo -e "${BLUE}==============================================${NC}"
cat "$MIGRATION_DIR/$MIGRATION_FILE"
echo -e "${BLUE}==============================================${NC}"

echo -e "${YELLOW}📋 Supabase SQL Editor에서 실행하세요:${NC}"
echo -e "${BLUE}1. ${SUPABASE_URL} 접속${NC}"
echo -e "${BLUE}2. SQL Editor → New query${NC}"
echo -e "${BLUE}3. 위 SQL 복사 → 붙여넣기 → Run${NC}"
echo -e "${BLUE}4. 실행 완료 후 상태 확인:${NC}"
echo -e "${GREEN}   npm run migration:status${NC}"