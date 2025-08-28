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
  customStyle: React.CSSProperties = {}
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
  customClass: string = ''
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
