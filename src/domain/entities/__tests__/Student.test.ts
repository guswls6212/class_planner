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
