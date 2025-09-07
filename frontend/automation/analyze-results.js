/**
 * 테스트 결과 분석 스크립트
 * 자동 테스트로 수집된 로그를 분석하고 문제점을 진단합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeTestResults() {
  const resultsDir = path.join(__dirname, 'test-results');

  if (!fs.existsSync(resultsDir)) {
    console.log(
      '❌ test-results 폴더가 없습니다. 먼저 자동 테스트를 실행해주세요.'
    );
    return;
  }

  const files = fs
    .readdirSync(resultsDir)
    .filter(file => file.startsWith('test-result-') && file.endsWith('.json'))
    .sort()
    .reverse(); // 최신 파일부터

  if (files.length === 0) {
    console.log('❌ 테스트 결과 파일이 없습니다.');
    return;
  }

  const latestFile = files[0];
  const resultPath = path.join(resultsDir, latestFile);
  const testResult = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

  console.log('📊 테스트 결과 분석');
  console.log('='.repeat(50));
  console.log(`📅 테스트 시간: ${testResult.timestamp}`);
  console.log(`📝 총 콘솔 로그: ${testResult.summary.totalConsoleLogs}개`);
  console.log(
    `🌐 총 네트워크 요청: ${testResult.summary.totalNetworkRequests}개`
  );
  console.log(`❌ 에러: ${testResult.summary.errors}개`);
  console.log(`⚠️  경고: ${testResult.summary.warnings}개`);

  // 이미지 분석 결과
  const fullPageImage = path.join(resultsDir, 'full-page-after-login.png');
  const modalImage = path.join(resultsDir, 'data-sync-modal.png');

  console.log('');
  console.log('🖼️ 화면 이미지 분석');
  console.log('='.repeat(50));

  if (fs.existsSync(fullPageImage)) {
    console.log('✅ 전체 페이지 스크린샷 저장됨:', fullPageImage);
  } else {
    console.log('❌ 전체 페이지 스크린샷 없음');
  }

  if (fs.existsSync(modalImage)) {
    console.log('✅ 데이터 동기화 모달 스크린샷 저장됨:', modalImage);
    console.log('   → 모달이 화면에 표시되었습니다!');
  } else {
    console.log('❌ 데이터 동기화 모달 스크린샷 없음');
    console.log('   → 모달이 화면에 표시되지 않았습니다.');
  }

  console.log('');

  // 중요한 로그 필터링
  const importantLogs = testResult.consoleLogs.filter(
    log =>
      log.text.includes('데이터 동기화') ||
      log.text.includes('모달') ||
      log.text.includes('로그인') ||
      log.text.includes('Supabase') ||
      log.text.includes('useDataSync') ||
      log.text.includes('checkSyncNeeded') ||
      log.type === 'error'
  );

  console.log('🔍 중요한 로그 분석');
  console.log('='.repeat(50));

  importantLogs.forEach(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    console.log(`[${time}] [${log.type.toUpperCase()}] ${log.text}`);
  });

  console.log('');
  console.log('🎯 문제점 진단');
  console.log('='.repeat(50));

  // 문제점 진단
  const hasModalLogs = importantLogs.some(log => log.text.includes('모달'));
  const hasDataSyncLogs = importantLogs.some(log =>
    log.text.includes('데이터 동기화')
  );
  const hasErrors = testResult.summary.errors > 0;
  const hasSupabaseErrors = importantLogs.some(
    log => log.text.includes('Supabase') && log.type === 'error'
  );

  if (!hasModalLogs) {
    console.log('❌ 데이터 동기화 모달 관련 로그가 없습니다.');
    console.log('   → 모달이 표시되지 않았을 가능성이 높습니다.');
  } else {
    console.log('✅ 데이터 동기화 모달 관련 로그가 발견되었습니다.');
  }

  if (!hasDataSyncLogs) {
    console.log('❌ 데이터 동기화 관련 로그가 없습니다.');
    console.log('   → useDataSync 훅이 실행되지 않았을 가능성이 높습니다.');
  } else {
    console.log('✅ 데이터 동기화 관련 로그가 발견되었습니다.');
  }

  if (hasErrors) {
    console.log('❌ 에러가 발생했습니다.');
    console.log('   → 콘솔 로그에서 에러 내용을 확인해주세요.');
  } else {
    console.log('✅ 에러가 없습니다.');
  }

  if (hasSupabaseErrors) {
    console.log('❌ Supabase 관련 에러가 발생했습니다.');
    console.log('   → Supabase 설정을 확인해주세요.');
  } else {
    console.log('✅ Supabase 관련 에러가 없습니다.');
  }

  console.log('');
  console.log('📋 권장 사항');
  console.log('='.repeat(50));

  if (!hasModalLogs) {
    console.log('1. 모달 상태 업데이트 로직을 확인해주세요.');
    console.log('2. setSyncModal 호출이 제대로 되고 있는지 확인해주세요.');
  }

  if (!hasDataSyncLogs) {
    console.log('1. useDataSync 훅이 제대로 호출되고 있는지 확인해주세요.');
    console.log('2. LoginButton에서 checkSyncNeeded 호출을 확인해주세요.');
  }

  console.log('');
  console.log(`📁 전체 결과는 다음 파일에서 확인할 수 있습니다: ${resultPath}`);
}

// 분석 실행
analyzeTestResults();
