import type { Href } from 'expo-router';

import type { AppNotification } from '@/src/notifications';

type DestinationRecord = Record<string, unknown>;

function destinationRecord(value: unknown): DestinationRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as DestinationRecord
    : null;
}

function stringField(value: DestinationRecord, key: string): string | null {
  const field = value[key];
  return typeof field === 'string' && field.length > 0 ? field : null;
}

/**
 * Maps database event metadata to a known in-app route. Stored routes are
 * deliberately not trusted: only this allowlist may drive navigation.
 */
export function notificationDestinationHref(
  notification: AppNotification,
  recipientRole: 'customer' | 'barber' = 'customer',
): Href {
  const destination = destinationRecord(notification.destination);
  const kind = destination ? stringField(destination, 'kind') : null;

  if (kind === 'appointment') {
    const appointmentId = stringField(destination!, 'appointmentId') ?? notification.appointment_id;
    if (appointmentId) {
      return recipientRole === 'barber'
        ? `/barber-appointment/${appointmentId}` as Href
        : `/appointment/${appointmentId}` as Href;
    }
  }

  if (kind === 'shop_membership' || kind === 'shop_hub') {
    return '/(barber)/shop' as Href;
  }

  if (kind === 'barber_workspace') {
    return '/(barber)/schedule' as Href;
  }

  if (kind === 'shop_member') {
    const barberId = stringField(destination!, 'barberId');
    if (barberId) return `/(barber)/shop-member/${barberId}` as Href;
  }

  if (kind === 'shop_activity') {
    const shopId = stringField(destination!, 'shopId');
    if (shopId) return `/(barber)/shop-activity/${shopId}` as Href;
  }

  if (notification.appointment_id) {
    return recipientRole === 'barber'
      ? `/barber-appointment/${notification.appointment_id}` as Href
      : `/appointment/${notification.appointment_id}` as Href;
  }
  return `/notification/${notification.id}` as Href;
}

export function pushNotificationDestinationHref(
  data: { readonly notification_id?: string; readonly appointment_id?: string; readonly destination?: string },
  recipientRole: 'customer' | 'barber',
): Href | null {
  const notificationId = data.notification_id?.trim();
  if (!notificationId) return null;

  let destination: unknown = { kind: 'notification' };
  if (data.destination) {
    try {
      destination = JSON.parse(data.destination) as unknown;
    } catch {
      // An older or malformed push payload still gets the safe legacy fallback.
    }
  }

  return notificationDestinationHref({
    id: notificationId,
    title: '',
    body: '',
    appointment_id: data.appointment_id?.trim() || null,
    destination,
    read_at: null,
    created_at: '',
  }, recipientRole);
}
