# 🐛 Cursor 디버거 설정 가이드

## 📋 개요

이 가이드는 Cursor의 내장 디버거 기능을 활용하여 Chrome 브라우저의 콘솔 로그를 실시간으로 Cursor로 가져오는 방법을 설명합니다.

## 🚀 설정 방법

### 1단계: launch.json 파일 확인

`.vscode/launch.json` 파일이 생성되었는지 확인하세요:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome with Class Planner",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173/class_planner/students",
      "webRoot": "${workspaceFolder}/frontend",
      "sourceMaps": true,
      "userDataDir": false,
      "runtimeArgs": [
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor"
      ]
    }
  ]
}
```

### 2단계: 개발 서버 실행

```bash
cd frontend
npm run dev
```

### 3단계: Cursor 디버거 실행

1. **Cursor에서 'Run and Debug' 탭** (벌레 모양 아이콘) 클릭
2. **상단 드롭다운에서 "Launch Chrome with Class Planner" 선택**
3. **녹색 재생 버튼(▶︎) 클릭**

### 4단계: 디버그 콘솔 확인

- **Cursor 하단의 "DEBUG CONSOLE" 탭**에서 실시간 로그 확인
- 모든 `console.log`가 여기에 실시간으로 표시됩니다!

## 🧪 자동화 테스트와 함께 사용

### 디버거 모드로 자동화 테스트 실행

```bash
# 1. 먼저 Cursor 디버거로 Chrome 실행 (위 3단계)
# 2. 그 다음 터미널에서:
npm run test:debug
```

이렇게 하면:

- ✅ **자동 로그인** (Google OAuth)
- ✅ **자동 기능 테스트** (학생/과목/시간표)
- ✅ **실시간 콘솔 로그** (Cursor DEBUG CONSOLE에 표시)
- ✅ **자동 디버깅** (에러 발생 시 즉시 확인 가능)

## 🎯 사용 시나리오

### 시나리오 1: 일반 디버깅

1. Cursor 디버거로 Chrome 실행
2. 브라우저에서 수동으로 기능 테스트
3. DEBUG CONSOLE에서 실시간 로그 확인
4. AI 채팅에 로그 복사/붙여넣기

### 시나리오 2: 자동화 테스트 + 디버깅

1. Cursor 디버거로 Chrome 실행
2. `npm run test:debug` 실행
3. 자동화된 테스트 진행
4. DEBUG CONSOLE에서 모든 로그 실시간 확인
5. 문제 발생 시 즉시 디버깅 가능

## 🔧 고급 설정

### Chrome 디버깅 포트 활성화

Chrome을 디버깅 포트로 실행하려면:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
chrome.exe --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

### 소스맵 설정

TypeScript 파일의 디버깅을 위해 `vite.config.ts`에 소스맵 설정:

```typescript
export default defineConfig({
  build: {
    sourcemap: true,
  },
});
```

## 🚨 문제 해결

### 문제 1: Chrome 연결 실패

- **해결**: Chrome이 디버깅 포트로 실행되었는지 확인
- **확인**: `http://localhost:9222` 접속 가능한지 확인

### 문제 2: 소스맵이 작동하지 않음

- **해결**: `vite.config.ts`에서 `sourcemap: true` 설정
- **확인**: 개발 서버 재시작

### 문제 3: 디버그 콘솔에 로그가 안 보임

- **해결**: Cursor의 DEBUG CONSOLE 탭이 활성화되었는지 확인
- **확인**: 브라우저 콘솔과 Cursor 디버그 콘솔이 동기화되었는지 확인

## 📊 장점

### 기존 방식 vs 디버거 방식

| 구분      | 기존 방식              | 디버거 방식            |
| --------- | ---------------------- | ---------------------- |
| 로그 확인 | 브라우저 콘솔에서 복사 | Cursor에서 실시간 확인 |
| 작업 효율 | 복사/붙여넣기 필요     | 바로 복사 가능         |
| 디버깅    | 수동으로 문제 찾기     | 자동화 + 실시간 디버깅 |
| AI 지원   | 로그를 일일이 전달     | 실시간 로그 공유       |

## 🎉 결론

이제 **Chrome의 모든 콘솔 로그가 Cursor로 실시간으로 들어옵니다!**

- 🚀 **자동화 테스트** + **실시간 디버깅**
- 📝 **콘솔 로그 복사/붙여넣기 불필요**
- 🤖 **AI와 실시간 로그 공유**
- ⚡ **개발 효율성 극대화**

**이제 정말로 Chrome과 Cursor가 하나가 되었습니다!** 🎯


