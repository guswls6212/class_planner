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

    it("profile 없이 create 시 새 프로필 필드는 null이어야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      expect(teacher.email).toBeNull();
      expect(teacher.phone).toBeNull();
      expect(teacher.role).toBeNull();
      expect(teacher.notes).toBeNull();
    });

    it("profile을 지정하여 create 시 새 프로필 필드가 설정되어야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1", undefined, {
        email: "kim@example.com",
        phone: "010-1234-5678",
        role: "admin",
        notes: "주요 강사",
      });
      expect(teacher.email).toBe("kim@example.com");
      expect(teacher.phone).toBe("010-1234-5678");
      expect(teacher.role).toBe("admin");
      expect(teacher.notes).toBe("주요 강사");
    });

    it("create 시 유효한 role(owner/admin/member)은 정상 생성되어야 한다", () => {
      const roles = ["owner", "admin", "member"] as const;
      for (const role of roles) {
        const teacher = Teacher.create("김선생", "#6366f1", undefined, { role });
        expect(teacher.role).toBe(role);
      }
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

    it("changeName 시 프로필 필드가 보존되어야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1", undefined, {
        email: "kim@example.com",
        role: "admin",
      });
      const renamed = teacher.changeName("박강사");
      expect(renamed.email).toBe("kim@example.com");
      expect(renamed.role).toBe("admin");
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

  describe("프로필 업데이트", () => {
    it("updateProfile로 이름, 색상, 프로필 필드를 한 번에 변경할 수 있어야 한다", async () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      const initialUpdatedAt = teacher.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = teacher.updateProfile({
        name: "박강사",
        color: "#0891b2",
        email: "park@example.com",
        phone: "010-9999-8888",
        role: "member",
        notes: "신규 강사",
      });

      expect(updated.name).toBe("박강사");
      expect(updated.color.value).toBe("#0891b2");
      expect(updated.email).toBe("park@example.com");
      expect(updated.phone).toBe("010-9999-8888");
      expect(updated.role).toBe("member");
      expect(updated.notes).toBe("신규 강사");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    it("updateProfile에서 지정하지 않은 필드는 기존 값을 유지해야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1", undefined, {
        email: "kim@example.com",
        phone: "010-1234-5678",
        role: "admin",
        notes: "주요 강사",
      });
      const updated = teacher.updateProfile({ notes: "업데이트됨" });

      expect(updated.email).toBe("kim@example.com");
      expect(updated.phone).toBe("010-1234-5678");
      expect(updated.role).toBe("admin");
      expect(updated.notes).toBe("업데이트됨");
    });

    it("updateProfile로 프로필 필드를 null로 초기화할 수 있어야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1", undefined, {
        email: "kim@example.com",
      });
      const updated = teacher.updateProfile({ email: null });
      expect(updated.email).toBeNull();
    });

    it("updateProfile은 id와 userId, createdAt을 변경하지 않아야 한다", () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const teacher = Teacher.create("김선생", "#6366f1", userId);
      const updated = teacher.updateProfile({ name: "박강사" });

      expect(updated.id.value).toBe(teacher.id.value);
      expect(updated.userId).toBe(userId);
      expect(updated.createdAt.getTime()).toBe(teacher.createdAt.getTime());
    });

    it("updateProfile에 유효하지 않은 role을 넘기면 에러를 던져야 한다", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      // Type assertion needed to test runtime guard with an invalid value
      expect(() =>
        teacher.updateProfile({ role: "superuser" as never })
      ).toThrow("Invalid teacher role: superuser");
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
    it("toJSON 메서드가 올바른 JSON을 반환해야 한다 (프로필 필드 포함)", () => {
      const teacher = Teacher.create("김선생", "#6366f1");
      const json = teacher.toJSON();

      expect(json).toEqual({
        id: teacher.id.value,
        name: "김선생",
        color: "#6366f1",
        userId: null,
        createdAt: teacher.createdAt.toISOString(),
        updatedAt: teacher.updatedAt.toISOString(),
        email: null,
        phone: null,
        role: null,
        notes: null,
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
      expect(restored.email).toBeNull();
      expect(restored.phone).toBeNull();
      expect(restored.role).toBeNull();
      expect(restored.notes).toBeNull();
    });

    it("userId가 있는 경우도 직렬화/복원 가능해야 한다", () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const original = Teacher.create("김선생", "#6366f1", userId);
      const restored = Teacher.fromJSON(original.toJSON());
      expect(restored.userId).toBe(userId);
    });

    it("프로필 필드가 있는 경우 fromJSON 라운드트립이 정확해야 한다", () => {
      const original = Teacher.create("김선생", "#6366f1", undefined, {
        email: "kim@example.com",
        phone: "010-1234-5678",
        role: "admin",
        notes: "주요 강사",
      });
      const restored = Teacher.fromJSON(original.toJSON());

      expect(restored.email).toBe("kim@example.com");
      expect(restored.phone).toBe("010-1234-5678");
      expect(restored.role).toBe("admin");
      expect(restored.notes).toBe("주요 강사");
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

    it("profile 없이 restore 시 새 프로필 필드는 null이어야 한다", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const teacher = Teacher.restore(id, "김선생", "#6366f1");
      expect(teacher.email).toBeNull();
      expect(teacher.phone).toBeNull();
      expect(teacher.role).toBeNull();
      expect(teacher.notes).toBeNull();
    });

    it("profile과 함께 restore 시 프로필 필드가 복원되어야 한다", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const teacher = Teacher.restore(
        id,
        "김선생",
        "#6366f1",
        null,
        undefined,
        undefined,
        { email: "kim@example.com", role: "owner" }
      );
      expect(teacher.email).toBe("kim@example.com");
      expect(teacher.role).toBe("owner");
      expect(teacher.phone).toBeNull();
      expect(teacher.notes).toBeNull();
    });
  });
});
