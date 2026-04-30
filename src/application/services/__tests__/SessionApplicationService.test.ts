import { SessionRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";
import { Session } from "@/shared/types/DomainTypes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionApplicationServiceImpl } from "../SessionApplicationService";

const makeSession = (id: string): Session => ({
  id,
  subjectId: "subject-1",
  enrollmentIds: [],
  weekday: 1,
  startsAt: "09:00",
  endsAt: "10:00",
  weekStartDate: "",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const mockSessionRepository: SessionRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("SessionApplicationService", () => {
  let service: SessionApplicationServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionApplicationServiceImpl(mockSessionRepository);
  });

  describe("getAllSessions", () => {
    it("모든 세션을 성공적으로 조회해야 한다", async () => {
      const sessions = [makeSession("s1"), makeSession("s2")];
      vi.spyOn(mockSessionRepository, "getAll").mockResolvedValue(sessions);

      const result = await service.getAllSessions("test-academy-id");

      expect(result).toHaveLength(2);
      expect(mockSessionRepository.getAll).toHaveBeenCalledWith("test-academy-id", undefined);
    });

    it("repository 에러 시 에러를 전파해야 한다", async () => {
      vi.spyOn(mockSessionRepository, "getAll").mockRejectedValue(
        new Error("DB error")
      );

      await expect(service.getAllSessions("test-academy-id")).rejects.toThrow();
    });
  });

  describe("getSessionById", () => {
    it("ID로 세션을 성공적으로 조회해야 한다", async () => {
      const session = makeSession("s1");
      vi.spyOn(mockSessionRepository, "getById").mockResolvedValue(session);

      const result = await service.getSessionById("s1");

      expect(result?.id).toBe("s1");
    });

    it("존재하지 않는 세션 조회 시 null을 반환해야 한다", async () => {
      vi.spyOn(mockSessionRepository, "getById").mockResolvedValue(null);

      const result = await service.getSessionById("non-existent");

      expect(result).toBeNull();
    });

    it("repository 에러 시 에러를 전파해야 한다", async () => {
      vi.spyOn(mockSessionRepository, "getById").mockRejectedValue(
        new Error("DB error")
      );

      await expect(service.getSessionById("s1")).rejects.toThrow();
    });
  });

  describe("addSession", () => {
    it("세션을 성공적으로 생성해야 한다", async () => {
      const session = makeSession("s1");
      const sessionData = {
        subjectId: "subject-1",
        startsAt: "09:00",
        endsAt: "10:00",
        enrollmentIds: [],
        weekday: 1,
      };
      vi.spyOn(mockSessionRepository, "create").mockResolvedValue(session);

      const result = await service.addSession(sessionData, "test-academy-id");

      expect(result.id).toBe("s1");
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        { ...sessionData, weekStartDate: "" },
        "test-academy-id"
      );
    });

    it("repository 에러 시 에러를 전파해야 한다", async () => {
      vi.spyOn(mockSessionRepository, "create").mockRejectedValue(
        new Error("DB error")
      );

      await expect(
        service.addSession(
          { subjectId: "s", startsAt: "09:00", endsAt: "10:00", enrollmentIds: [], weekday: 1 },
          "test-academy-id"
        )
      ).rejects.toThrow();
    });
  });

  describe("updateSessionPosition", () => {
    it("세션 위치를 성공적으로 업데이트해야 한다", async () => {
      const session = makeSession("s1");
      const updatedSession = { ...session, weekday: 3, startsAt: "14:00", endsAt: "15:00" };
      vi.spyOn(mockSessionRepository, "getById").mockResolvedValue(session);
      vi.spyOn(mockSessionRepository, "update").mockResolvedValue(updatedSession);

      const result = await service.updateSessionPosition("s1", {
        weekday: 3,
        startsAt: "14:00",
        endsAt: "15:00",
      });

      expect(result.weekday).toBe(3);
    });

    it("존재하지 않는 세션 위치 업데이트 시 SESSION_NOT_FOUND AppError를 throw해야 한다", async () => {
      vi.spyOn(mockSessionRepository, "getById").mockResolvedValue(null);

      const error = await service
        .updateSessionPosition("non-existent", { weekday: 1, startsAt: "09:00", endsAt: "10:00" })
        .catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("SESSION_NOT_FOUND");
      expect(error.statusHint).toBe(404);
    });
  });

  describe("deleteSession", () => {
    it("세션을 성공적으로 삭제해야 한다", async () => {
      vi.spyOn(mockSessionRepository, "delete").mockResolvedValue();

      await service.deleteSession("s1");

      expect(mockSessionRepository.delete).toHaveBeenCalledWith("s1");
    });

    it("repository 에러 시 에러를 전파해야 한다", async () => {
      vi.spyOn(mockSessionRepository, "delete").mockRejectedValue(
        new Error("DB error")
      );

      await expect(service.deleteSession("s1")).rejects.toThrow();
    });
  });
});
