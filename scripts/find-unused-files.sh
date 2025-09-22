#!/bin/bash
# 사용되지 않는 파일 찾기 스크립트

echo "🔍 사용되지 않는 파일들을 찾고 있습니다..."

# 모든 TypeScript 파일 목록
ALL_FILES=$(find src -name "*.ts" -o -name "*.tsx" | grep -v __tests__ | grep -v ".test." | sort)

echo "📊 총 파일 개수: $(echo "$ALL_FILES" | wc -l)"

# 사용되지 않는 파일들 찾기
UNUSED_FILES=""
UNUSED_COUNT=0

for file in $ALL_FILES; do
    # 파일명에서 확장자 제거
    filename=$(basename "$file" .ts)
    filename=$(basename "$filename" .tsx)
    
    # 해당 파일을 import하는 다른 파일이 있는지 확인
    import_count=$(grep -r "from.*$filename" src --include="*.ts" --include="*.tsx" | grep -v "$file:" | wc -l)
    
    # Next.js 페이지나 API 라우트는 제외 (자동으로 사용됨)
    if [[ "$file" == *"/page.tsx" ]] || [[ "$file" == *"/route.ts" ]] || [[ "$file" == *"/layout.tsx" ]]; then
        continue
    fi
    
    # import되지 않는 파일 발견
    if [ "$import_count" -eq 0 ]; then
        echo "❌ 사용되지 않음: $file"
        UNUSED_FILES="$UNUSED_FILES$file
"
        UNUSED_COUNT=$((UNUSED_COUNT + 1))
    fi
done

echo ""
echo "📋 결과 요약:"
echo "- 총 파일 개수: $(echo "$ALL_FILES" | wc -l)"
echo "- 사용되지 않는 파일: $UNUSED_COUNT개"
echo ""

if [ "$UNUSED_COUNT" -gt 0 ]; then
    echo "🗑️ 삭제 후보 파일들:"
    echo -e "$UNUSED_FILES"
else
    echo "✅ 모든 파일이 사용되고 있습니다."
fi

