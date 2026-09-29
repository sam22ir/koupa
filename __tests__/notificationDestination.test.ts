import type { AppNotification } from '@/src/notifications';
import { notificationDestinationHref, pushNotificationDestinationHref } from '@/src/notificationDestination';

function notification(destination: unknown): AppNotification {
  return {
    id: 'notification-1',
    title: 'حدث جديد',
    body: 'تفاصيل الحدث',
    appointment_id: null,
    destination,
    read_at: null,
    created_at: '2026-08-17T10:00:00.000Z',
  };
}

describe('notificationDestinationHref', () => {
  it.each([
    [
      { kind: 'appointment', appointmentId: 'appointment-1' },
      '/appointment/appointment-1',
    ],
    [
      { kind: 'shop_membership', shopId: 'shop-1', membershipId: 'membership-1', barberId: 'barber-1' },
      '/(barber)/shop',
    ],
    [
      { kind: 'barber_workspace', shopId: 'shop-1', barberId: 'barber-1' },
      '/(barber)/schedule',
    ],
    [
      { kind: 'shop_member', shopId: 'shop-1', barberId: 'barber-1' },
      '/(barber)/shop-member/barber-1',
    ],
    [
      { kind: 'shop_activity', shopId: 'shop-1' },
      '/(barber)/shop-activity/shop-1',
    ],
  ])('opens the typed %o event at %s', (destination, expected) => {
    expect(notificationDestinationHref(notification(destination))).toBe(expected);
  });

  it('opens Home for a customer and Today for a barber on a queue event', () => {
    const event = notification({ kind: 'queue', barberId: 'barber-1' });
    expect(notificationDestinationHref(event, 'customer')).toBe('/(customer)/home');
    expect(notificationDestinationHref(event, 'barber')).toBe('/(barber)/today');
  });

  it('opens a barber appointment event for a barber recipient', () => {
    expect(notificationDestinationHref(
      notification({ kind: 'appointment', appointmentId: 'appointment-1' }),
      'barber',
    )).toBe('/barber-appointment/appointment-1');
  });

  it('opens the notification event when a legacy target is unavailable', () => {
    expect(notificationDestinationHref(notification({ kind: 'unknown-event' }))).toBe('/notification/notification-1');
  });

  it('preserves the appointment fallback for notifications created before destinations', () => {
    expect(notificationDestinationHref({
      ...notification({}),
      appointment_id: 'appointment-legacy',
    })).toBe('/appointment/appointment-legacy');
  });

  it('uses the same resolver for a barber push notification tap', () => {
    expect(pushNotificationDestinationHref({
      notification_id: 'notification-1',
      appointment_id: 'appointment-1',
      destination: JSON.stringify({ kind: 'appointment', appointmentId: 'appointment-1' }),
    }, 'barber')).toBe('/barber-appointment/appointment-1');
  });
});
