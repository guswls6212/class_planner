const fs = require("fs");
const path = require("path");

/**
 * 잘못된 객체 리터럴 문법을 수정하는 스크립트
 * { { key: value } } -> { key: value }
 */

function fixObjectLiteralSyntax(content) {
  // logger 호출에서 이중 중괄호 패턴 수정
  return content.replace(
    /logger\.(debug|info|warn|error)\s*\(\s*"([^"]*)",?\s*\{\s*\{([^}]+)\}\s*\}\s*\)/g,
    'logger.$1("$2", {$3})'
  );
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const fixedContent = fixObjectLiteralSyntax(content);

    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✅ ${filePath} - 객체 리터럴 문법 수정됨`);
      return true;
    } else {
      console.log(`✅ ${filePath} - 수정 불필요`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${filePath} - 처리 실패:`, error.message);
    return false;
  }
}

// 처리할 파일 패턴
const targetFiles = [
  "src/app/schedule/page.tsx",
  "src/app/login/page.tsx",
  "src/components/atoms/AuthGuard.tsx",
  "src/components/atoms/LoginButton.tsx",
  "src/infrastructure/config/RepositoryConfig.ts",
  "src/infrastructure/container/RepositoryInitializer.ts",
  "src/infrastructure/container/RepositoryRegistry.ts",
];

console.log("객체 리터럴 문법 수정 시작...\n");

let fixedCount = 0;
for (const file of targetFiles) {
  if (processFile(file)) {
    fixedCount++;
  }
}

console.log(
  `\n🎉 총 ${fixedCount}개 파일의 객체 리터럴 문법이 수정되었습니다!`
);
