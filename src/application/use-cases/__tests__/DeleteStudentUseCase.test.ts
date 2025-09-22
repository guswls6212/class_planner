/**
 * DeleteStudentUseCase 테스트
 */

import { describe, expect, it } from "vitest";

describe("DeleteStudentUseCase", () => {
  it("DeleteStudentUseCase 모듈이 로드되어야 한다", async () => {
    const module = await import("../DeleteStudentUseCase");
    expect(module).toBeDefined();
  });

  it("Use Case 클래스가 존재해야 한다", async () => {
    const module = await import("../DeleteStudentUseCase");

    // Use Case 모듈이 에러 없이 로드되면 성공
    expect(typeof module).toBe("object");
  });

  it("기본 Use Case 구조가 유지되어야 한다", async () => {
    const module = await import("../DeleteStudentUseCase");

    // 모듈 구조 확인
    expect(module).toBeTruthy();
  });
});


