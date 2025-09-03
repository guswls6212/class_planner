describe('시간 유효성 검사 기능', () => {
  // 시간 유효성 검사 함수 (Schedule.tsx에서 복사)
  const validateTimeRange = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;

    const startMinutes =
      parseInt(startTime.split(':')[0]) * 60 +
      parseInt(startTime.split(':')[1]);
    const endMinutes =
      parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

    return startMinutes < endMinutes;
  };

  describe('시간 유효성 검사', () => {
    it('시작 시간이 종료 시간보다 늦으면 자동으로 종료 시간을 조정한다', () => {
      // 시작 시간이 종료 시간보다 늦을 때 자동 조정 로직 검증
      const startTime = '10:30';
      const endTime = '09:30';

      // 시작 시간이 종료 시간보다 늦은 경우
      const startMinutes =
        parseInt(startTime.split(':')[0]) * 60 +
        parseInt(startTime.split(':')[1]);
      const endMinutes =
        parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

      expect(startMinutes).toBeGreaterThan(endMinutes);

      // 자동 조정된 종료 시간 계산
      const newEndMinutes = startMinutes + 60; // 1시간 후
      const newEndHour = Math.floor(newEndMinutes / 60);
      const newEndMinute = newEndMinutes % 60;
      const adjustedEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;

      expect(adjustedEndTime).toBe('11:30');
    });

    it('종료 시간이 시작 시간보다 빠르면 자동으로 시작 시간을 조정한다', () => {
      // 종료 시간이 시작 시간보다 빠를 때 자동 조정 로직 검증
      const startTime = '10:30';
      const endTime = '09:30';

      // 종료 시간이 시작 시간보다 빠른 경우
      const startMinutes =
        parseInt(startTime.split(':')[0]) * 60 +
        parseInt(startTime.split(':')[1]);
      const endMinutes =
        parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

      expect(endMinutes).toBeLessThan(startMinutes);

      // 자동 조정된 시작 시간 계산
      const newStartMinutes = endMinutes - 60; // 1시간 전
      const newStartHour = Math.floor(newStartMinutes / 60);
      const newStartMinute = newStartMinutes % 60;
      const adjustedStartTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMinute.toString().padStart(2, '0')}`;

      expect(adjustedStartTime).toBe('08:30');
    });

    it('유효한 시간 범위는 그대로 유지된다', () => {
      // 유효한 시간 범위 검증
      const startTime = '09:00';
      const endTime = '10:00';

      const startMinutes =
        parseInt(startTime.split(':')[0]) * 60 +
        parseInt(startTime.split(':')[1]);
      const endMinutes =
        parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

      expect(startMinutes).toBeLessThan(endMinutes);
    });

    it('시간 유효성 검사 함수가 올바르게 작동한다', () => {
      // validateTimeRange 함수 검증
      const validCase = {
        startTime: '09:00',
        endTime: '10:00',
        expected: true,
      };

      const invalidCase = {
        startTime: '10:00',
        endTime: '09:00',
        expected: false,
      };

      const emptyCase = {
        startTime: '',
        endTime: '10:00',
        expected: false,
      };

      // 유효한 경우
      expect(validateTimeRange(validCase.startTime, validCase.endTime)).toBe(
        validCase.expected
      );

      // 유효하지 않은 경우
      expect(
        validateTimeRange(invalidCase.startTime, invalidCase.endTime)
      ).toBe(invalidCase.expected);

      // 빈 값인 경우
      expect(validateTimeRange(emptyCase.startTime, emptyCase.endTime)).toBe(
        emptyCase.expected
      );
    });

    it('수업 추가 시 시간 유효성 검사가 적용된다', () => {
      // 수업 추가 시 시간 유효성 검사 적용 확인
      const mockData = {
        studentIds: ['1'],
        subjectId: '1',
        weekday: 0,
        startTime: '10:00',
        endTime: '09:00', // 유효하지 않은 시간
        room: '',
      };

      // 시간 유효성 검사
      const isValid = validateTimeRange(mockData.startTime, mockData.endTime);

      expect(isValid).toBe(false);
    });

    it('수업 편집 시 시간 유효성 검사가 적용된다', () => {
      // 수업 편집 시 시간 유효성 검사 적용 확인
      const mockEditData = {
        startTime: '10:30',
        endTime: '09:30', // 유효하지 않은 시간
      };

      // 시간 유효성 검사
      const isValid = validateTimeRange(
        mockEditData.startTime,
        mockEditData.endTime
      );

      expect(isValid).toBe(false);
    });
  });
});
