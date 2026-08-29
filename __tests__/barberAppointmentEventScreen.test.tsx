import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import BarberAppointmentEventScreen from '@/app/barber-appointment/[id]';

const mockLoadBarberAppointment = jest.fn();
const mockToday = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
  },
  useLocalSearchParams: () => ({ id: 'appointment-1' }),
}));

jest.mock('@/src/hooks/useBooking', () => ({
  loadBarberAppointment: () => mockLoadBarberAppointment(),
  useBooking: () => ({ today: mockToday }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

describe('barber appointment event screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the notified appointment with the customer and its status', async () => {
    mockLoadBarberAppointment.mockResolvedValue({
      id: 'appointment-1',
      starts_at: '2026-08-17T10:00:00.000Z',
      ends_at: '2026-08-17T10:30:00.000Z',
      price_dzd: 800,
      status: 'absent',
      service_name: 'حلاقة شعر',
      customer_name: 'سارة',
      customer_phone: '0550000000',
    });

    const view = await render(<BarberAppointmentEventScreen />);

    expect(await view.findByText('سارة')).toBeTruthy();
    expect(view.getByText('حلاقة شعر')).toBeTruthy();
    expect(view.getByText('غائب')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'العودة إلى اليوم' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/(barber)/today');
  });
});
