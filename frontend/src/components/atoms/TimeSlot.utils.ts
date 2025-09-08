export interface TimeSlotStyles {
  backgroundColor: string;
  textAlign: string;
  fontSize: string;
  color: string;
  border: string;
  display: string;
  alignItems: string;
  justifyContent: string;
  minHeight: string;
}

export function getTimeSlotStyles(
  customStyle: Partial<TimeSlotStyles> = {},
): TimeSlotStyles {
  const baseStyles: TimeSlotStyles = {
    backgroundColor: 'var(--color-background)',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60px',
  };

  return { ...baseStyles, ...customStyle };
}

export function getTimeSlotClasses(
  baseClass: string,
  customClass: string = '',
): string {
  const classes = [baseClass];
  if (customClass) {
    classes.push(customClass);
  }
  return classes.join(' ').trim();
}

export function validateTimeFormat(time: string): boolean {
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timePattern.test(time);
}

export function getTimeSlotText(time: string): string {
  if (!validateTimeFormat(time)) {
    throw new Error(`Invalid time format: ${time}. Expected format: HH:MM`);
  }
  return time;
}

// 🆕 30분 단위 시간 생성 함수
export function generateTimeSlots30Min(
  startHour: number = 9,
  endHour: number = 24,
): string[] {
  const timeSlots: string[] = [];

  for (let hour = startHour; hour < endHour; hour++) {
    // 정시 (예: 09:00, 10:00)
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    // 30분 (예: 09:30, 10:30)
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  return timeSlots;
}

// 🆕 시간을 30분 단위 인덱스로 변환
export function timeTo30MinIndex(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = 9 * 60; // 9:00 시작
  return (totalMinutes - startMinutes) / 30;
}

// 🆕 30분 단위 인덱스를 시간으로 변환
export function indexTo30MinTime(index: number): string {
  const totalMinutes = 9 * 60 + index * 30; // 9:00 시작
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
