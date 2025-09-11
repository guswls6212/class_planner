import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// 실제 Supabase 연결 테스트 (로컬 환경에서 테스트 가능)
describe("실제 Supabase 연결 통합 테스트", () => {
  let supabase: any;
  const TEST_USER_ID = "test-user-real-client";

  beforeEach(async () => {
    // 실제 Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseKey.includes("PLACEHOLDER")) {
      console.warn(
        "Supabase 환경 변수가 설정되지 않았거나 플레이스홀더입니다. 테스트를 건너뜁니다."
      );
      return;
    }

    supabase = createClient(supabaseUrl, supabaseKey);

    // 테스트 데이터 정리
    try {
      await supabase.from("user_data").delete().eq("user_id", TEST_USER_ID);
    } catch (error) {
      console.warn("테스트 데이터 정리 실패:", error);
    }
  });

  afterEach(async () => {
    if (supabase) {
      // 테스트 데이터 정리
      await supabase.from("user_data").delete().eq("user_id", TEST_USER_ID);
    }
  });

  it("실제 Supabase에 학생 데이터를 저장하고 조회할 수 있어야 한다", async () => {
    if (!supabase) {
      console.warn("Supabase 클라이언트가 없습니다. 테스트를 건너뜁니다.");
      return;
    }

    // Arrange
    const testData = {
      user_id: TEST_USER_ID,
      data: {
        students: [
          {
            id: "student-1",
            name: "실제테스트학생",
            gender: "male",
            createdAt: new Date().toISOString(),
          },
        ],
        subjects: [
          {
            id: "subject-1",
            name: "실제테스트과목",
            color: "#FF0000",
            createdAt: new Date().toISOString(),
          },
        ],
        sessions: [],
        version: "1.0",
      },
    };

    // Act - 데이터 저장
    const { data: insertData, error: insertError } = await supabase
      .from("user_data")
      .insert(testData)
      .select();

    // Assert - 저장 성공 확인
    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();
    expect(insertData).toHaveLength(1);

    // Act - 데이터 조회
    const { data: selectData, error: selectError } = await supabase
      .from("user_data")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    // Assert - 조회 성공 확인
    expect(selectError).toBeNull();
    expect(selectData).toBeDefined();
    expect(selectData.data.students).toHaveLength(1);
    expect(selectData.data.students[0].name).toBe("실제테스트학생");
    expect(selectData.data.subjects).toHaveLength(1);
    expect(selectData.data.subjects[0].name).toBe("실제테스트과목");
  });

  it("실제 Supabase에서 복잡한 세션 데이터를 처리할 수 있어야 한다", async () => {
    if (!supabase) {
      console.warn("Supabase 클라이언트가 없습니다. 테스트를 건너뜁니다.");
      return;
    }

    // Arrange - 복잡한 실제 데이터 구조
    const complexTestData = {
      user_id: TEST_USER_ID,
      data: {
        students: [
          {
            id: "student-1",
            name: "김철수",
            gender: "male",
            createdAt: new Date().toISOString(),
          },
          {
            id: "student-2",
            name: "이영희",
            gender: "female",
            createdAt: new Date().toISOString(),
          },
        ],
        subjects: [
          {
            id: "subject-1",
            name: "수학",
            color: "#FF0000",
            createdAt: new Date().toISOString(),
          },
          {
            id: "subject-2",
            name: "영어",
            color: "#00FF00",
            createdAt: new Date().toISOString(),
          },
        ],
        sessions: [
          {
            id: "session-1",
            subjectId: "subject-1",
            startsAt: "10:00",
            endsAt: "11:00",
            weekday: 1, // 월요일
            enrollmentIds: ["enrollment-1", "enrollment-2"],
            createdAt: new Date().toISOString(),
          },
        ],
        enrollments: [
          {
            id: "enrollment-1",
            studentId: "student-1",
            subjectId: "subject-1",
            createdAt: new Date().toISOString(),
          },
          {
            id: "enrollment-2",
            studentId: "student-2",
            subjectId: "subject-1",
            createdAt: new Date().toISOString(),
          },
        ],
        version: "1.0",
      },
    };

    // Act - 복잡한 데이터 저장
    const { data: insertData, error: insertError } = await supabase
      .from("user_data")
      .insert(complexTestData)
      .select();

    // Assert - 저장 성공 확인
    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();

    // Act - 데이터 조회 및 검증
    const { data: selectData, error: selectError } = await supabase
      .from("user_data")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    // Assert - 복잡한 데이터 구조 검증
    expect(selectError).toBeNull();
    expect(selectData.data.students).toHaveLength(2);
    expect(selectData.data.subjects).toHaveLength(2);
    expect(selectData.data.sessions).toHaveLength(1);
    expect(selectData.data.enrollments).toHaveLength(2);

    // 세션 데이터의 enrollmentIds 검증
    const session = selectData.data.sessions[0];
    expect(session.enrollmentIds).toBeDefined();
    expect(session.enrollmentIds).toHaveLength(2);
    expect(session.enrollmentIds).toContain("enrollment-1");
    expect(session.enrollmentIds).toContain("enrollment-2");
  });

  it("실제 Supabase에서 네트워크 지연 상황을 처리할 수 있어야 한다", async () => {
    if (!supabase) {
      console.warn("Supabase 클라이언트가 없습니다. 테스트를 건너뜁니다.");
      return;
    }

    // Arrange
    const testData = {
      user_id: TEST_USER_ID,
      data: {
        students: [],
        subjects: [],
        sessions: [],
        version: "1.0",
      },
    };

    // Act - 타임아웃을 고려한 데이터 저장
    const startTime = Date.now();

    const { data: insertData, error: insertError } = await supabase
      .from("user_data")
      .insert(testData)
      .select();

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Assert - 성공적으로 처리되었는지 확인
    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();

    // 네트워크 지연이 있어도 합리적인 시간 내에 완료되는지 확인 (10초 이내)
    expect(executionTime).toBeLessThan(10000);

    console.log(`실제 Supabase 연결 시간: ${executionTime}ms`);
  });

  it("실제 Supabase에서 잘못된 데이터 형식을 안전하게 처리할 수 있어야 한다", async () => {
    if (!supabase) {
      console.warn("Supabase 클라이언트가 없습니다. 테스트를 건너뜁니다.");
      return;
    }

    // Arrange - 잘못된 데이터 형식 (enrollmentIds가 undefined)
    const invalidTestData = {
      user_id: TEST_USER_ID,
      data: {
        students: [
          {
            id: "student-1",
            name: "테스트학생",
            gender: "male",
            createdAt: new Date().toISOString(),
          },
        ],
        subjects: [
          {
            id: "subject-1",
            name: "테스트과목",
            color: "#FF0000",
            createdAt: new Date().toISOString(),
          },
        ],
        sessions: [
          {
            id: "session-1",
            subjectId: "subject-1",
            startsAt: "10:00",
            endsAt: "11:00",
            weekday: 1,
            // enrollmentIds가 undefined인 상황 시뮬레이션
            enrollmentIds: undefined,
            createdAt: new Date().toISOString(),
          },
        ],
        version: "1.0",
      },
    };

    // Act - 잘못된 데이터 저장 시도
    const { data: insertData, error: insertError } = await supabase
      .from("user_data")
      .insert(invalidTestData)
      .select();

    // Assert - 저장은 성공하지만 데이터 검증 필요
    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();

    // Act - 데이터 조회
    const { data: selectData, error: selectError } = await supabase
      .from("user_data")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    // Assert - 잘못된 데이터가 저장되었는지 확인
    expect(selectError).toBeNull();
    expect(selectData.data.sessions[0].enrollmentIds).toBeUndefined();

    // 이는 실제 애플리케이션에서 처리해야 하는 상황
    console.log(
      "잘못된 데이터 형식이 감지되었습니다:",
      selectData.data.sessions[0]
    );
  });
});
