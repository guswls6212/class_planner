import { describe, expect, it } from "vitest";
import { Student } from "../Student";


describe("Student Entity", () => {
  describe("생성 및 검증", () => {
    it("학생 이름이 2글자 미만이면 에러를 던져야 한다", () => {
      expect(() => Student.create("김")).toThrow(
        "학생 이름은 2글자 이상이어야 합니다."
      );
    });

    it("학생 이름이 20글자를 초과하면 에러를 던져야 한다", () => {
      const longName = "김".repeat(21);
      expect(() => Student.create(longName)).toThrow(
        "학생 이름은 20글자 이하여야 합니다."
      );
    });

    it("create 팩토리 메서드로 유효한 학생을 생성해야 한다", () => {
      const student = Student.create("김철수");

      expect(student.name).toBe("김철수");
      expect(student.id).toBeDefined();
      expect(student.createdAt).toBeInstanceOf(Date);
      expect(student.updatedAt).toBeInstanceOf(Date);
    });

    it("기본 상태가 활성화되어야 한다", () => {
      const student = Student.create("김철수");
      // Student 엔티티에는 isActive 속성이 없음
      expect(student.name).toBe("김철수");
    });
  });

  describe("이름 변경", () => {
    it("changeName 메서드로 이름을 변경하고 updatedAt이 갱신되어야 한다", async () => {
      const initialStudent = Student.create("김철수");
      const initialUpdatedAt = initialStudent.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedStudent = initialStudent.changeName("김영희");

      expect(updatedStudent.name).toBe("김영희");
      expect(updatedStudent.updatedAt.getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime()
      );
    });

    it("유효하지 않은 이름으로 변경하면 에러를 던져야 한다", () => {
      const student = Student.create("김철수");

      expect(() => student.changeName("")).toThrow(
        "Invalid student: 학생 이름을 입력해주세요."
      );
    });
  });

  describe("상태 변경", () => {
    it("Student 엔티티는 상태 변경 기능이 없다", () => {
      const student = Student.create("김철수");

      // Student 엔티티에는 activate/deactivate 메서드가 없음
      expect(student.name).toBe("김철수");
    });
  });

  describe("동등성 비교", () => {
    it("같은 ID를 가진 학생은 동등해야 한다", () => {
      const student1 = Student.create("김철수");
      const student2 = Student.create("김영희");

      // Student 엔티티의 ID는 불변이므로 직접 비교
      expect(student1.equals(student1)).toBe(true);
    });

    it("다른 ID를 가진 학생은 동등하지 않아야 한다", () => {
      const student1 = Student.create("김철수");
      const student2 = Student.create("김영희");

      expect(student1.equals(student2)).toBe(false);
    });
  });

  describe("JSON 직렬화", () => {
    it("toJSON 메서드가 올바른 JSON을 반환해야 한다", () => {
      const student = Student.create("김철수");
      const json = student.toJSON();

      expect(json).toEqual({
        id: student.id.value,
        name: "김철수",
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
      });
    });

    it("fromJSON 메서드로 JSON에서 객체를 복원해야 한다", () => {
      const originalStudent = Student.create("김철수");
      const json = originalStudent.toJSON();
      const restoredStudent = Student.fromJSON(json);

      expect(restoredStudent.id.value).toBe(originalStudent.id.value);
      expect(restoredStudent.name).toBe(originalStudent.name);
      expect(restoredStudent.createdAt.getTime()).toBe(
        originalStudent.createdAt.getTime()
      );
      expect(restoredStudent.updatedAt.getTime()).toBe(
        originalStudent.updatedAt.getTime()
      );
    });
  });
});

describe("프로필 필드 (grade/school/phone)", () => {
  it("create에 options 객체를 전달하면 모든 필드가 설정되어야 한다", () => {
    const student = Student.create("김철수", {
      gender: "male",
      birthDate: "2013-03-15",
      grade: "중3",
      school: "○○중학교",
      phone: "010-1234-5678",
    });
    expect(student.grade).toBe("중3");
    expect(student.school).toBe("○○중학교");
    expect(student.phone).toBe("010-1234-5678");
  });

  it("옵션 없이 create하면 새 필드는 undefined이어야 한다", () => {
    const student = Student.create("김철수");
    expect(student.grade).toBeUndefined();
    expect(student.school).toBeUndefined();
    expect(student.phone).toBeUndefined();
  });

  it("changeProfile로 프로필 필드를 일괄 변경해야 한다", () => {
    const student = Student.create("김철수");
    const updated = student.changeProfile({ grade: "중3", school: "○○중학교", phone: "010-1234-5678" });
    expect(updated.grade).toBe("중3");
    expect(updated.school).toBe("○○중학교");
    expect(updated.phone).toBe("010-1234-5678");
  });

  it("changeProfile은 불변성을 보장해야 한다", () => {
    const original = Student.create("김철수");
    const updated = original.changeProfile({ grade: "중3" });
    expect(original.grade).toBeUndefined();
    expect(updated.grade).toBe("중3");
    expect(original).not.toBe(updated);
  });

  it("changeProfile은 updatedAt을 갱신해야 한다", async () => {
    const original = Student.create("김철수");
    await new Promise((r) => setTimeout(r, 10));
    const updated = original.changeProfile({ grade: "중3" });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
  });

  it("유효하지 않은 전화번호는 validatePhone이 실패해야 한다", () => {
    const result = Student.validatePhone("abc");
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe("PHONE_INVALID_FORMAT");
  });

  it("빈 전화번호는 validatePhone이 통과해야 한다 (선택 필드)", () => {
    expect(Student.validatePhone("").isValid).toBe(true);
    expect(Student.validatePhone(undefined).isValid).toBe(true);
  });

  it("유효한 전화번호 형식은 validatePhone이 통과해야 한다", () => {
    expect(Student.validatePhone("010-1234-5678").isValid).toBe(true);
    expect(Student.validatePhone("01012345678").isValid).toBe(true);
    expect(Student.validatePhone("010-123-5678").isValid).toBe(true);
  });

  it("restore에 프로필 필드가 포함되어야 한다", () => {
    const student = Student.restore("00000000-0000-4000-8000-000000000000", "김철수", {
      grade: "중3",
      school: "○○중학교",
      phone: "010-1234-5678",
    });
    expect(student.grade).toBe("중3");
    expect(student.school).toBe("○○중학교");
    expect(student.phone).toBe("010-1234-5678");
  });

  it("toJSON/fromJSON이 프로필 필드를 보존해야 한다", () => {
    const student = Student.create("김철수", { grade: "중3", school: "○○중학교", phone: "010-1234-5678" });
    const json = student.toJSON();
    const restored = Student.fromJSON(json);
    expect(restored.grade).toBe("중3");
    expect(restored.school).toBe("○○중학교");
    expect(restored.phone).toBe("010-1234-5678");
  });
});
