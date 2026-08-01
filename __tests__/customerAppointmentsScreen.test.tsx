import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import AppointmentsScreen from '../app/(customer)/appointments';
import type { Appointment } from '@/src/booking';

const mockLoadAppointments = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useFocusEffect: (callback: () => void) => ReactModule.useEffect(callback, [callback]),
  };
});

jest.mock('@/src/hooks/useBooking', () => ({
  loadCustomerAppointments: () => mockLoadAppointments(),
  useBooking: () => ({
    error: '',
    cancelCustomer: jest.fn(async () => true),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

function appointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: overrides.id ?? 'appointment-1',
    barber_id: 'barber-1',
    service_id: 'service-1',
    starts_at: overrides.starts_at ?? '2026-08-04T10:00:00.000Z',
    ends_at: '2026-08-04T10:30:00.000Z',
    price_dzd: 800,
    status: overrides.status ?? 'booked',
    service_name: overrides.service_name ?? 'حلاقة شعر',
    barber_name: overrides.barber_name ?? 'أحمد',
  };
}

describe('customer Appointments screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to upcoming and keeps past appointments out of the first view', async () => {
    mockLoadAppointments.mockResolvedValue([
      appointment({ id: 'upcoming', status: 'booked', service_name: 'حلاقة ولحية بخدمة طويلة', barber_name: 'حلاق باسم طويل جدا لا يجب أن يدفع الإجراءات خارج البطاقة' }),
      appointment({ id: 'past', status: 'completed', service_name: 'قصّة شعر', starts_at: '2026-07-30T10:00:00.000Z' }),
      appointment({ id: 'cancelled', status: 'cancelled', service_name: 'تدريج احترافي', starts_at: '2026-07-29T10:00:00.000Z' }),
    ]);

    const view = await render(<AppointmentsScreen />);

    expect(view.getByRole('tab', { name: 'القادمة' })).toBeSelected();
    expect(view.getByText('حلاقة ولحية بخدمة طويلة')).toBeTruthy();
    expect(view.getByText('حلاق باسم طويل جدا لا يجب أن يدفع الإجراءات خارج البطاقة')).toBeTruthy();
    expect(view.queryByText('قصّة شعر')).toBeNull();

    await fireEvent.press(view.getByRole('tab', { name: 'السابقة' }));
    expect(view.getByRole('tab', { name: 'السابقة' })).toBeSelected();
    expect(view.getByText('قصّة شعر')).toBeTruthy();
    expect(view.getByText('تدريج احترافي')).toBeTruthy();
  });

  it('keeps canceled cards read-only and routes past cards to details', async () => {
    mockLoadAppointments.mockResolvedValue([
      appointment({ id: 'cancelled', status: 'cancelled', service_name: 'حلاقة شعر', starts_at: '2026-07-29T10:00:00.000Z' }),
    ]);

    const view = await render(<AppointmentsScreen />);
    expect(view.getByRole('tab', { name: 'السابقة' })).toBeSelected();

    expect(view.getByText('ملغى')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'إلغاء الموعد' })).toBeNull();
    expect(view.queryByRole('button', { name: 'إعادة جدولة' })).toBeNull();
    await fireEvent.press(view.getByText('ملغى'));
    expect(mockPush).toHaveBeenCalledWith('/appointment/cancelled');
  });

  it('shows a find action only for an empty upcoming view', async () => {
    mockLoadAppointments.mockResolvedValue([]);
    const view = await render(<AppointmentsScreen />);

    expect(view.getByText('لا توجد مواعيد قادمة')).toBeTruthy();
    expect(view.getByRole('button', { name: 'اعثر على حلاق' })).toBeTruthy();
    await fireEvent.press(view.getByRole('tab', { name: 'السابقة' }));
    expect(view.getByText('لا توجد مواعيد سابقة')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'اعثر على حلاق' })).toBeNull();
  });
});
