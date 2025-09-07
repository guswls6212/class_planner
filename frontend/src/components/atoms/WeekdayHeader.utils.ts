export interface WeekdayHeaderStyles {
  backgroundColor: string;
  textAlign: string;
  fontWeight: string;
  fontSize: string;
  color: string;
  border: string;
  display: string;
  alignItems: string;
  justifyContent: string;
  minHeight: string;
}

export function getWeekdayHeaderStyles(
  customStyle: Partial<WeekdayHeaderStyles> = {},
): WeekdayHeaderStyles {
  const baseStyles: WeekdayHeaderStyles = {
    backgroundColor: 'var(--color-background)',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60px',
  };

  return { ...baseStyles, ...customStyle };
}

export function getWeekdayHeaderClasses(
  baseClass: string,
  customClass: string = '',
): string {
  const classes = [baseClass];
  if (customClass) {
    classes.push(customClass);
  }
  return classes.join(' ').trim();
}

export function getWeekdayName(weekday: number): string {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  if (weekday < 0 || weekday >= weekdays.length) {
    throw new Error(
      `Invalid weekday index: ${weekday}. Must be between 0 and 6.`,
    );
  }

  return weekdays[weekday];
}

export function validateWeekdayIndex(weekday: number): boolean {
  return weekday >= 0 && weekday < 7;
}

export function getWeekdayIndex(weekdayName: string): number {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const index = weekdays.indexOf(weekdayName);

  if (index === -1) {
    throw new Error(
      `Invalid weekday name: ${weekdayName}. Must be one of: ${weekdays.join(', ')}`,
    );
  }

  return index;
}
