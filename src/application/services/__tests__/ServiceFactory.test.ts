import { RepositoryInitializer } from "@/infrastructure";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ServiceFactory } from "../ServiceFactory";

describe("ServiceFactory", () => {
  beforeEach(() => {
    // 각 테스트 전에 초기화 상태 리셋
    RepositoryInitializer.reset();
  });

  afterEach(() => {
    // 각 테스트 후에 정리
  });

  describe("createStudentService", () => {
    it("StudentApplicationService 인스턴스를 생성해야 한다", () => {
      const service = ServiceFactory.createStudentService();

      expect(service).toBeDefined();
      expect(typeof service.getAllStudents).toBe("function");
      expect(typeof service.addStudent).toBe("function");
      expect(typeof service.updateStudent).toBe("function");
      expect(typeof service.deleteStudent).toBe("function");
    });

    it("학생 목록을 조회할 수 있어야 한다", async () => {
      const service = ServiceFactory.createStudentService();
      const students = await service.getAllStudents();

      expect(Array.isArray(students)).toBe(true);
    });
  });

  describe("createSubjectService", () => {
    it("SubjectApplicationService 인스턴스를 생성해야 한다", () => {
      const service = ServiceFactory.createSubjectService();

      expect(service).toBeDefined();
      expect(typeof service.getAllSubjects).toBe("function");
      expect(typeof service.addSubject).toBe("function");
      expect(typeof service.updateSubject).toBe("function");
      expect(typeof service.deleteSubject).toBe("function");
    });

    it("과목 목록을 조회할 수 있어야 한다", async () => {
      const service = ServiceFactory.createSubjectService();
      const subjects = await service.getAllSubjects();

      expect(Array.isArray(subjects)).toBe(true);
    });
  });

  describe("createSessionService", () => {
    it("SessionApplicationService 인스턴스를 생성해야 한다", () => {
      const service = ServiceFactory.createSessionService();

      expect(service).toBeDefined();
      expect(typeof service.getAllSessions).toBe("function");
      expect(typeof service.addSession).toBe("function");
      expect(typeof service.updateSession).toBe("function");
      expect(typeof service.deleteSession).toBe("function");
    });

    it("세션 목록을 조회할 수 있어야 한다", async () => {
      const service = ServiceFactory.createSessionService();
      const sessions = await service.getAllSessions();

      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe("createAllServices", () => {
    it("모든 서비스를 한 번에 생성해야 한다", () => {
      const services = ServiceFactory.createAllServices();

      expect(services.studentService).toBeDefined();
      expect(services.subjectService).toBeDefined();
      expect(services.sessionService).toBeDefined();
    });

    it("생성된 모든 서비스가 정상 동작해야 한다", async () => {
      const services = ServiceFactory.createAllServices();

      const students = await services.studentService.getAllStudents();
      const subjects = await services.subjectService.getAllSubjects();
      const sessions = await services.sessionService.getAllSessions();

      expect(Array.isArray(students)).toBe(true);
      expect(Array.isArray(subjects)).toBe(true);
      expect(Array.isArray(sessions)).toBe(true);
    });
  });
});


