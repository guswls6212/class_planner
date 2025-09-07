#!/bin/bash

# Git hooks 설치 스크립트
# 새로운 개발자가 프로젝트를 클론할 때 실행

echo "🔧 Git hooks 설치 중..."

# .githooks 디렉토리가 있는지 확인
if [ ! -d ".githooks" ]; then
    echo "❌ .githooks 디렉토리를 찾을 수 없습니다."
    exit 1
fi

# Git hooks 디렉토리 생성
mkdir -p .git/hooks

# hooks 복사
cp .githooks/post-checkout .git/hooks/
cp .githooks/post-merge .git/hooks/

# 실행 권한 부여
chmod +x .git/hooks/post-checkout
chmod +x .git/hooks/post-merge

echo "✅ Git hooks가 성공적으로 설치되었습니다!"
echo ""
echo "🎉 이제 다음 작업 시 자동으로 .env.local 파일이 생성됩니다:"
echo "   - git checkout <branch>"
echo "   - git pull"
echo "   - git merge"
echo ""
echo "💡 환경 변수 설정 후 개발 서버를 실행하세요:"
echo "   cd frontend && npm run dev"
