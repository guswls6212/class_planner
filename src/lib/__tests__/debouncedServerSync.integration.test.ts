/**
 * 리셋 디바운스 서버 동기화 시스템 통합 테스트
 * localStorage와의 통합 동작 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  scheduleServerSync,
  getSyncStatus,
  cleanupSyncSystem,
  forceSyncToServer,
} from "../debouncedServerSync";
import {
  addStudentToLocal,
  updateStudentInLocal,
  getClassPlannerData,
} from "../localStorageCrud";

// Mock fetch
globalThis.fetch = vi.fn();

describe("리셋 디바운스 + localStorage 통합 테스트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupSyncSystem();
    localStorage.clear();
  });

  afterEach(() => {
    cleanupSyncSystem();
    localStorage.clear();
  });

  describe("localStorage 변경 → 디바운스 동기화 플로우", () => {
    it("학생 추가 후 자동으로 디바운스 동기화가 예약되어야 함", () => {
      // Mock successful response
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // 학생 추가 (localStorage 변경)
      addStudentToLocal("홍길동");

      const data = getClassPlannerData();
      
      // 디바운스 동기화 예약
      scheduleServerSync(data);

      const status = getSyncStatus();
      expect(status.isActive).toBe(true);
      expect(status.firstChangeTime).toBeTruthy();
      expect(status.queueLength).toBe(1);
    });

    it("연속적인 학생 수정 시 타이머가 리셋되어야 함", () => {
      // 첫 번째 학생 추가
      addStudentToLocal("홍길동");

      let data = getClassPlannerData();
      scheduleServerSync(data);
      const status1 = getSyncStatus();

      // 두 번째 학생 수정 (타이머 리셋)
      // 먼저 추가된 학생의 ID를 찾아서 업데이트
      const students = data.students;
      const studentId = students[0]?.id;
      if (studentId) {
        updateStudentInLocal(studentId, {
          name: "홍길동 수정",
        });
      }

      data = getClassPlannerData();
      scheduleServerSync(data);
      const status2 = getSyncStatus();

      expect(status2.isActive).toBe(true);
      expect(status2.firstChangeTime).toBe(status1.firstChangeTime); // 첫 번째 시간 유지
      expect(status2.queueLength).toBe(1); // 최신 데이터만 유지
    });

    it("lastModified가 올바르게 업데이트되어야 함", () => {
      const beforeTime = Date.now();

      addStudentToLocal("홍길동");

      const data = getClassPlannerData();
      const afterTime = Date.now();

      expect(data.lastModified).toBeTruthy();
      const lastModifiedTime = new Date(data.lastModified).getTime();
      expect(lastModifiedTime).toBeGreaterThanOrEqual(beforeTime);
      expect(lastModifiedTime).toBeLessThanOrEqual(afterTime);

      // 디바운스 동기화 예약
      scheduleServerSync(data);
      const status = getSyncStatus();
      expect(status.isActive).toBe(true);
    });
  });

  describe("안전장치 시스템", () => {
    it("최대 지연 시간 정보가 올바르게 반환되어야 함", () => {
      const status = getSyncStatus();
      expect(status.maxDelay).toBe(5 * 60 * 1000); // 5분
    });

    it("동기화 상태 정보가 정확해야 함", () => {
      // 초기 상태
      const emptyStatus = getSyncStatus();
      expect(emptyStatus.isActive).toBe(false);
      expect(emptyStatus.firstChangeTime).toBeNull();
      expect(emptyStatus.nextSyncIn).toBeNull();

      // 학생 추가 후 상태
      addStudentToLocal("홍길동");

      const data = getClassPlannerData();
      scheduleServerSync(data);

      const activeStatus = getSyncStatus();
      expect(activeStatus.isActive).toBe(true);
      expect(activeStatus.firstChangeTime).toBeTruthy();
      expect(activeStatus.nextSyncIn).toBe(30 * 1000); // 30초
      expect(activeStatus.queueLength).toBe(1);
    });
  });

  describe("에러 처리 및 복구", () => {
    it("동기화 실패 시에도 시스템이 안정적이어야 함", async () => {
      // Mock failed response
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server Error" }),
      });

      addStudentToLocal("홍길동");

      const data = getClassPlannerData();
      const result = await forceSyncToServer(data);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      // 시스템이 여전히 안정적이어야 함
      const status = getSyncStatus();
      expect(status).toBeDefined();
    });

    it("시스템 정리 후 깨끗한 상태여야 함", () => {
      addStudentToLocal("홍길동");

      const data = getClassPlannerData();
      scheduleServerSync(data);

      const statusBefore = getSyncStatus();
      expect(statusBefore.isActive).toBe(true);

      cleanupSyncSystem();

      const statusAfter = getSyncStatus();
      expect(statusAfter.isActive).toBe(false);
      expect(statusAfter.firstChangeTime).toBeNull();
      expect(statusAfter.queueLength).toBe(0);
    });
  });

  describe("성능 및 효율성", () => {
    it("연속적인 변경 시 불필요한 동기화를 방지해야 함", () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // 연속적인 학생 추가 (실제 시나리오)
        for (let i = 1; i <= 5; i++) {
        addStudentToLocal(`학생 ${i}`);

        const data = getClassPlannerData();
        scheduleServerSync(data);
      }

      const status = getSyncStatus();
      expect(status.queueLength).toBe(1); // 최신 데이터만 유지
      expect(status.isActive).toBe(true);
    });

    it("빈번한 스케줄링이 시스템에 부담을 주지 않아야 함", () => {
      const startTime = Date.now();

      // 100번의 연속 스케줄링
      for (let i = 0; i < 100; i++) {
        addStudentToLocal(`학생 ${i}`);

        const data = getClassPlannerData();
        scheduleServerSync(data);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 1초 이내 완료
      
      const status = getSyncStatus();
      expect(status.queueLength).toBe(1); // 여전히 최신 데이터만 유지
    });
  });
});
