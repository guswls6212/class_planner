import { minutesToTime, timeToMinutes } from "@/lib/planner";
import { describe, expect, it } from "vitest";

describe("planner.ts - timeToMinutes 함수 실제 에러 시나리오 테스트", () => {
  it("undefined 값을 안전하게 처리해야 한다", () => {
    // Arrange - undefined 값
    const undefinedTime = undefined as any;

    // Act - 함수 실행 (에러가 발생하지 않아야 함)
    const result = timeToMinutes(undefinedTime);

    // Assert - 에러 없이 0을 반환해야 함
    expect(result).toBe(0);
  });

  it("null 값을 안전하게 처리해야 한다", () => {
    // Arrange - null 값
    const nullTime = null as any;

    // Act - 함수 실행 (에러가 발생하지 않아야 함)
    const result = timeToMinutes(nullTime);

    // Assert - 에러 없이 0을 반환해야 함
    expect(result).toBe(0);
  });

  it("빈 문자열을 안전하게 처리해야 한다", () => {
    // Arrange - 빈 문자열
    const emptyTime = "";

    // Act - 함수 실행 (에러가 발생하지 않아야 함)
    const result = timeToMinutes(emptyTime);

    // Assert - 에러 없이 0을 반환해야 함
    expect(result).toBe(0);
  });

  it("숫자 타입을 안전하게 처리해야 한다", () => {
    // Arrange - 숫자 타입
    const numberTime = 123 as any;

    // Act - 함수 실행 (에러가 발생하지 않아야 함)
    const result = timeToMinutes(numberTime);

    // Assert - 에러 없이 0을 반환해야 함
    expect(result).toBe(0);
  });

  it("객체 타입을 안전하게 처리해야 한다", () => {
    // Arrange - 객체 타입
    const objectTime = {} as any;

    // Act - 함수 실행 (에러가 발생하지 않아야 함)
    const result = timeToMinutes(objectTime);

    // Assert - 에러 없이 0을 반환해야 함
    expect(result).toBe(0);
  });

  it("잘못된 시간 형식을 안전하게 처리해야 한다", () => {
    // Arrange - 잘못된 시간 형식들
    const invalidTimes = [
      "25:70", // 잘못된 시간
      "abc", // 문자열
      "12", // 콜론 없음
      "12:60", // 잘못된 분
      "24:00", // 잘못된 시간
    ];

    // Act & Assert - 모든 잘못된 형식을 안전하게 처리해야 함
    invalidTimes.forEach((invalidTime) => {
      expect(() => timeToMinutes(invalidTime)).not.toThrow();
      const result = timeToMinutes(invalidTime);
      expect(typeof result).toBe("number");
    });
  });

  it("정상적인 시간 형식을 올바르게 처리해야 한다", () => {
    // Arrange - 정상적인 시간 형식들
    const validTimes = [
      { time: "09:00", expected: 540 }, // 9시간 = 540분
      { time: "12:30", expected: 750 }, // 12시간 30분 = 750분
      { time: "23:59", expected: 1439 }, // 23시간 59분 = 1439분
      { time: "00:00", expected: 0 }, // 0시간 0분 = 0분
    ];

    // Act & Assert - 정상적인 시간 형식을 올바르게 처리해야 함
    validTimes.forEach(({ time, expected }) => {
      const result = timeToMinutes(time);
      expect(result).toBe(expected);
    });
  });

  it("실제 사용자 시나리오: 세션 추가 중간 상태를 안전하게 처리해야 한다", () => {
    // Arrange - 실제 사용자가 세션을 추가하는 중간 상태 시뮬레이션
    const sessionData = {
      id: "session-1",
      subjectId: "subject-1",
      startsAt: undefined as any, // 드래그 앤 드롭 중간 상태
      endsAt: "11:00",
      weekday: 1,
      enrollmentIds: ["enrollment-1"],
      createdAt: new Date().toISOString(),
    };

    // Act - startsAt이 undefined인 세션의 시간을 변환 시도
    const startMinutes = timeToMinutes(sessionData.startsAt);
    const endMinutes = timeToMinutes(sessionData.endsAt);

    // Assert - 에러 없이 안전하게 처리되어야 함
    expect(startMinutes).toBe(0); // undefined는 0으로 처리
    expect(endMinutes).toBe(660); // "11:00"은 660분으로 정상 처리
  });

  it("minutesToTime 함수도 안전하게 처리해야 한다", () => {
    // Arrange - 정상적인 분 값들
    const validMinutes = [
      { minutes: 540, expected: "09:00" },
      { minutes: 750, expected: "12:30" },
      { minutes: 1439, expected: "23:59" },
      { minutes: 0, expected: "00:00" },
    ];

    // Act & Assert - 정상적인 분 값을 올바르게 처리해야 함
    validMinutes.forEach(({ minutes, expected }) => {
      const result = minutesToTime(minutes);
      expect(result).toBe(expected);
    });
  });

  it("음수 분 값을 안전하게 처리해야 한다", () => {
    // Arrange - 음수 분 값
    const negativeMinutes = -60;

    // Act - 함수 실행
    const result = minutesToTime(negativeMinutes);

    // Assert - 음수 값도 안전하게 처리되어야 함
    expect(result).toBe("-1:00");
  });

  it("매우 큰 분 값을 안전하게 처리해야 한다", () => {
    // Arrange - 매우 큰 분 값
    const largeMinutes = 999999;

    // Act - 함수 실행
    const result = minutesToTime(largeMinutes);

    // Assert - 큰 값도 안전하게 처리되어야 함
    expect(result).toBe("16666:39");
  });
});
