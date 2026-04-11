#!/usr/bin/env node

/**
 * 테스트 결과 캐싱 시스템
 *
 * 이 스크립트는 테스트 결과를 캐시하여 불필요한 테스트 재실행을 방지합니다.
 * 파일 변경 감지, Git 커밋 해시 기반 캐싱을 지원합니다.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

class TestCache {
  constructor() {
    this.cacheDir = path.join(__dirname, "..", ".test-cache");
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 현재 Git 커밋 해시를 가져옵니다
   */
  getCurrentCommitHash() {
    try {
      return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch (error) {
      return "no-git";
    }
  }

  /**
   * 소스 코드의 해시를 계산합니다
   */
  getSourceHash() {
    const srcDir = path.join(__dirname, "..", "src");
    const testDir = path.join(__dirname, "..", "tests");

    let allFiles = [];

    // src 디렉토리의 모든 파일
    if (fs.existsSync(srcDir)) {
      allFiles = allFiles.concat(this.getAllFiles(srcDir));
    }

    // tests 디렉토리의 모든 파일
    if (fs.existsSync(testDir)) {
      allFiles = allFiles.concat(this.getAllFiles(testDir));
    }

    // package.json과 설정 파일들
    const configFiles = [
      "package.json",
      "playwright.config.ts",
      "vitest.config.ts",
      "tsconfig.json",
    ];

    configFiles.forEach((file) => {
      const filePath = path.join(__dirname, "..", file);
      if (fs.existsSync(filePath)) {
        allFiles.push(filePath);
      }
    });

    // 파일 내용의 해시 계산
    const hash = crypto.createHash("md5");
    allFiles.forEach((file) => {
      try {
        const content = fs.readFileSync(file, "utf8");
        hash.update(content);
      } catch (error) {
        // 파일 읽기 실패 시 무시
      }
    });

    return hash.digest("hex");
  }

  /**
   * 디렉토리의 모든 파일을 재귀적으로 가져옵니다
   */
  getAllFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir);

    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (
        stat.isDirectory() &&
        !item.startsWith(".") &&
        item !== "node_modules"
      ) {
        files = files.concat(this.getAllFiles(fullPath));
      } else if (stat.isFile() && this.isRelevantFile(item)) {
        files.push(fullPath);
      }
    });

    return files;
  }

  /**
   * 관련 파일인지 확인합니다
   */
  isRelevantFile(filename) {
    const relevantExtensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".css"];
    return relevantExtensions.some((ext) => filename.endsWith(ext));
  }

  /**
   * 캐시 키를 생성합니다
   */
  getCacheKey(testType) {
    const commitHash = this.getCurrentCommitHash();
    const sourceHash = this.getSourceHash();
    return `${testType}-${commitHash}-${sourceHash}`;
  }

  /**
   * 캐시된 테스트 결과를 가져옵니다
   */
  getCachedResult(testType) {
    const cacheKey = this.getCacheKey(testType);
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);

    if (!fs.existsSync(cacheFile)) {
      return null;
    }

    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      const now = Date.now();
      const cacheAge = now - cached.timestamp;

      // 캐시가 1시간 이내인 경우만 유효
      if (cacheAge < 60 * 60 * 1000) {
        console.log(
          `✅ 캐시된 테스트 결과 사용: ${testType} (${Math.round(
            cacheAge / 1000
          )}초 전)`
        );
        return cached.result;
      } else {
        console.log(
          `⏰ 캐시 만료: ${testType} (${Math.round(cacheAge / 1000 / 60)}분 전)`
        );
        return null;
      }
    } catch (error) {
      console.log(`❌ 캐시 읽기 실패: ${testType}`);
      return null;
    }
  }

  /**
   * 테스트 결과를 캐시에 저장합니다
   */
  saveCachedResult(testType, result) {
    const cacheKey = this.getCacheKey(testType);
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);

    const cacheData = {
      testType,
      result,
      timestamp: Date.now(),
      commitHash: this.getCurrentCommitHash(),
      sourceHash: this.getSourceHash(),
    };

    try {
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 테스트 결과 캐시 저장: ${testType}`);
    } catch (error) {
      console.log(`❌ 캐시 저장 실패: ${testType}`, error.message);
    }
  }

  /**
   * 캐시를 정리합니다 (오래된 캐시 삭제)
   */
  cleanupCache() {
    const files = fs.readdirSync(this.cacheDir);
    const now = Date.now();
    let cleanedCount = 0;

    files.forEach((file) => {
      const filePath = path.join(this.cacheDir, file);
      try {
        const stat = fs.statSync(filePath);
        const age = now - stat.mtime.getTime();

        // 24시간 이상 된 캐시 파일 삭제
        if (age > 24 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (error) {
        // 파일 삭제 실패 시 무시
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 캐시 정리 완료: ${cleanedCount}개 파일 삭제`);
    }
  }

  /**
   * 특정 테스트 타입의 캐시를 무효화합니다
   */
  invalidateCache(testType) {
    const files = fs.readdirSync(this.cacheDir);
    let invalidatedCount = 0;

    files.forEach((file) => {
      if (file.startsWith(testType)) {
        const filePath = path.join(this.cacheDir, file);
        try {
          fs.unlinkSync(filePath);
          invalidatedCount++;
        } catch (error) {
          // 파일 삭제 실패 시 무시
        }
      }
    });

    if (invalidatedCount > 0) {
      console.log(
        `🗑️ 캐시 무효화: ${testType} (${invalidatedCount}개 파일 삭제)`
      );
    }
  }
}

// CLI 인터페이스
if (require.main === module) {
  const testCache = new TestCache();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      "사용법: node test-cache.js <testType> [--save] [--cleanup] [--invalidate]"
    );
    console.log("testType: unit, integration, e2e, system");
    process.exit(1);
  }

  const testType = args[0];
  const command = args[1];

  switch (command) {
    case "--save":
      // 테스트 결과 저장 (실제로는 스크립트에서 호출)
      console.log(`💾 ${testType} 테스트 결과 저장 준비됨`);
      break;

    case "--cleanup":
      testCache.cleanupCache();
      break;

    case "--invalidate":
      testCache.invalidateCache(testType);
      break;

    default:
      // 캐시된 결과 확인
      const cached = testCache.getCachedResult(testType);
      if (cached) {
        process.exit(0); // 성공 (캐시 있음)
      } else {
        process.exit(1); // 실패 (캐시 없음)
      }
  }
}

module.exports = TestCache;
