const fs = require("fs");
const path = require("path");

/**
 * 모든 객체 리터럴 문법 문제를 수정하는 스크립트
 */

function fixAllObjectLiteralIssues(content) {
  let fixed = content;

  // 1. 간단한 이중 중괄호 패턴: { { key: value } }
  fixed = fixed.replace(
    /logger\.(debug|info|warn|error)\s*\(\s*"([^"]*)",?\s*\{\s*\{\s*([^}]+)\s*\}\s*\}\s*\)/g,
    'logger.$1("$2", { $3 })'
  );

  // 2. 복잡한 이중 중괄호 패턴 (멀티라인)
  fixed = fixed.replace(
    /logger\.(debug|info|warn|error)\s*\(\s*"([^"]*)",?\s*\{\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\}\s*\)/gs,
    'logger.$1("$2", {$3})'
  );

  // 3. 잘못된 객체 키 패턴 (점 표기법): { user.email }
  fixed = fixed.replace(
    /logger\.(debug|info|warn|error)\s*\(\s*"([^"]*)",?\s*\{\s*([^}]*\.[^}]*)\s*\}\s*\)/g,
    (match, level, message, keys) => {
      // 점 표기법을 올바른 키-값 쌍으로 변환
      const fixedKeys = keys.replace(
        /([a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*)/g,
        (dotNotation) => {
          const parts = dotNotation.split(".");
          const keyName = parts[parts.length - 1];
          return `${keyName}: ${dotNotation}`;
        }
      );
      return `logger.${level}("${message}", { ${fixedKeys} })`;
    }
  );

  // 4. 잘못된 불리언 표현식: { !!variable }
  fixed = fixed.replace(
    /logger\.(debug|info|warn|error)\s*\(\s*"([^"]*)",?\s*\{\s*(!![\w.]+)\s*\}\s*\)/g,
    (match, level, message, boolExpr) => {
      const varName = boolExpr.replace(/!!/g, "").replace(/\./g, "");
      return `logger.${level}("${message}", { ${varName}: ${boolExpr} })`;
    }
  );

  // 5. 잘못된 따옴표 키: { "error:", value }
  fixed = fixed.replace(
    /logger\.(debug|info|warn|error)\s*\(\s*"([^"]*)",?\s*\{\s*([^}]*"[^"]*":\s*[^}]*)\s*\}\s*\)/g,
    (match, level, message, content) => {
      const fixedContent = content.replace(/"([^"]*)":/g, "$1:");
      return `logger.${level}("${message}", { ${fixedContent} })`;
    }
  );

  return fixed;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const fixedContent = fixAllObjectLiteralIssues(content);

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

// schedule/page.tsx 파일 처리
const targetFile = "src/app/schedule/page.tsx";

console.log("모든 객체 리터럴 문법 수정 시작...\n");

if (processFile(targetFile)) {
  console.log(`\n🎉 ${targetFile} 파일의 객체 리터럴 문법이 수정되었습니다!`);
} else {
  console.log(`\n✅ ${targetFile} 파일은 수정이 필요하지 않습니다.`);
}
