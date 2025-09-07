#!/bin/bash

# 환경 변수 설정 스크립트
echo "🔧 환경 변수 설정 중..."

if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ .env.local 파일이 생성되었습니다."
        echo "📝 Supabase 대시보드에서 실제 값으로 교체하세요."
    else
        echo "❌ .env.example 파일을 찾을 수 없습니다."
        exit 1
    fi
else
    echo "ℹ️  .env.local 파일이 이미 존재합니다."
fi

echo "🚀 환경 변수 설정 완료!"
