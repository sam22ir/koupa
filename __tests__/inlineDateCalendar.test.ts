import {
  addCalendarMonths,
  calendarMonthStart,
  calendarToday,
  isCalendarDateDisabled,
} from '@/src/features/barber-schedule/InlineDateCalendar';

describe('inline exception calendar', () => {
  it('keeps calendar calculations in Algeria date-only strings', () => {
    expect(calendarToday(new Date('2026-08-18T23:30:00.000Z'))).toBe('2026-08-19');
    expect(calendarMonthStart('2026-08-19')).toBe('2026-08-01');
    expect(addCalendarMonths('2026-08-01', 1)).toBe('2026-09-01');
  });

  it('disables past dates but keeps today and future dates available', () => {
    expect(isCalendarDateDisabled('2026-08-17', '2026-08-18')).toBe(true);
    expect(isCalendarDateDisabled('2026-08-18', '2026-08-18')).toBe(false);
    expect(isCalendarDateDisabled('2026-08-19', '2026-08-18')).toBe(false);
  });
});
