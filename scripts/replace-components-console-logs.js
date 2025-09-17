const fs = require("fs");
const path = require("path");

// Components 디렉토리
const componentsDir = path.join(__dirname, "../src/components");

// 로깅 시스템 import 추가
const loggerImport = `import { logger } from "../../lib/logger";`;

// console.log 패턴과 대체할 로깅 패턴
const replacements = [
  // 디버그 로그 (🔍)
  {
    pattern: /console\.log\("🔍 ([^"]+)", ([^)]+)\);/g,
    replacement: 'logger.debug("$1", { $2 });',
  },
  {
    pattern: /console\.log\("🔍 ([^"]+)"\);/g,
    replacement: 'logger.debug("$1");',
  },

  // 에러 로그
  {
    pattern: /console\.error\("([^"]+)", ([^)]+)\);/g,
    replacement: 'logger.error("$1", undefined, $2);',
  },
  {
    pattern: /console\.error\("([^"]+)"\);/g,
    replacement: 'logger.error("$1");',
  },

  // 일반 정보 로그
  {
    pattern: /console\.log\("([^"]+)", ([^)]+)\);/g,
    replacement: 'logger.info("$1", { $2 });',
  },
  {
    pattern: /console\.log\("([^"]+)"\);/g,
    replacement: 'logger.info("$1");',
  },
];

function addLoggerImport(content) {
  // 이미 logger import가 있는지 확인
  if (content.includes("import { logger }")) {
    return content;
  }

  // 첫 번째 import 다음에 logger import 추가
  const firstImportMatch = content.match(/import.*from.*["'].*["'];/);
  if (firstImportMatch) {
    const insertIndex = firstImportMatch.index + firstImportMatch[0].length;
    return (
      content.slice(0, insertIndex) +
      "\n" +
      loggerImport +
      content.slice(insertIndex)
    );
  }

  return loggerImport + "\n" + content;
}

function replaceConsoleLogs(content) {
  let updatedContent = content;

  // 각 패턴에 대해 대체 실행
  replacements.forEach(({ pattern, replacement }) => {
    updatedContent = updatedContent.replace(pattern, replacement);
  });

  return updatedContent;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;

    // console.log가 있는지 확인
    if (content.includes("console.log") || content.includes("console.error")) {
      // logger import 추가
      const contentWithImport = addLoggerImport(content);
      if (contentWithImport !== content) {
        content = contentWithImport;
        changed = true;
      }

      // console.log 대체
      const updatedContent = replaceConsoleLogs(content);
      if (updatedContent !== content) {
        content = updatedContent;
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`✅ ${filePath} - Console logs replaced`);
      } else {
        console.log(`✅ ${filePath} - No changes needed`);
      }
    } else {
      console.log(`✅ ${filePath} - No console logs found`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      processFile(fullPath);
    }
  });
}

// Components 디렉토리 처리
walkDir(componentsDir);
console.log("🎉 Components console log replacement completed!");
