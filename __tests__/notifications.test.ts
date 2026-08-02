import { appEnvironment, formatNotificationTime, isUnreadNotification } from '@/src/notifications';

describe('notification helpers', () => {
  it('detects unread notifications', () => {
    expect(
      isUnreadNotification({
        id: '1',
        title: 'موعد',
        body: 'تفاصيل',
        appointment_id: null,
        read_at: null,
        created_at: '2026-07-25T10:00:00.000Z',
      }),
    ).toBe(true);
    expect(
      isUnreadNotification({
        id: '1',
        title: 'موعد',
        body: 'تفاصيل',
        appointment_id: null,
        read_at: '2026-07-25T11:00:00.000Z',
        created_at: '2026-07-25T10:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('formats notification timestamps in Algeria time', () => {
    expect(formatNotificationTime('2026-07-25T09:30:00.000Z')).toContain('25');
  });

  it('defaults the environment safely', () => {
    expect(['development', 'staging', 'production']).toContain(appEnvironment());
  });
});
