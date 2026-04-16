import { describe, expect, it } from "vitest";
import { Teacher } from "../Teacher";

describe("Teacher Entity", () => {
  describe("생성 및 검증", () => {
    it("강사 이름이 2글자 미만이면 에러를 던져야 한다", () => {
      expect(() => Teacher.create("김", "#6366f1")).toThrow(
        "강사 이름은 2글자 이상이어야 합니다."
      );
    });

    it("강사 이름이 20글자를 초과하면 에러를 던져야 한다", () => {
      const longName = "a".repeat(21);
      expect(() => Teacher.create(longName, "#6366f1")).toThrow(
        "강사 이름은 20글자 이하여야 합니다."
      );
    });

    it("이름이 비어있으면 에러를 던져야 한다", () => {
      expect(() => Teacher.create("", "#6366f1")).toThrow(
        "강사 이름을 입력해주세요."
      );
    });

    it("create 팩토리 메서드로 유효한 강사를 생성해야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");

      expect(teacher.name).toBe("김선생");
      expect(teacher.color.value).toBe("#6366f1");
      expect(teacher.userId).toBeNull();
      expect(teacher.id).toBeDefined();
      expect(teacher.createdAt).toBeInstanceOf(Date);
      expect(teacher.updatedAt).toBeInstanceOf(Date);
    });

    it("userId를 지정하여 생성할 수 있어야 한다", () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const teacher = Teacher.create("박강사", "#0891b2", userId);
      expect(teacher.userId).toBe(userId);
    });
  });

  describe("이름 변경", () => {
    it("changeName 메서드로 이름을 변경하고 updatedAt이 갱신되어야 한다", async () => {
      const initial = Teacher.create("김선생", "#6366f1");
      const initialUpdatedAt = initial.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = initial.changeName("박강사");

      expect(updated.name).toBe("박강사");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it("같은 이름으로 변경하면 같은 인스턴스를 반환해야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      const same = teacher.changeName("김선생");
      expect(same).toBe(teacher);
    });

    it("유효하지 않은 이름으로 변경하면 에러를 던져야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      expect(() => teacher.changeName("")).toThrow("강사 이름을 입력해주세요.");
    });
  });

  describe("색상 변경", () => {
    it("changeColor 메서드로 색상을 변경하고 updatedAt이 갱신되어야 한다", async () => {
      const initial = Teacher.create("김선생", "#6366f1");
      const initialUpdatedAt = initial.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = initial.changeColor("#0891b2");

      expect(updated.color.value).toBe("#0891b2");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it("유효하지 않은 색상으로 변경하면 에러를 던져야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      expect(() => teacher.changeColor("invalid-color")).toThrow();
    });
  });

  describe("user 연결", () => {
    it("linkUser로 userId를 설정해야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const linked = teacher.linkUser(userId);
      expect(linked.userId).toBe(userId);
    });

    it("unlinkUser로 userId를 null로 설정해야 한다", () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const teacher = Teacher.create("김선생", "#6366f1", userId);
      const unlinked = teacher.unlinkUser();
      expect(unlinked.userId).toBeNull();
    });
  });

  describe("중복 검사", () => {
    it("같은 이름이 있으면 중복으로 판단해야 한다", () => {
      const teachers = [Teacher.create("김선생", "#6366f1")];
      expect(Teacher.isNameDuplicate("김선생", teachers)).toBe(true);
    });

    it("대소문자 구분 없이 중복 검사해야 한다", () => {
      const teachers = [Teacher.create("김선생", "#6366f1")];
      expect(Teacher.isNameDuplicate("김선생", teachers)).toBe(true);
    });

    it("없는 이름이면 중복이 아니어야 한다", () => {
      const teachers = [Teacher.create("김선생", "#6366f1")];
      expect(Teacher.isNameDuplicate("박강사", teachers)).toBe(false);
    });
  });

  describe("동등성 비교", () => {
    it("같은 인스턴스는 동등해야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      expect(teacher.equals(teacher)).toBe(true);
    });

    it("다른 ID를 가진 강사는 동등하지 않아야 한다", () => {
      const t1 = Teacher.create("김선생", "#6366f1");
      const t2 = Teacher.create("박강사", "#0891b2");
      expect(t1.equals(t2)).toBe(false);
    });
  });

  describe("JSON 직렬화", () => {
    it("toJSON 메서드가 올바른 JSON을 반환해야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      const json = teacher.toJSON();

      expect(json).toEqual({
        id: teacher.id.value,
        name: "김선생",
        color: "#6366f1",
        userId: null,
        createdAt: teacher.createdAt.toISOString(),
        updatedAt: teacher.updatedAt.toISOString(),
      });
    });

    it("fromJSON 메서드로 JSON에서 객체를 복원해야 한다", () => {
      const original = Teacher.create("김선생", "#6366f1");
      const json = original.toJSON();
      const restored = Teacher.fromJSON(json);

      expect(restored.id.value).toBe(original.id.value);
      expect(restored.name).toBe(original.name);
      expect(restored.color.value).toBe(original.color.value);
      expect(restored.userId).toBeNull();
      expect(restored.createdAt.getTime()).toBe(original.createdAt.getTime());
    });

    it("userId가 있는 경우도 직렬화/복원 가능해야 한다", () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const original = Teacher.create("김선생", "#6366f1", userId);
      const restored = Teacher.fromJSON(original.toJSON());
      expect(restored.userId).toBe(userId);
    });
  });

  describe("restore 팩토리 메서드", () => {
    it("기존 데이터로부터 강사를 복원해야 한다", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const createdAt = new Date("2026-01-01");
      const updatedAt = new Date("2026-01-02");

      const teacher = Teacher.restore(id, "김선생", "#6366f1", null, createdAt, updatedAt);

      expect(teacher.id.value).toBe(id);
      expect(teacher.name).toBe("김선생");
      expect(teacher.color.value).toBe("#6366f1");
      expect(teacher.userId).toBeNull();
      expect(teacher.createdAt.getTime()).toBe(createdAt.getTime());
      expect(teacher.updatedAt.getTime()).toBe(updatedAt.getTime());
    });
  });
});
