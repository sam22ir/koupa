import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import CustomerHomeScreen from '../app/(customer)/home';
import type { Appointment } from '@/src/booking';
import { RecentBarbers } from '@/src/features/customer-home/RecentBarbers';

const mockLoadAppointments = jest.fn();
const mockPush = jest.fn();
let focusCallback: (() => void) | null = null;

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() },
    useFocusEffect: (callback: () => void) => {
      focusCallback = callback;
      return ReactModule.useEffect(callback, [callback]);
    },
  };
});

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ profile: { id: 'customer-1', name: 'سارة' } }),
}));

jest.mock('@/src/hooks/useBooking', () => ({
  loadCustomerAppointments: () => mockLoadAppointments(),
  useBooking: () => ({
    error: '',
    cancelCustomer: jest.fn(async () => true),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

function appointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: overrides.id ?? 'appointment-1',
    barber_id: overrides.barber_id ?? 'barber-1',
    service_id: overrides.service_id ?? 'service-1',
    starts_at: overrides.starts_at ?? '2026-07-31T10:00:00.000Z',
    ends_at: overrides.ends_at ?? '2026-07-31T10:30:00.000Z',
    price_dzd: overrides.price_dzd ?? 800,
    status: overrides.status ?? 'booked',
    service_name: overrides.service_name ?? 'حلاقة شعر',
    barber_name: overrides.barber_name ?? 'أحمد',
    shop_name: overrides.shop_name ?? 'صالون النور',
  };
}

describe('customer Home recent barbers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    focusCallback = null;
  });

  it('opens the selected barber profile through the callback', async () => {
    const onSelect = jest.fn();
    const view = await render(
      <RecentBarbers
        items={[{
          barberId: 'barber-1',
          barberName: 'أحمد',
          lastVisitedAt: '2026-07-30T10:00:00.000Z',
        }]}
        onSelect={onSelect}
      />,
    );

    expect(view.getByText('أحمد')).toBeTruthy();
    expect(view.getByText(/آخر زيارة/)).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: /أحمد/ }));
    expect(onSelect).toHaveBeenCalledWith('barber-1');
  });

  it('keeps the stage visible while the body is loading', async () => {
    mockLoadAppointments.mockReturnValue(new Promise(() => undefined));
    const view = await render(<CustomerHomeScreen />);

    expect(view.getByText('مرحبا، سارة')).toBeTruthy();
    expect(view.getByTestId('customer-home-skeleton')).toBeTruthy();
    expect(view.queryByText('اعثر على حلاق')).toBeNull();
  });

  it('renders one discovery CTA and recent barbers without duplicate navigation tiles', async () => {
    mockLoadAppointments.mockResolvedValue([
      appointment({ status: 'completed', barber_id: 'barber-1', barber_name: 'أحمد' }),
    ]);
    const view = await render(<CustomerHomeScreen />);

    expect(await view.findByRole('button', { name: 'اعثر على حلاق' })).toBeTruthy();
    expect(view.getByText('حلاقون زرتهم مؤخرا')).toBeTruthy();
    expect(view.queryByText('اكتشف حلاق')).toBeNull();
    expect(view.queryByText('مواعيدي')).toBeNull();
    expect(view.queryByText('ابحث عن حلاق أو محل')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: /أحمد/ }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/barber/[id]',
      params: { id: 'barber-1', returnTo: '/home' },
    });
  });

  it('keeps appointment actions contextual for booked and present appointments', async () => {
    const bookedStart = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    mockLoadAppointments.mockResolvedValue([appointment({
      status: 'booked',
      starts_at: bookedStart,
      ends_at: new Date(new Date(bookedStart).getTime() + 30 * 60_000).toISOString(),
    })]);
    const bookedView = await render(<CustomerHomeScreen />);
    expect(await bookedView.findByText('موعدك القادم')).toBeTruthy();
    expect(bookedView.getByText('صالون النور')).toBeTruthy();
    expect(bookedView.queryByText('أح')).toBeNull();
    expect(bookedView.getByText('الوقت')).toBeTruthy();
    expect(bookedView.getByText('السعر')).toBeTruthy();
    expect(await bookedView.findByRole('button', { name: 'تفاصيل الموعد' })).toBeTruthy();
    expect(bookedView.queryByText('مسح الحضور')).toBeNull();
    expect(bookedView.queryByText('إعادة الجدولة')).toBeNull();
    expect(bookedView.queryByText('إلغاء الموعد')).toBeNull();
    expect(bookedView.getByRole('button', { name: 'المزيد' })).toBeTruthy();
    await fireEvent.press(bookedView.getByRole('button', { name: 'المزيد' }));
    expect(bookedView.getByRole('button', { name: 'إعادة الجدولة' })).toBeTruthy();
    expect(bookedView.getByRole('button', { name: 'إلغاء الموعد' })).toBeTruthy();

    const futureStart = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    mockLoadAppointments.mockResolvedValue([appointment({
      status: 'present',
      starts_at: futureStart,
      ends_at: new Date(new Date(futureStart).getTime() + 30 * 60_000).toISOString(),
    })]);
    const presentView = await render(<CustomerHomeScreen />);
    expect(await presentView.findByRole('button', { name: 'تفاصيل الموعد' })).toBeTruthy();
    expect(presentView.queryByText('مسح الحضور')).toBeNull();
    expect(presentView.queryByText('إعادة الجدولة')).toBeNull();
    expect(presentView.queryByText('إلغاء الموعد')).toBeNull();
  });

  it('keeps the previous appointment visible with a compact retry action after refresh fails', async () => {
    const start = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    mockLoadAppointments.mockResolvedValueOnce([appointment({ starts_at: start })]).mockRejectedValueOnce(new Error('network'));
    const view = await render(<CustomerHomeScreen />);

    expect(await view.findByText('صالون النور')).toBeTruthy();
    await act(async () => {
      focusCallback?.();
      await Promise.resolve();
    });

    expect(view.getByText('صالون النور')).toBeTruthy();
    await waitFor(() => expect(view.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy());
  });

  it('does not show the empty CTA after an initial load error', async () => {
    mockLoadAppointments.mockRejectedValue(new Error('network'));
    const view = await render(<CustomerHomeScreen />);

    expect(await view.findByRole('button', { name: 'إعادة تحميل المواعيد' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'اعثر على حلاق' })).toBeNull();
  });
});
