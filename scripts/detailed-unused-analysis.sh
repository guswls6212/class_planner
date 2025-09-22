#!/bin/bash

echo "🔍 src 폴더 상세 사용되지 않는 파일 분석..."
echo "=================================================="

# 잠재적으로 사용되지 않을 수 있는 파일들을 수동으로 확인
echo ""
echo "🧐 수동 검토가 필요한 파일들:"
echo "=================================================="

# 1. README 파일들
find src -name "README.md" | while read file; do
    echo "📝 문서: $file"
done

# 2. skip된 테스트 파일들
grep -r "describe.skip\|it.skip\|test.skip" src --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq | while read file; do
    echo "⏸️  Skip된 테스트: $file"
done

# 3. 빈 폴더들
find src -type d -empty | while read dir; do
    echo "📁 빈 폴더: $dir"
done

# 4. 매우 작은 파일들 (5줄 이하)
find src -name "*.ts" -o -name "*.tsx" | while read file; do
    if [[ "$file" != *"test"* ]] && [[ "$file" != *"spec"* ]]; then
        lines=$(wc -l < "$file")
        if [ $lines -le 5 ]; then
            echo "📄 매우 작은 파일: $file ($lines lines)"
        fi
    fi
done

# 5. deprecated 표시된 파일들
grep -r "@deprecated\|deprecated" src --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq | while read file; do
    echo "⚠️  Deprecated: $file"
done

echo ""
echo "🔍 특정 패턴 분석:"
echo "=================================================="

# 6. 사용되지 않을 가능성이 높은 특정 파일들 확인
check_usage() {
    local file_pattern="$1"
    local description="$2"
    
    if find src -name "$file_pattern" | head -1 | read file; then
        basename_no_ext=$(basename "$file" | sed 's/\.[^.]*$//')
        usage_count=$(grep -r "$basename_no_ext" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "$file" | wc -l)
        if [ $usage_count -eq 0 ]; then
            echo "❌ $description: $file (사용되지 않음)"
        else
            echo "✅ $description: $file (사용됨: $usage_count 곳)"
        fi
    fi
}

# 특정 파일들 검사
check_usage "yPositionMigration.*" "yPosition 마이그레이션"
check_usage "**/debugUtils.*" "디버그 유틸리티"
check_usage "**/logoutUtils.*" "로그아웃 유틸리티"

echo ""
echo "✅ 상세 분석 완료!"
