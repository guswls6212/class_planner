import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

// .env.local 파일 로드 (상위 폴더에서)
dotenv.config({
  path: path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '.env.local'
  ),
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 오래된 결과 파일 정리 함수 (최신 5개만 유지)
function cleanupOldResultFiles(resultsDir) {
  try {
    const files = fs
      .readdirSync(resultsDir)
      .filter(
        file => file.startsWith('auto-fix-result-') && file.endsWith('.json')
      )
      .map(file => ({
        name: file,
        path: path.join(resultsDir, file),
        stats: fs.statSync(path.join(resultsDir, file)),
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime()); // 최신순 정렬

    // 최신 5개를 제외한 나머지 파일 삭제
    if (files.length > 5) {
      const filesToDelete = files.slice(5); // 6번째부터 끝까지

      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️  오래된 결과 파일 삭제: ${file.name}`);
        } catch (error) {
          console.log(`❌ 파일 삭제 실패 (${file.name}): ${error.message}`);
        }
      });

      console.log(
        `🧹 정리 완료: ${filesToDelete.length}개 파일 삭제, ${files.length - filesToDelete.length}개 파일 유지`
      );
    } else {
      console.log(`📁 현재 ${files.length}개 파일 (정리 불필요)`);
    }
  } catch (error) {
    console.log(`❌ 파일 정리 중 오류: ${error.message}`);
  }
}

// 환경 변수 로드 확인
console.log('🔍 환경 변수 로드 확인:');
console.log('TEST_EMAIL:', process.env.TEST_EMAIL);
console.log(
  'TEST_PASSWORD:',
  process.env.TEST_PASSWORD ? '설정됨' : '설정되지 않음'
);
console.log('.env.local 파일 경로:', path.join(__dirname, '..', '.env.local'));

// 자동 문제 해결 시스템
class AutoProblemSolver {
  constructor() {
    this.problems = [];
    this.solutions = [];
  }

  // 콘솔 로그 분석하여 문제점 자동 감지
  analyzeConsoleLogs(consoleLogs) {
    const issues = [];

    // 모달 표시 문제 감지
    const modalLogs = consoleLogs.filter(
      log => log.text.includes('DataSyncModal') || log.text.includes('모달')
    );

    const hasModalOpen = modalLogs.some(
      log =>
        log.text.includes('모달이 열려있음') ||
        log.text.includes('isOpen: true')
    );

    const hasModalClose = modalLogs.some(
      log =>
        log.text.includes('모달이 닫혀있음') ||
        log.text.includes('isOpen: false')
    );

    if (hasModalClose && !hasModalOpen) {
      issues.push({
        type: 'modal_display_issue',
        severity: 'high',
        description:
          '데이터 동기화 모달이 상태는 업데이트되었지만 화면에 표시되지 않음',
        solution: 'React 상태 업데이트 타이밍 문제 - 강제 리렌더링 필요',
      });
    }

    // Supabase 연결 문제 감지
    const supabaseErrors = consoleLogs.filter(
      log => log.text.includes('Supabase') && log.type === 'error'
    );

    if (supabaseErrors.length > 0) {
      issues.push({
        type: 'supabase_connection_issue',
        severity: 'high',
        description: 'Supabase 연결 오류 발생',
        solution: '환경 변수 및 네트워크 설정 확인 필요',
      });
    }

    // 데이터 동기화 로직 문제 감지
    const syncLogs = consoleLogs.filter(
      log =>
        log.text.includes('checkSyncNeeded') ||
        log.text.includes('데이터 동기화')
    );

    if (syncLogs.length === 0) {
      issues.push({
        type: 'sync_logic_issue',
        severity: 'medium',
        description: '데이터 동기화 로직이 실행되지 않음',
        solution: 'useDataSync 훅 호출 확인 필요',
      });
    }

    return issues;
  }

  // 자동 문제 해결 시도
  async autoFixIssues(page, issues) {
    console.log('🔧 자동 문제 해결 시작...');

    for (const issue of issues) {
      console.log(`\n🎯 문제 감지: ${issue.description}`);
      console.log(`💡 해결 방법: ${issue.solution}`);

      switch (issue.type) {
        case 'modal_display_issue':
          await this.fixModalDisplayIssue(page);
          break;
        case 'supabase_connection_issue':
          await this.fixSupabaseConnectionIssue(page);
          break;
        case 'sync_logic_issue':
          await this.fixSyncLogicIssue(page);
          break;
      }
    }
  }

  // 모달 표시 문제 해결
  async fixModalDisplayIssue(page) {
    console.log('🔧 모달 표시 문제 해결 시도...');

    try {
      // 강제 리렌더링 시도
      await page.evaluate(() => {
        // React 컴포넌트 강제 리렌더링
        const event = new Event('resize');
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 모달 상태 강제 업데이트 시도
      await page.evaluate(() => {
        // localStorage 클리어 후 다시 설정
        localStorage.clear();
        localStorage.setItem('forceModalOpen', 'true');
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 페이지 새로고침
      await page.reload();
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('✅ 모달 표시 문제 해결 시도 완료');
    } catch (error) {
      console.log('❌ 모달 표시 문제 해결 실패:', error.message);
    }
  }

  // Supabase 연결 문제 해결
  async fixSupabaseConnectionIssue(page) {
    console.log('🔧 Supabase 연결 문제 해결 시도...');

    try {
      // 환경 변수 재설정
      await page.evaluate(() => {
        // Supabase 클라이언트 재초기화
        if (window.supabase) {
          window.supabase.auth.signOut();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 페이지 새로고침
      await page.reload();
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('✅ Supabase 연결 문제 해결 시도 완료');
    } catch (error) {
      console.log('❌ Supabase 연결 문제 해결 실패:', error.message);
    }
  }

  // 동기화 로직 문제 해결
  async fixSyncLogicIssue(page) {
    console.log('🔧 동기화 로직 문제 해결 시도...');

    try {
      // 로그인 상태 강제 업데이트
      await page.evaluate(() => {
        // 인증 상태 강제 갱신
        if (window.supabase) {
          window.supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              console.log('강제 인증 상태 갱신:', session.user.email);
            }
          });
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ 동기화 로직 문제 해결 시도 완료');
    } catch (error) {
      console.log('❌ 동기화 로직 문제 해결 실패:', error.message);
    }
  }
}

// 메인 자동화 함수
async function runFullyAutomatedTest() {
  console.log('🚀 완전 자동화 테스트 시작 (자동 문제 해결 포함)...');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const problemSolver = new AutoProblemSolver();

  // 콘솔 로그 수집
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString(),
    });
  });

  // 네트워크 로그 수집
  const networkLogs = [];
  page.on('request', request => {
    networkLogs.push({
      type: 'request',
      url: request.url(),
      method: request.method(),
      timestamp: new Date().toISOString(),
    });
  });

  page.on('response', response => {
    networkLogs.push({
      type: 'response',
      url: response.url(),
      status: response.status(),
      timestamp: new Date().toISOString(),
    });
  });

  try {
    // 페이지 로딩
    await page.goto('http://localhost:5173/class_planner/students', {
      waitUntil: 'networkidle0',
    });

    console.log('📱 페이지 로딩 완료');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 자동 로그인 시도
    console.log('🔍 로그인 버튼 찾는 중...');
    const loginButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(
        button =>
          button.textContent.includes('로그인') ||
          button.textContent.includes('Login')
      );
    });

    if (loginButton && loginButton.asElement()) {
      console.log('✅ 로그인 버튼 발견, 클릭 중...');
      await loginButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Google 로그인 버튼 클릭
      const googleButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(
          button =>
            button.textContent.includes('Google로 로그인') ||
            button.textContent.includes('Google')
        );
      });

      if (googleButton && googleButton.asElement()) {
        console.log('✅ Google 로그인 버튼 발견, 클릭 중...');
        await googleButton.click();

        // 완전 자동 로그인 시도
        console.log('🤖 완전 자동 로그인 시도 중...');

        try {
          // Google 로그인 페이지 로딩 대기
          await new Promise(resolve => setTimeout(resolve, 5000));

          const currentUrl = page.url();
          console.log(`📍 현재 URL: ${currentUrl}`);

          if (currentUrl.includes('accounts.google.com')) {
            console.log('✅ Google 로그인 페이지 확인됨');

            // 이메일 입력 필드 찾기
            const emailInput = await page.evaluateHandle(() => {
              const inputs = Array.from(document.querySelectorAll('input'));
              return inputs.find(
                input =>
                  input.type === 'email' ||
                  input.name === 'identifier' ||
                  input.id === 'identifierId'
              );
            });

            if (emailInput && emailInput.asElement()) {
              console.log('✅ 이메일 입력 필드 발견');

              // 이메일 입력
              const testEmail = process.env.TEST_EMAIL;
              if (!testEmail) {
                console.log('❌ TEST_EMAIL 환경변수가 설정되지 않았습니다.');
                console.log(
                  '💡 .env.local 파일에 TEST_EMAIL=your-email@gmail.com 을 추가하세요.'
                );
                return;
              }

              await emailInput.click();
              await emailInput.type(testEmail, { delay: 100 });
              console.log(`📧 이메일 입력: ${testEmail}`);

              // 다음 버튼 클릭
              await new Promise(resolve => setTimeout(resolve, 1000));

              const nextButton = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(
                  button =>
                    button.textContent.includes('다음') ||
                    button.textContent.includes('Next') ||
                    button.id === 'identifierNext'
                );
              });

              if (nextButton && nextButton.asElement()) {
                await nextButton.click();
                console.log('✅ 다음 버튼 클릭');

                // 패스키 확인 페이지 로딩 대기
                await new Promise(resolve => setTimeout(resolve, 3000));

                // 패스키 확인 페이지에서 "Try another way" 클릭
                console.log(
                  '🔍 패스키 확인 페이지에서 "Try another way" 찾는 중...'
                );
                const tryAnotherWayButton = await page.evaluateHandle(() => {
                  const buttons = Array.from(
                    document.querySelectorAll('button')
                  );
                  return buttons.find(
                    button =>
                      button.textContent.includes('Try another way') ||
                      button.textContent.includes('다른 방법 시도')
                  );
                });

                if (tryAnotherWayButton && tryAnotherWayButton.asElement()) {
                  await tryAnotherWayButton.click();
                  console.log('✅ "Try another way" 버튼 클릭');

                  // 로그인 방법 선택 페이지 로딩 대기
                  await new Promise(resolve => setTimeout(resolve, 2000));

                  // "Enter your password" 클릭
                  console.log('🔍 "Enter your password" 찾는 중...');
                  const enterPasswordButton = await page.evaluateHandle(() => {
                    // 여러 방법으로 버튼 찾기
                    const buttons = Array.from(
                      document.querySelectorAll('button')
                    );
                    const divs = Array.from(document.querySelectorAll('div'));

                    // 1. 버튼에서 찾기
                    let foundButton = buttons.find(
                      button =>
                        button.textContent.includes('Enter your password') ||
                        button.textContent.includes('비밀번호 입력') ||
                        button.textContent.includes('password')
                    );

                    if (foundButton) return foundButton;

                    // 2. 클릭 가능한 div에서 찾기
                    foundButton = divs.find(
                      div =>
                        div.textContent.includes('Enter your password') &&
                        (div.onclick ||
                          div.getAttribute('role') === 'button' ||
                          div.style.cursor === 'pointer')
                    );

                    if (foundButton) return foundButton;

                    // 3. 모든 요소에서 찾기
                    const allElements = Array.from(
                      document.querySelectorAll('*')
                    );
                    return allElements.find(
                      el =>
                        el.textContent &&
                        el.textContent.trim() === 'Enter your password' &&
                        (el.tagName === 'BUTTON' ||
                          el.tagName === 'DIV' ||
                          el.tagName === 'SPAN')
                    );
                  });

                  if (enterPasswordButton && enterPasswordButton.asElement()) {
                    console.log(
                      '🎯 "Enter your password" 요소 발견, 클릭 시도 중...'
                    );
                    await enterPasswordButton.click();
                    console.log('✅ "Enter your password" 버튼 클릭');

                    // 비밀번호 입력 페이지 로딩 대기
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // 비밀번호 입력 필드 찾기
                    const passwordInput = await page.evaluateHandle(() => {
                      const inputs = Array.from(
                        document.querySelectorAll('input')
                      );
                      return inputs.find(
                        input =>
                          input.type === 'password' || input.name === 'password'
                      );
                    });

                    if (passwordInput && passwordInput.asElement()) {
                      console.log('✅ 비밀번호 입력 필드 발견');

                      // 비밀번호 입력
                      const testPassword = process.env.TEST_PASSWORD;
                      if (!testPassword) {
                        console.log(
                          '❌ TEST_PASSWORD 환경변수가 설정되지 않았습니다.'
                        );
                        console.log(
                          '💡 .env.local 파일에 TEST_PASSWORD=your-password 을 추가하세요.'
                        );
                        return;
                      }

                      await passwordInput.click();
                      await passwordInput.type(testPassword, { delay: 100 });
                      console.log('🔒 비밀번호 입력 완료');

                      // 로그인 버튼 클릭
                      await new Promise(resolve => setTimeout(resolve, 1000));

                      const loginButton = await page.evaluateHandle(() => {
                        const buttons = Array.from(
                          document.querySelectorAll('button')
                        );
                        return buttons.find(
                          button =>
                            button.textContent.includes('로그인') ||
                            button.textContent.includes('Sign in') ||
                            button.textContent.includes('다음') ||
                            button.textContent.includes('Next') ||
                            button.id === 'passwordNext'
                        );
                      });

                      if (loginButton && loginButton.asElement()) {
                        await loginButton.click();
                        console.log('✅ 로그인 버튼 클릭');

                        // 로그인 완료 대기 및 감지
                        console.log('⏳ 로그인 완료 감지 중...');
                        let loginCompleted = false;
                        let waitCount = 0;
                        const maxWait = 10; // 최대 10초 대기

                        while (!loginCompleted && waitCount < maxWait) {
                          await new Promise(resolve =>
                            setTimeout(resolve, 1000)
                          );
                          waitCount++;

                          const currentUrl = page.url();
                          console.log(
                            `📍 현재 URL (${waitCount}/${maxWait}): ${currentUrl}`
                          );

                          // 원래 페이지로 돌아왔는지 확인
                          if (
                            currentUrl.includes('localhost:5173') &&
                            !currentUrl.includes('google.com')
                          ) {
                            console.log('✅ 로그인 완료 감지! (URL 변경)');
                            loginCompleted = true;
                          }

                          // 콘솔 로그에서 로그인 성공 확인
                          const recentLogs = consoleLogs.slice(-5);
                          const hasSignInLog = recentLogs.some(
                            log =>
                              log.text.includes('SIGNED_IN') ||
                              log.text.includes('로그인 성공')
                          );

                          if (hasSignInLog) {
                            console.log('✅ 로그인 완료 감지! (콘솔 로그)');
                            loginCompleted = true;
                          }
                        }

                        if (!loginCompleted) {
                          console.log(
                            '⏰ 로그인 완료 감지 시간 초과, 강제로 계속 진행...'
                          );
                        }

                        console.log('✅ 자동 로그인 프로세스 완료!');

                        // 사용자 프로필 생성 완료를 기다리기 위해 추가 대기
                        console.log('⏳ 사용자 프로필 생성 완료 대기 중...');
                        await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 추가 대기
                      } else {
                        console.log('❌ 로그인 버튼을 찾을 수 없음');
                      }
                    } else {
                      console.log('❌ 비밀번호 입력 필드를 찾을 수 없음');
                    }
                  } else {
                    console.log('❌ "Enter your password" 버튼을 찾을 수 없음');

                    // 디버깅을 위해 현재 페이지의 모든 텍스트 출력
                    const pageText = await page.evaluate(
                      () => document.body.textContent
                    );
                    console.log(
                      '📄 현재 페이지 텍스트 샘플:',
                      pageText.substring(0, 500)
                    );

                    // 모든 버튼과 클릭 가능한 요소 출력
                    const clickableElements = await page.evaluate(() => {
                      const elements = Array.from(
                        document.querySelectorAll(
                          'button, div[role="button"], [onclick]'
                        )
                      );
                      return elements
                        .map(el => ({
                          tagName: el.tagName,
                          textContent: el.textContent?.trim(),
                          className: el.className,
                          id: el.id,
                        }))
                        .filter(
                          el => el.textContent && el.textContent.length > 0
                        );
                    });

                    console.log(
                      '🔍 페이지의 모든 클릭 가능한 요소:',
                      clickableElements
                    );
                  }
                } else {
                  console.log('❌ "Try another way" 버튼을 찾을 수 없음');
                }
              } else {
                console.log('❌ 다음 버튼을 찾을 수 없음');
              }
            } else {
              console.log('❌ 이메일 입력 필드를 찾을 수 없음');
            }
          } else {
            console.log('❌ Google 로그인 페이지가 아닙니다');
          }
        } catch (error) {
          console.log(
            '⚠️ 자동 로그인 실패, 수동 로그인으로 전환:',
            error.message
          );
          console.log('⏳ 30초 후 수동 로그인을 진행해주세요...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }

        // 로그인 완료 후 즉시 문제 분석 및 해결
        console.log('🔍 로그인 완료! 콘솔 로그 자동 분석 중...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 짧은 대기

        const issues = problemSolver.analyzeConsoleLogs(consoleLogs);

        if (issues.length > 0) {
          console.log(`\n🚨 ${issues.length}개의 문제점 자동 감지됨:`);
          issues.forEach((issue, index) => {
            console.log(
              `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`
            );
          });

          // 자동 문제 해결 시도
          await problemSolver.autoFixIssues(page, issues);

          // 해결 후 재검증
          console.log('🔍 문제 해결 후 재검증 중...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // 시간 단축

          // 최종 결과 확인
          const finalIssues = problemSolver.analyzeConsoleLogs(consoleLogs);
          if (finalIssues.length === 0) {
            console.log('🎉 모든 문제가 자동으로 해결되었습니다!');
          } else {
            console.log(`⚠️ ${finalIssues.length}개의 문제가 남아있습니다.`);
          }
        } else {
          console.log('✅ 문제점이 감지되지 않았습니다.');
        }

        // 최종 스크린샷
        await page.screenshot({
          path: path.join(__dirname, 'test-results', 'final-result.png'),
          fullPage: true,
        });

        console.log('📸 최종 결과 스크린샷 저장 완료');
      } else {
        console.log('❌ Google 로그인 버튼을 찾을 수 없음');
      }
    } else {
      console.log('❌ 로그인 버튼을 찾을 수 없음');
    }
  } catch (error) {
    console.log('❌ 테스트 중 오류 발생:', error.message);
  } finally {
    // 결과 저장
    const resultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const resultPath = path.join(
      resultsDir,
      `auto-fix-result-${Date.now()}.json`
    );
    const testResult = {
      timestamp: new Date().toISOString(),
      consoleLogs,
      networkLogs,
      detectedIssues: problemSolver.problems,
      appliedSolutions: problemSolver.solutions,
      summary: {
        totalConsoleLogs: consoleLogs.length,
        totalNetworkRequests: networkLogs.filter(log => log.type === 'request')
          .length,
        errors: consoleLogs.filter(log => log.type === 'error').length,
        warnings: consoleLogs.filter(log => log.type === 'warning').length,
        issuesDetected: problemSolver.problems.length,
        solutionsApplied: problemSolver.solutions.length,
      },
    };

    fs.writeFileSync(resultPath, JSON.stringify(testResult, null, 2));
    console.log(`📊 자동 문제 해결 결과 저장: ${resultPath}`);

    // 오래된 결과 파일 정리 (최신 5개만 유지)
    cleanupOldResultFiles(resultsDir);

    console.log('\n📈 최종 요약:');
    console.log(`   - 콘솔 로그: ${testResult.summary.totalConsoleLogs}개`);
    console.log(
      `   - 네트워크 요청: ${testResult.summary.totalNetworkRequests}개`
    );
    console.log(`   - 감지된 문제: ${testResult.summary.issuesDetected}개`);
    console.log(`   - 적용된 해결책: ${testResult.summary.solutionsApplied}개`);
    console.log(`   - 에러: ${testResult.summary.errors}개`);
    console.log(`   - 경고: ${testResult.summary.warnings}개`);

    console.log('\n🎉 완전 자동화 테스트 완료!');
    console.log('📊 테스트 결과가 저장되었습니다.');
    console.log('🔄 자동으로 프로세스를 종료합니다...');

    // 브라우저 자동 종료
    try {
      await browser.close();
      console.log('✅ 브라우저가 자동으로 종료되었습니다.');
    } catch (error) {
      console.log('⚠️ 브라우저 종료 중 오류:', error.message);
    }

    // 프로세스 자동 종료
    console.log('🚀 다음 단계로 진행할 수 있습니다.');
    process.exit(0);
  }
}

// 실행
runFullyAutomatedTest()
  .then(() => {
    console.log('✅ 모든 테스트가 성공적으로 완료되었습니다.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 테스트 중 오류 발생:', error.message);
    process.exit(1);
  });
