import { describe, expect, it } from "vitest";
import { Subject } from "../Subject";

describe("Subject Entity", () => {
  describe("생성 및 검증", () => {
    it("과목 이름이 2글자 미만이면 에러를 던져야 한다", () => {
      expect(() => Subject.create("수", "#FF0000")).toThrow(
        "과목 이름은 2글자 이상이어야 합니다."
      );
    });

    it("과목 이름이 30글자를 초과하면 에러를 던져야 한다", () => {
      const longName = "a".repeat(31);
      expect(() => Subject.create(longName, "#FF0000")).toThrow(
        "과목 이름은 30글자 이하여야 합니다."
      );
    });

    it("create 팩토리 메서드로 유효한 과목을 생성해야 한다", () => {
      const subject = Subject.create("수학", "#FF0000");

      expect(subject.name).toBe("수학");
      expect(subject.color.value).toBe("#FF0000");
      expect(subject.id).toBeDefined();
      expect(subject.createdAt).toBeInstanceOf(Date);
      expect(subject.updatedAt).toBeInstanceOf(Date);
    });

    it("기본 색상이 설정되어야 한다", () => {
      const subject = Subject.create("과학", "#FF0000");
      expect(subject.color.value).toBe("#FF0000");
    });
  });

  describe("이름 변경", () => {
    it("changeName 메서드로 이름을 변경하고 updatedAt이 갱신되어야 한다", async () => {
      const initialSubject = Subject.create("과학", "#00FF00");
      const initialUpdatedAt = initialSubject.updatedAt;

      // 잠시 시간을 지연시켜 updatedAt 변경을 확실히 확인
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedSubject = initialSubject.changeName("융합과학");

      expect(updatedSubject.name).toBe("융합과학");
      expect(updatedSubject.updatedAt.getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime()
      );
    });

    it("유효하지 않은 이름으로 변경하면 에러를 던져야 한다", () => {
      const subject = Subject.create("수학", "#FF0000");

      expect(() => subject.changeName("")).toThrow(
        "Invalid subject: 과목 이름을 입력해주세요."
      );
    });
  });

  describe("색상 변경", () => {
    it("changeColor 메서드로 색상을 변경하고 updatedAt이 갱신되어야 한다", async () => {
      const initialSubject = Subject.create("수학", "#FF0000");
      const initialUpdatedAt = initialSubject.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedSubject = initialSubject.changeColor("#00FF00");

      expect(updatedSubject.color.value).toBe("#00FF00");
      expect(updatedSubject.updatedAt.getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime()
      );
    });

    it("유효하지 않은 색상으로 변경하면 에러를 던져야 한다", () => {
      const subject = Subject.create("수학", "#FF0000");

      expect(() => subject.changeColor("invalid-color")).toThrow();
    });
  });

  describe("동등성 비교", () => {
    it("같은 ID를 가진 과목은 동등해야 한다", () => {
      const subject1 = Subject.create("수학", "#FF0000");
      const subject2 = Subject.create("영어", "#00FF00");

      // Subject 엔티티의 ID는 불변이므로 직접 비교
      expect(subject1.equals(subject1)).toBe(true);
    });

    it("다른 ID를 가진 과목은 동등하지 않아야 한다", () => {
      const subject1 = Subject.create("수학", "#FF0000");
      const subject2 = Subject.create("영어", "#00FF00");

      expect(subject1.equals(subject2)).toBe(false);
    });
  });

  describe("JSON 직렬화", () => {
    it("toJSON 메서드가 올바른 JSON을 반환해야 한다", () => {
      const subject = Subject.create("수학", "#FF0000");
      const json = subject.toJSON();

      expect(json).toEqual({
        id: subject.id.value,
        name: "수학",
        color: "#FF0000",
        createdAt: subject.createdAt.toISOString(),
        updatedAt: subject.updatedAt.toISOString(),
      });
    });

    it("fromJSON 메서드로 JSON에서 객체를 복원해야 한다", () => {
      const originalSubject = Subject.create("수학", "#FF0000");
      const json = originalSubject.toJSON();
      const restoredSubject = Subject.fromJSON(json);

      expect(restoredSubject.id.value).toBe(originalSubject.id.value);
      expect(restoredSubject.name).toBe(originalSubject.name);
      expect(restoredSubject.color.value).toBe(originalSubject.color.value);
      expect(restoredSubject.createdAt.getTime()).toBe(
        originalSubject.createdAt.getTime()
      );
      expect(restoredSubject.updatedAt.getTime()).toBe(
        originalSubject.updatedAt.getTime()
      );
    });
  });
});
