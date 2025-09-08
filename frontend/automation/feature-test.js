import dotenv from 'dotenv';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

// .env.local 파일 로드
dotenv.config({
  path: path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '.env.local'
  ),
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 기능 테스트 클래스
class FeatureTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      login: false,
      studentManagement: false,
      subjectManagement: false,
      scheduleCreation: false,
      dataSync: false,
      errors: [],
    };
  }

  async init() {
    // 디버거 모드 확인
    const debugMode = process.argv.includes('--debug');

    if (debugMode) {
      console.log('🐛 디버거 모드로 실행 중...');
      console.log('📝 Cursor의 DEBUG CONSOLE 탭에서 실시간 로그를 확인하세요!');

      // 디버거 모드에서는 기존 Chrome 인스턴스에 연결
      this.browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
      });
      this.page = await this.browser.newPage();
    } else {
      // 일반 모드
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized'],
      });
      this.page = await this.browser.newPage();
    }

    // 콘솔 로그 수집
    this.page.on('console', msg => {
      console.log(`🔍 콘솔: ${msg.text()}`);
    });
  }

  async login() {
    try {
      console.log('🔐 로그인 테스트 시작...');

      await this.page.goto('http://localhost:5173/class_planner/students');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 로그인 버튼 찾기 및 클릭
      const loginButton = await this.page.$(
        '[data-testid="login-button"], button:has-text("로그인"), button:has-text("Login")'
      );
      if (loginButton) {
        await loginButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Google 로그인 버튼 클릭
      const googleButton = await this.page.$(
        'button:has-text("Google"), [data-provider="google"]'
      );
      if (googleButton) {
        await googleButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Google 로그인 프로세스
      await this.page.waitForSelector('input[type="email"]', {
        timeout: 10000,
      });
      await this.page.type('input[type="email"]', process.env.TEST_EMAIL);
      await this.page.click('button:has-text("다음"), button:has-text("Next")');
      await this.page.waitForTimeout(2000);

      // 패스키 우회
      try {
        const tryAnotherWay = await this.page.$(
          'button:has-text("Try another way"), button:has-text("다른 방법")'
        );
        if (tryAnotherWay) {
          await tryAnotherWay.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        console.log('패스키 우회 시도 중 오류:', e.message);
      }

      // 비밀번호 입력
      await this.page.waitForSelector('input[type="password"]', {
        timeout: 10000,
      });
      await this.page.type('input[type="password"]', process.env.TEST_PASSWORD);
      await this.page.click('button:has-text("다음"), button:has-text("Next")');

      // 로그인 완료 대기
      await this.page.waitForFunction(
        () => window.location.href.includes('localhost:5173'),
        { timeout: 30000 }
      );

      console.log('✅ 로그인 성공!');
      this.testResults.login = true;
      return true;
    } catch (error) {
      console.log('❌ 로그인 실패:', error.message);
      this.testResults.errors.push(`로그인 실패: ${error.message}`);
      return false;
    }
  }

  async testStudentManagement() {
    try {
      console.log('👥 학생 관리 기능 테스트...');

      // 학생 추가 테스트
      const studentInput = await this.page.$(
        'input[placeholder*="학생"], input[placeholder*="student"]'
      );
      if (studentInput) {
        await studentInput.type('테스트학생1');
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await studentInput.type('테스트학생2');
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('✅ 학생 추가 성공!');
        this.testResults.studentManagement = true;
      } else {
        console.log('❌ 학생 입력 필드를 찾을 수 없음');
        this.testResults.errors.push('학생 입력 필드를 찾을 수 없음');
      }
    } catch (error) {
      console.log('❌ 학생 관리 테스트 실패:', error.message);
      this.testResults.errors.push(`학생 관리 실패: ${error.message}`);
    }
  }

  async testSubjectManagement() {
    try {
      console.log('📚 과목 관리 기능 테스트...');

      // 과목 페이지로 이동
      await this.page.goto('http://localhost:5173/class_planner/subjects');
      await this.page.waitForTimeout(2000);

      // 과목 추가 테스트
      const subjectInput = await this.page.$(
        'input[placeholder*="과목"], input[placeholder*="subject"]'
      );
      if (subjectInput) {
        await subjectInput.type('수학');
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await subjectInput.type('영어');
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('✅ 과목 추가 성공!');
        this.testResults.subjectManagement = true;
      } else {
        console.log('❌ 과목 입력 필드를 찾을 수 없음');
        this.testResults.errors.push('과목 입력 필드를 찾을 수 없음');
      }
    } catch (error) {
      console.log('❌ 과목 관리 테스트 실패:', error.message);
      this.testResults.errors.push(`과목 관리 실패: ${error.message}`);
    }
  }

  async testScheduleCreation() {
    try {
      console.log('📅 시간표 생성 기능 테스트...');

      // 스케줄 페이지로 이동
      await this.page.goto('http://localhost:5173/class_planner/schedule');
      await this.page.waitForTimeout(2000);

      // 시간표 그리드 확인
      const timeTable = await this.page.$(
        '[data-testid="time-table"], .time-table, .schedule-grid'
      );
      if (timeTable) {
        console.log('✅ 시간표 그리드 확인됨');

        // 드래그 앤 드롭 테스트 (간단한 클릭으로 대체)
        const timeSlot = await this.page.$('.time-slot, [data-time]');
        if (timeSlot) {
          await timeSlot.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ 시간표 상호작용 성공!');
          this.testResults.scheduleCreation = true;
        }
      } else {
        console.log('❌ 시간표 그리드를 찾을 수 없음');
        this.testResults.errors.push('시간표 그리드를 찾을 수 없음');
      }
    } catch (error) {
      console.log('❌ 시간표 생성 테스트 실패:', error.message);
      this.testResults.errors.push(`시간표 생성 실패: ${error.message}`);
    }
  }

  async testDataSync() {
    try {
      console.log('🔄 데이터 동기화 테스트...');

      // localStorage 데이터 확인
      const localStorageData = await this.page.evaluate(() => {
        return {
          students: localStorage.getItem('students'),
          subjects: localStorage.getItem('subjects'),
          sessions: localStorage.getItem('sessions'),
        };
      });

      console.log('📊 localStorage 데이터:', localStorageData);

      // 페이지 새로고침 후 데이터 유지 확인
      await this.page.reload();
      await this.page.waitForTimeout(2000);

      const refreshedData = await this.page.evaluate(() => {
        return {
          students: localStorage.getItem('students'),
          subjects: localStorage.getItem('subjects'),
          sessions: localStorage.getItem('sessions'),
        };
      });

      if (refreshedData.students || refreshedData.subjects) {
        console.log('✅ 데이터 동기화 성공!');
        this.testResults.dataSync = true;
      } else {
        console.log('❌ 데이터 동기화 실패');
        this.testResults.errors.push('데이터 동기화 실패');
      }
    } catch (error) {
      console.log('❌ 데이터 동기화 테스트 실패:', error.message);
      this.testResults.errors.push(`데이터 동기화 실패: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🚀 기능 테스트 시작...');

    await this.init();

    // 로그인 테스트
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ 로그인 실패로 인해 테스트 중단');
      return;
    }

    // 각 기능 테스트
    await this.testStudentManagement();
    await this.testSubjectManagement();
    await this.testScheduleCreation();
    await this.testDataSync();

    // 결과 출력
    this.printResults();

    await this.browser.close();
  }

  printResults() {
    console.log('\n📊 기능 테스트 결과:');
    console.log('='.repeat(50));
    console.log(`🔐 로그인: ${this.testResults.login ? '✅ 성공' : '❌ 실패'}`);
    console.log(
      `👥 학생 관리: ${this.testResults.studentManagement ? '✅ 성공' : '❌ 실패'}`
    );
    console.log(
      `📚 과목 관리: ${this.testResults.subjectManagement ? '✅ 성공' : '❌ 실패'}`
    );
    console.log(
      `📅 시간표 생성: ${this.testResults.scheduleCreation ? '✅ 성공' : '❌ 실패'}`
    );
    console.log(
      `🔄 데이터 동기화: ${this.testResults.dataSync ? '✅ 성공' : '❌ 실패'}`
    );

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ 발생한 오류들:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    const successCount = Object.values(this.testResults).filter(
      result => typeof result === 'boolean' && result
    ).length;

    console.log(
      `\n🎯 전체 성공률: ${successCount}/5 (${((successCount / 5) * 100).toFixed(1)}%)`
    );
  }
}

// 테스트 실행
const tester = new FeatureTester();
tester.runAllTests().catch(console.error);
