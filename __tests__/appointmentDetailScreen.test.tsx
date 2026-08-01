import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import AppointmentDetailScreen from '../app/appointment/[id]';
import type { Appointment } from '@/src/booking';

const mockLoadAppointments = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => {
  return {
    router: {
      push: (...args: unknown[]) => mockPush(...args),
      back: () => mockBack(),
    },
    useLocalSearchParams: () => ({ id: 'appointment-1' }),
  };
});

jest.mock('@/src/hooks/useBooking', () => ({
  loadCustomerAppointments: () => mockLoadAppointments(),
  useBooking: () => ({
    error: '',
    cancelCustomer: jest.fn(async () => true),
    rateAppointment: jest.fn(async () => true),
    loading: false,
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
    service_name: overrides.service_name ?? 'حلاقة ولحية',
    barber_name: overrides.barber_name ?? 'أمين',
  };
}

describe('customer appointment detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the full logo stage and exposes booked actions', async () => {
    mockLoadAppointments.mockResolvedValue([appointment({})]);
    const view = await render(<AppointmentDetailScreen />);

    expect(await view.findByLabelText('كوپا')).toBeTruthy();
    expect(view.getAllByText('محجوز').length).toBeGreaterThan(0);
    expect(view.getByText('حلاقة ولحية')).toBeTruthy();
    expect(view.getByRole('button', { name: 'مسح رمز الحضور' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'إعادة جدولة' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'إلغاء الموعد' })).toBeTruthy();
  });

  it.each([
    ['present', 'حاضر'],
    ['absent', 'غائب'],
    ['cancelled', 'ملغى'],
  ] as const)('keeps %s records read-only', async (status, label) => {
    mockLoadAppointments.mockResolvedValue([appointment({ status })]);
    const view = await render(<AppointmentDetailScreen />);

    expect((await view.findAllByText(label)).length).toBeGreaterThan(0);
    expect(view.queryByRole('button', { name: 'مسح رمز الحضور' })).toBeNull();
    expect(view.queryByRole('button', { name: 'إعادة جدولة' })).toBeNull();
    expect(view.queryByRole('button', { name: 'إلغاء الموعد' })).toBeNull();
    if (status === 'cancelled') {
      await fireEvent.press(view.getByRole('button', { name: 'العودة إلى مواعيدي' }));
      expect(mockPush).toHaveBeenCalledWith('/(customer)/appointments');
    }
  });

  it('keeps completed rating controls and supports long names', async () => {
    mockLoadAppointments.mockResolvedValue([
      appointment({
        status: 'completed',
        service_name: 'حلاقة طويلة جدا مع تفاصيل إضافية',
        barber_name: 'حلاق باسم طويل جدا لا يخرج عن البطاقة',
      }),
    ]);
    const view = await render(<AppointmentDetailScreen />);

    expect(await view.findByText('حلاقة طويلة جدا مع تفاصيل إضافية')).toBeTruthy();
    expect(view.getByText('حلاق باسم طويل جدا لا يخرج عن البطاقة')).toBeTruthy();
    expect(view.getByText('قيّم')).toBeTruthy();
  });

  it('shows an explicit missing state with a return action', async () => {
    mockLoadAppointments.mockResolvedValue([]);
    const view = await render(<AppointmentDetailScreen />);

    expect(await view.findByText('تعذر العثور على الموعد')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'العودة إلى مواعيدي' }));
    expect(mockPush).toHaveBeenCalledWith('/(customer)/appointments');
  });

  it('keeps the stage visible while loading', async () => {
    mockLoadAppointments.mockReturnValue(new Promise(() => undefined));
    const view = await render(<AppointmentDetailScreen />);

    expect(view.getByLabelText('كوپا')).toBeTruthy();
    expect(view.getByTestId('appointment-detail-loading')).toBeTruthy();
  });
});
