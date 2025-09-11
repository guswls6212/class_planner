// localStorage 정리 스크립트
// 브라우저 콘솔에서 실행하여 기존 데이터 정리

console.log("🧹 localStorage 정리 시작...");

// 정리할 키들 정의
const keysToRemove = [
  "students",
  "subjects",
  "sessions",
  "enrollments",
  "classPlannerData",
];

// 유지할 키들 정의 (UI 상태 및 테마)
const keysToKeep = [
  "theme",
  "ui:studentsPanelPos",
  "ui:selectedStudent",
  "supabase_user_id",
  "sb-kcyqftasdxtqslrhbctv-auth-token",
];

console.log("📋 현재 localStorage 키들:");
Object.keys(localStorage).forEach((key) => {
  console.log(`  - ${key}`);
});

console.log("\n🗑️ 데이터 키들 제거 중...");
keysToRemove.forEach((key) => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`  ✅ ${key} 제거됨`);
  } else {
    console.log(`  ⚪ ${key} 없음 (이미 제거됨)`);
  }
});

console.log("\n✅ 유지할 키들:");
keysToKeep.forEach((key) => {
  if (localStorage.getItem(key)) {
    console.log(`  ✅ ${key} 유지됨`);
  } else {
    console.log(`  ⚪ ${key} 없음`);
  }
});

console.log("\n🎯 정리 완료! 이제 Supabase 데이터만 사용됩니다.");
console.log("📝 남은 키들:", Object.keys(localStorage));
