export interface ScheduleException {
  readonly id: string;
  readonly exceptionDate: string;
  readonly isClosed: boolean;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly note: string;
}

export const emptyScheduleException: Omit<ScheduleException, 'id'> = {
  exceptionDate: '',
  isClosed: true,
  startsAt: '09:00',
  endsAt: '17:00',
  note: '',
};

export function validateScheduleException(value: Omit<ScheduleException, 'id'>): 'validation' | 'invalidTime' | null {
  const parsedDate = new Date(`${value.exceptionDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.exceptionDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value.exceptionDate) return 'validation';
  if (!value.isClosed && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.startsAt) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.endsAt))) return 'validation';
  if (!value.isClosed && value.startsAt >= value.endsAt) return 'invalidTime';
  return null;
}

export function scheduleExceptionSummary(value: Pick<ScheduleException, 'isClosed' | 'startsAt' | 'endsAt'>): string {
  return value.isClosed ? 'مغلق طوال اليوم' : `${value.startsAt} - ${value.endsAt}`;
}
