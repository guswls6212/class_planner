#!/bin/bash
# auto-cleanup.sh - 작업 완료 후 자동 코드 정리

echo "🧹 작업 완료 후 자동 코드 정리 시작..."

echo "🔧 ESLint 자동 수정 적용 중..."
npm run lint:fix

echo "🎨 Prettier 포맷팅 적용 중..."
npm run format

echo "📊 정리 후 변경사항 확인 중..."
if git diff --quiet; then
    echo "✅ 정리 후 변경사항이 없습니다."
    exit 0
else
    echo "📝 코드 정리가 완료되었습니다."
    echo "📋 변경된 파일:"
    git diff --name-only
    echo ""
    echo "🔍 전체 변경사항을 확인하려면: git diff"
    echo "👀 변경사항을 검토한 후 승인해주세요."
    echo "✅ 승인 후 커밋하려면: git add . && git commit"
    exit 0
fi
