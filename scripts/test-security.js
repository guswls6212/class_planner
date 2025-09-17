const https = require("https");
const http = require("http");

// 테스트할 URL들
const testUrls = [
  "http://localhost:3000/api/data",
  "https://localhost:3000/api/data", // HTTPS 테스트
];

// CORS 테스트
async function testCORS(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith("https") ? https : http;

    const options = {
      method: "OPTIONS",
      headers: {
        Origin: "https://malicious-site.com", // 악성 사이트 시뮬레이션
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type",
      },
    };

    const req = protocol.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (err) => {
      resolve({ error: err.message });
    });

    req.end();
  });
}

// 보안 헤더 테스트
async function testSecurityHeaders(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith("https") ? https : http;

    const req = protocol.request(url, (res) => {
      resolve({
        status: res.statusCode,
        headers: res.headers,
      });
    });

    req.on("error", (err) => {
      resolve({ error: err.message });
    });

    req.end();
  });
}

// 테스트 실행
async function runTests() {
  console.log("🔒 보안 설정 테스트 시작...\n");

  for (const url of testUrls) {
    console.log(`📡 테스트 URL: ${url}`);

    // CORS 테스트
    console.log("  🔍 CORS 테스트...");
    const corsResult = await testCORS(url);

    if (corsResult.error) {
      console.log(`    ❌ 연결 실패: ${corsResult.error}`);
    } else {
      console.log(`    📊 상태 코드: ${corsResult.status}`);

      if (corsResult.status === 403) {
        console.log("    ✅ CORS 차단 성공 (403 Forbidden)");
      } else if (corsResult.status === 200) {
        console.log("    ⚠️  CORS 허용됨 (개발 환경에서는 정상)");
      } else {
        console.log(`    ❓ 예상치 못한 상태 코드: ${corsResult.status}`);
      }

      // CORS 헤더 확인
      const corsHeaders = [
        "access-control-allow-origin",
        "access-control-allow-methods",
        "access-control-allow-headers",
      ];

      corsHeaders.forEach((header) => {
        if (corsResult.headers[header]) {
          console.log(`    📋 ${header}: ${corsResult.headers[header]}`);
        }
      });
    }

    // 보안 헤더 테스트
    console.log("  🛡️  보안 헤더 테스트...");
    const headerResult = await testSecurityHeaders(url);

    if (headerResult.error) {
      console.log(`    ❌ 연결 실패: ${headerResult.error}`);
    } else {
      const securityHeaders = [
        "strict-transport-security",
        "x-content-type-options",
        "x-frame-options",
        "x-xss-protection",
        "referrer-policy",
      ];

      securityHeaders.forEach((header) => {
        if (headerResult.headers[header]) {
          console.log(`    ✅ ${header}: ${headerResult.headers[header]}`);
        } else {
          console.log(`    ❌ ${header}: 없음`);
        }
      });
    }

    console.log("");
  }

  console.log("🎉 보안 테스트 완료!");
}

// 테스트 실행
runTests().catch(console.error);
