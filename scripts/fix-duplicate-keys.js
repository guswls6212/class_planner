const fs = require("fs");

/**
 * 중복된 키 패턴을 수정하는 스크립트
 * 예: { key: key: value } -> { key: value }
 */

function fixDuplicateKeys(content) {
  // 패턴: key: key: value -> key: value
  return content.replace(/(\w+):\s*\1:\s*([^,}]+)/g, "$1: $2");
}

const filePath = "src/app/schedule/page.tsx";

try {
  const content = fs.readFileSync(filePath, "utf8");
  const fixedContent = fixDuplicateKeys(content);

  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent);
    console.log(`✅ ${filePath} - 중복 키 패턴 수정됨`);
  } else {
    console.log(`✅ ${filePath} - 수정 불필요`);
  }
} catch (error) {
  console.error(`❌ ${filePath} - 처리 실패:`, error.message);
}
