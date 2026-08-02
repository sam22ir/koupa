import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import CustomerHomeScreen from '../app/(customer)/home';
import type { Appointment } from '@/src/booking';
import { RecentBarbers } from '@/src/features/customer-home/RecentBarbers';

const mockLoadAppointments = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() },
    useFocusEffect: (callback: () => void) => ReactModule.useEffect(callback, [callback]),
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
  };
}

describe('customer Home recent barbers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(mockPush).toHaveBeenCalledWith('/barber/barber-1');
  });

  it('keeps appointment actions contextual for booked and present appointments', async () => {
    mockLoadAppointments.mockResolvedValue([appointment({ status: 'booked', starts_at: '2026-08-03T10:00:00.000Z' })]);
    const bookedView = await render(<CustomerHomeScreen />);
    expect(await bookedView.findByText('إدارة الموعد')).toBeTruthy();
    expect(bookedView.getByText('مسح رمز الحضور')).toBeTruthy();
    expect(bookedView.getByText('إعادة جدولة')).toBeTruthy();
    expect(bookedView.getByText('إلغاء الموعد')).toBeTruthy();

    mockLoadAppointments.mockResolvedValue([appointment({ status: 'present' })]);
    const presentView = await render(<CustomerHomeScreen />);
    expect(await presentView.findByText('إدارة الموعد')).toBeTruthy();
    expect(presentView.queryByText('مسح رمز الحضور')).toBeNull();
    expect(presentView.queryByText('إلغاء الموعد')).toBeNull();
  });

  it('does not show the empty CTA after an initial load error', async () => {
    mockLoadAppointments.mockRejectedValue(new Error('network'));
    const view = await render(<CustomerHomeScreen />);

    expect(await view.findByRole('button', { name: 'إعادة تحميل المواعيد' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'اعثر على حلاق' })).toBeNull();
  });
});
