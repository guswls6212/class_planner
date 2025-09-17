const fs = require("fs");
const path = require("path");

// CORS 적용할 파일들
const apiFiles = [
  "src/app/api/students/route.ts",
  "src/app/api/subjects/route.ts",
  "src/app/api/sessions/route.ts",
  "src/app/api/user-settings/route.ts",
];

// CORS import 추가
const corsImport = `import { corsMiddleware, handleCorsOptions } from "@/middleware/cors";\n`;

// CORS 검증 코드
const corsCheck = `    // CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

`;

// OPTIONS 메서드
const optionsMethod = `
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}`;

apiFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");

    // 이미 CORS가 적용되어 있는지 확인
    if (content.includes("corsMiddleware")) {
      console.log(`✅ ${filePath} - CORS already applied`);
      return;
    }

    // import 추가
    if (!content.includes("corsMiddleware")) {
      content = content.replace(
        /import.*from.*"next\/server";/,
        `$&\n${corsImport.trim()}`
      );
    }

    // GET 메서드에 CORS 검증 추가
    content = content.replace(
      /export async function GET\(request: NextRequest\) \{\s*try \{/,
      `export async function GET(request: NextRequest) {\n  try {\n${corsCheck.trim()}\n`
    );

    // POST 메서드에 CORS 검증 추가
    content = content.replace(
      /export async function POST\(request: NextRequest\) \{\s*try \{/,
      `export async function POST(request: NextRequest) {\n  try {\n${corsCheck.trim()}\n`
    );

    // PUT 메서드에 CORS 검증 추가
    content = content.replace(
      /export async function PUT\(request: NextRequest\) \{\s*try \{/,
      `export async function PUT(request: NextRequest) {\n  try {\n${corsCheck.trim()}\n`
    );

    // DELETE 메서드에 CORS 검증 추가
    content = content.replace(
      /export async function DELETE\(request: NextRequest\) \{\s*try \{/,
      `export async function DELETE(request: NextRequest) {\n  try {\n${corsCheck.trim()}\n`
    );

    // OPTIONS 메서드 추가 (파일 끝에)
    if (!content.includes("export async function OPTIONS")) {
      content += optionsMethod;
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ ${filePath} - CORS applied`);
  } else {
    console.log(`❌ ${filePath} - File not found`);
  }
});

console.log("🎉 CORS application completed!");
