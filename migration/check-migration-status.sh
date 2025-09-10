#!/bin/bash

# Migration 상태 확인 스크립트
# 사용법: ./check-migration-status.sh

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
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ SUPABASE_URL이 설정되지 않았습니다.${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Migration 상태 확인${NC}"
echo -e "${BLUE}Supabase URL: ${SUPABASE_URL}${NC}"
echo ""

echo -e "${YELLOW}📋 Supabase SQL Editor에서 다음 쿼리를 실행하세요:${NC}"
echo -e "${BLUE}==============================================${NC}"
echo "SELECT * FROM public.get_migration_status();"
echo -e "${BLUE}==============================================${NC}"
echo ""

echo -e "${YELLOW}📋 또는 다음 쿼리로 직접 확인:${NC}"
echo -e "${BLUE}==============================================${NC}"
echo "SELECT 
    migration_name,
    status,
    executed_at,
    description
FROM public.migration_log 
ORDER BY executed_at DESC;"
echo -e "${BLUE}==============================================${NC}"
echo ""

echo -e "${GREEN}✅ Migration 상태 확인 완료${NC}"
