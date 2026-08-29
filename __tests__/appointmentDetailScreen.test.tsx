import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import AppointmentDetailScreen from '../app/appointment/[id]';
import type { Appointment } from '@/src/booking';

const mockLoadAppointments = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => {
  return {
    router: {
      push: (...args: unknown[]) => mockPush(...args),
      dismissTo: (...args: unknown[]) => mockDismissTo(...args),
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
  SafeAreaListener: ({ children }: any) => children ?? null,
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
    shop_name: overrides.shop_name ?? 'صالون النور',
    location_maps_url: overrides.location_maps_url ?? null,
    rating: overrides.rating ?? null,
  };
}

describe('customer appointment detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the approved appointment summary and stable action grid', async () => {
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-08-04T07:00:00.000Z').getTime());

    try {
      mockLoadAppointments.mockResolvedValue([appointment({})]);
      const view = await render(<AppointmentDetailScreen />);

      expect(await view.findByTestId('page-header-paper')).toBeTruthy();
      expect(view.getByText('تفاصيل الموعد')).toBeTruthy();
      expect(view.getByRole('button', { name: 'رجوع' })).toHaveStyle({
        width: 44,
        height: 44,
      });
      expect(view.getAllByText('محجوز').length).toBeGreaterThan(0);
      expect(view.getByText('حلاقة ولحية')).toBeTruthy();
      expect(view.getByText('أمين')).toBeTruthy();
      expect(view.queryByText('أم')).toBeNull();
      expect(view.getByText('صالون النور')).toBeTruthy();
      expect(view.queryByRole('button', { name: 'مسح رمز الحضور' })).toBeNull();
      expect(view.getByRole('button', { name: 'المزيد' })).toBeTruthy();
      await fireEvent.press(view.getByRole('button', { name: 'المزيد' }));
      expect(view.getByRole('button', { name: 'إعادة الجدولة' })).toBeTruthy();
      expect(view.getByRole('button', { name: 'إلغاء الموعد' })).toBeTruthy();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('shows a compact location action only when a location is available', async () => {
    mockLoadAppointments.mockResolvedValue([appointment({ location_maps_url: 'https://maps.google.com/?q=36.7,3.0' })]);
    const view = await render(<AppointmentDetailScreen />);

    expect(await view.findByRole('button', { name: 'فتح الموقع' })).toBeTruthy();
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
    expect(view.queryByRole('button', { name: 'إعادة الجدولة' })).toBeNull();
    expect(view.queryByRole('button', { name: 'إلغاء الموعد' })).toBeNull();
    if (status === 'cancelled') {
      await fireEvent.press(view.getByRole('button', { name: 'العودة إلى مواعيدي' }));
      expect(mockDismissTo).toHaveBeenCalledWith('/(customer)/appointments');
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
    expect(view.getByRole('button', { name: 'تقييم 1 من 5' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'تقييم 5 من 5' })).toBeTruthy();
  });

  it('loads an existing rating into the editable rating card', async () => {
    mockLoadAppointments.mockResolvedValue([appointment({
      status: 'completed',
      rating: {
        id: 'rating-1',
        stars: 3,
        created_at: '2026-08-04T11:00:00.000Z',
        updated_at: '2026-08-04T11:00:00.000Z',
      },
    })]);
    const view = await render(<AppointmentDetailScreen />);

    expect(await view.findByText('تعديل التقييم')).toBeTruthy();
    expect(view.getByRole('button', { name: 'تقييم 3 من 5' })).toBeSelected();
  });

  it('preserves the details header and offers retry when the appointment is missing', async () => {
    mockLoadAppointments.mockRejectedValueOnce(new Error('network'));
    const view = await render(<AppointmentDetailScreen />);

    expect(await view.findByText('تفاصيل الموعد')).toBeTruthy();
    expect(view.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'العودة إلى مواعيدي' })).toBeTruthy();
  });

  it('shows an explicit missing state with a return action', async () => {
    mockLoadAppointments.mockResolvedValue([]);
    const view = await render(<AppointmentDetailScreen />);

    expect(await view.findByText('تعذر العثور على الموعد')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'العودة إلى مواعيدي' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/(customer)/appointments');
  });

  it('keeps the stage visible while loading', async () => {
    mockLoadAppointments.mockReturnValue(new Promise(() => undefined));
    const view = await render(<AppointmentDetailScreen />);

    expect(view.getByTestId('page-header-paper')).toBeTruthy();
    expect(view.getByTestId('appointment-detail-loading')).toBeTruthy();
  });
});
