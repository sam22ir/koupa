import {
  applySchedulePreset,
  applyServiceExample,
  defaultSchedules,
} from '@/src/data/onboarding';

describe('onboarding presets', () => {
  it('applies Sunday-Thursday 9-18 with Friday and Saturday closed', () => {
    const schedules = applySchedulePreset('weekdays918');
    expect(schedules.filter((day) => day.enabled).map((day) => day.dayOfWeek)).toEqual([0, 1, 2, 3, 4]);
    expect(schedules[0]).toMatchObject({ startsAt: '09:00', endsAt: '18:00' });
    expect(schedules[5]?.enabled).toBe(false);
    expect(schedules[6]?.enabled).toBe(false);
  });

  it('restores the default schedule preset', () => {
    expect(applySchedulePreset('default')).toEqual(defaultSchedules);
  });

  it('fills an empty first service without overwriting a filled one', () => {
    expect(applyServiceExample(
      [{ name: '', priceDzd: '', durationMinutes: '30' }],
      { name: 'حلاقة شعر', priceDzd: '500', durationMinutes: '30' },
    )).toEqual([{ name: 'حلاقة شعر', priceDzd: '500', durationMinutes: '30' }]);

    expect(applyServiceExample(
      [{ name: 'صبغة', priceDzd: '1200', durationMinutes: '45' }],
      { name: 'ذقن', priceDzd: '300', durationMinutes: '15' },
    )).toEqual([
      { name: 'صبغة', priceDzd: '1200', durationMinutes: '45' },
      { name: 'ذقن', priceDzd: '300', durationMinutes: '15' },
    ]);
  });
});
