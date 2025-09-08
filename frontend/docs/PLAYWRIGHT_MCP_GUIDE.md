# 🎭 Playwright MCP 테스트 시스템

## 📋 개요

Playwright MCP를 활용한 간단하고 강력한 브라우저 자동화 테스트 시스템입니다.

## 🚀 주요 장점

### 기존 Puppeteer vs Playwright MCP

| 구분 | Puppeteer 방식 | Playwright MCP 방식 |
|------|----------------|---------------------|
| **코드 복잡도** | 복잡한 설정 필요 | 간단한 함수 호출 |
| **에러 처리** | 수동 구현 | 자동 처리 |
| **디버깅** | 별도 설정 필요 | 내장 스크린샷/로그 |
| **유지보수** | 높은 복잡도 | 낮은 복잡도 |
| **실시간 모니터링** | 제한적 | 풍부한 기능 |

## 🎯 테스트 시나리오

### 1. 자동 로그인 테스트
```javascript
// Playwright MCP 방식
await mcp_playwright_browser_navigate({url: "http://localhost:5173/class_planner/students"});
await mcp_playwright_browser_click({element: "로그인 버튼", ref: "login-button"});
await mcp_playwright_browser_click({element: "Google 로그인", ref: "google-login"});
await mcp_playwright_browser_type({element: "이메일 입력", ref: "email-input", text: process.env.TEST_EMAIL});
await mcp_playwright_browser_type({element: "비밀번호 입력", ref: "password-input", text: process.env.TEST_PASSWORD});
```

### 2. 기능 테스트
```javascript
// 학생 관리 테스트
await mcp_playwright_browser_type({element: "학생 입력", ref: "student-input", text: "테스트학생1"});
await mcp_playwright_browser_press_key({key: "Enter"});

// 과목 관리 테스트
await mcp_playwright_browser_navigate({url: "http://localhost:5173/class_planner/subjects"});
await mcp_playwright_browser_type({element: "과목 입력", ref: "subject-input", text: "수학"});
await mcp_playwright_browser_press_key({key: "Enter"});
```

### 3. 실시간 모니터링
```javascript
// 콘솔 로그 확인
const consoleMessages = await mcp_playwright_browser_console_messages({random_string: ""});

// 네트워크 요청 확인
const networkRequests = await mcp_playwright_browser_network_requests({random_string: ""});

// 스크린샷 촬영
await mcp_playwright_browser_take_screenshot({filename: "test-result.png"});
```

## 🔧 사용 방법

### 1. 기본 테스트 실행
```bash
# Playwright MCP는 Cursor 내에서 직접 실행
# 별도 스크립트 파일 불필요
```

### 2. 단계별 테스트
1. **브라우저 열기**: `mcp_playwright_browser_navigate`
2. **요소 클릭**: `mcp_playwright_browser_click`
3. **텍스트 입력**: `mcp_playwright_browser_type`
4. **결과 확인**: `mcp_playwright_browser_take_screenshot`

### 3. 디버깅
- **콘솔 로그**: `mcp_playwright_browser_console_messages`
- **네트워크**: `mcp_playwright_browser_network_requests`
- **스크린샷**: `mcp_playwright_browser_take_screenshot`

## 🎉 결론

**Playwright MCP는 기존 Puppeteer 방식보다 훨씬 간단하고 강력합니다!**

- 🚀 **코드 간소화**: 복잡한 설정 → 간단한 함수 호출
- 🐛 **자동 디버깅**: 스크린샷, 로그, 네트워크 모니터링
- ⚡ **실시간 테스트**: Cursor 내에서 직접 실행
- 🎯 **유지보수 용이**: 낮은 복잡도, 높은 안정성

**이제 정말로 브라우저 테스트가 간단해졌습니다!** 🎭

