/**
 * 새로운 Repository 구조 사용 예시
 *
 * 이 파일은 새로운 Repository 구조를 어떻게 사용하는지 보여줍니다.
 */

import {
  EnvironmentConfig,
  RepositoryRegistry,
  StudentRepositoryFactory,
} from "../index";

/**
 * 예시 1: RepositoryRegistry 사용 (권장 방법)
 */
export async function example1_RepositoryRegistry() {
  console.log("=== 예시 1: RepositoryRegistry 사용 ===");

  // 1. Repository 등록 (앱 시작 시 한 번만)
  RepositoryRegistry.registerAll();

  // 2. Repository 사용
  const studentRepo = RepositoryRegistry.getStudentRepository();
  const students = await studentRepo.getAll();

  console.log("학생 목록:", students);

  // 3. 다른 Repository도 동일하게 사용
  const subjectRepo = RepositoryRegistry.getSubjectRepository();
  const subjects = await subjectRepo.getAll();

  console.log("과목 목록:", subjects);
}

/**
 * 예시 2: 개별 Factory 사용
 */
export async function example2_IndividualFactory() {
  console.log("=== 예시 2: 개별 Factory 사용 ===");

  // 환경에 따라 적절한 구현체 자동 선택
  const studentRepo = StudentRepositoryFactory.create();
  const students = await studentRepo.getAll();

  console.log("학생 목록:", students);
}

/**
 * 예시 3: 테스트 환경
 */
export async function example3_TestEnvironment() {
  console.log("=== 예시 3: 테스트 환경 ===");

  // 테스트용 Repository 등록 (모든 Repository가 Mock 구현체)
  RepositoryRegistry.registerForTest();

  const studentRepo = RepositoryRegistry.getStudentRepository();
  const students = await studentRepo.getAll();

  console.log("테스트 학생 목록:", students);
}

/**
 * 예시 4: 환경 정보 확인
 */
export function example4_EnvironmentInfo() {
  console.log("=== 예시 4: 환경 정보 확인 ===");

  // 현재 환경 확인
  const environment = EnvironmentConfig.getCurrentEnvironment();
  console.log("현재 환경:", environment);

  // 환경별 Repository 설정 확인
  const config = EnvironmentConfig.getRepositoryConfig();
  console.log("Repository 설정:", config);

  // 환경 정보 출력
  EnvironmentConfig.logEnvironmentInfo();
}

/**
 * 예시 5: 하위 호환성 (기존 코드)
 */
export async function example5_BackwardCompatibility() {
  console.log("=== 예시 5: 하위 호환성 ===");

  // 기존 코드와 동일하게 사용 가능 (deprecated 경고 표시됨)
  const { createStudentRepository } = await import("../RepositoryFactory");
  const studentRepo = createStudentRepository();
  const students = await studentRepo.getAll();

  console.log("학생 목록:", students);
}

/**
 * 모든 예시 실행
 */
export async function runAllExamples() {
  try {
    await example1_RepositoryRegistry();
    console.log("\n");

    await example2_IndividualFactory();
    console.log("\n");

    await example3_TestEnvironment();
    console.log("\n");

    example4_EnvironmentInfo();
    console.log("\n");

    await example5_BackwardCompatibility();

    console.log("\n✅ 모든 예시 실행 완료!");
  } catch (error) {
    console.error("❌ 예시 실행 중 오류:", error);
  }
}

// 직접 실행 시 모든 예시 실행
if (require.main === module) {
  runAllExamples();
}


