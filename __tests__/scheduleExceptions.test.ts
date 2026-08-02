import { emptyScheduleException, scheduleExceptionSummary, validateScheduleException } from '@/src/scheduleExceptions';

describe('schedule exceptions', () => {
  it('requires a valid date and valid override range', () => {
    expect(validateScheduleException(emptyScheduleException)).toBe('validation');
    expect(validateScheduleException({ ...emptyScheduleException, exceptionDate: '2026-02-30' })).toBe('validation');
    expect(validateScheduleException({ ...emptyScheduleException, exceptionDate: '2026-08-03' })).toBeNull();
    expect(validateScheduleException({ ...emptyScheduleException, exceptionDate: '2026-08-03', isClosed: false, startsAt: '17:00', endsAt: '09:00' })).toBe('invalidTime');
  });

  it('uses clear summaries for closed and adjusted days', () => {
    expect(scheduleExceptionSummary({ isClosed: true, startsAt: '09:00', endsAt: '17:00' })).toBe('مغلق طوال اليوم');
    expect(scheduleExceptionSummary({ isClosed: false, startsAt: '11:00', endsAt: '15:00' })).toBe('11:00 - 15:00');
  });
});
