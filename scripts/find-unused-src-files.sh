#!/bin/bash

echo "🔍 src 폴더에서 사용하지 않는 파일 분석 중..."
echo "=================================================="

# src 폴더의 모든 TypeScript/JavaScript 파일 찾기
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | while read file; do
    # 파일명에서 확장자 제거
    basename_no_ext=$(basename "$file" | sed 's/\.[^.]*$//')
    dirname_path=$(dirname "$file")
    
    # 테스트 파일은 제외
    if [[ "$file" == *"test"* ]] || [[ "$file" == *"spec"* ]]; then
        continue
    fi
    
    # 특별한 파일들은 제외 (index, layout, page, route 등)
    if [[ "$basename_no_ext" == "index" ]] || [[ "$basename_no_ext" == "layout" ]] || [[ "$basename_no_ext" == "page" ]] || [[ "$basename_no_ext" == "route" ]] || [[ "$basename_no_ext" == "loading" ]] || [[ "$basename_no_ext" == "error" ]] || [[ "$basename_no_ext" == "not-found" ]]; then
        continue
    fi
    
    # 설정 파일들 제외
    if [[ "$basename_no_ext" == "setupTests" ]] || [[ "$basename_no_ext" == "globals" ]]; then
        continue
    fi
    
    # 파일이 다른 곳에서 import되는지 확인
    import_count=$(grep -r "from.*$basename_no_ext" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "$file" | wc -l)
    import_count2=$(grep -r "import.*$basename_no_ext" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "$file" | wc -l)
    require_count=$(grep -r "require.*$basename_no_ext" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "$file" | wc -l)
    
    total_usage=$((import_count + import_count2 + require_count))
    
    if [ $total_usage -eq 0 ]; then
        echo "❌ 사용되지 않음: $file"
    fi
done

echo ""
echo "🔍 추가 분석: 특별한 패턴들..."
echo "=================================================="

# README 파일들
find src -name "README.md" | while read file; do
    echo "📝 문서 파일: $file"
done

# 빈 index.ts 파일들
find src -name "index.ts" | while read file; do
    if [ $(wc -l < "$file") -lt 5 ]; then
        echo "📄 거의 빈 index 파일: $file ($(wc -l < "$file") lines)"
    fi
done

echo ""
echo "✅ 분석 완료!"
