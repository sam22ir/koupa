export interface AppNotification {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly appointment_id: string | null;
  readonly destination: unknown;
  readonly read_at: string | null;
  readonly created_at: string;
}

export function isUnreadNotification(notification: AppNotification): boolean {
  return !notification.read_at;
}

export function formatNotificationTime(value: string): string {
  return new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function appEnvironment(): 'development' | 'staging' | 'production' {
  const value = process.env.EXPO_PUBLIC_APP_ENV;
  if (value === 'staging' || value === 'production') return value;
  return 'development';
}
