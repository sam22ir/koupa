import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import CustomerHomeScreen from '../app/(customer)/home';
import AppointmentDetailScreen from '../app/appointment/[id]';
import type { Appointment } from '../src/booking';

const mockPush = jest.fn();
const mockLoadAppointments = jest.fn();

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() },
    useFocusEffect: (callback: () => void) => ReactModule.useEffect(callback, [callback]),
    useLocalSearchParams: () => ({ id: 'appointment-id' }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

jest.mock('../src/providers/SessionProvider', () => ({
  useAppSession: () => ({ profile: { id: 'customer-id', name: 'سارة' } }),
}));

jest.mock('../src/hooks/useBooking', () => ({
  loadCustomerAppointments: () => mockLoadAppointments(),
  useBooking: () => ({
    loading: false,
    error: '',
    cancelCustomer: jest.fn(),
    rateAppointment: jest.fn(),
  }),
}));

function appointment(status: Appointment['status']): Appointment {
  return {
    id: 'appointment-id',
    barber_id: 'barber-id',
    service_id: 'service-id',
    starts_at: '2026-07-29T13:00:00Z',
    ends_at: '2026-07-29T13:30:00Z',
    price_dzd: 800,
    status,
    service_name: 'حلاقة شعر',
    barber_name: 'أحمد',
  };
}

const expectedRoute = {
  pathname: '/scan',
  params: {
    appointmentId: 'appointment-id',
    barberName: 'أحمد',
    startsAt: '2026-07-29T13:00:00Z',
  },
};

describe('customer QR entry points', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the scanner with appointment context from Home', async () => {
    mockLoadAppointments.mockResolvedValue([appointment('booked')]);
    await render(<CustomerHomeScreen />);

    await fireEvent.press(await screen.findByText('مسح رمز الحضور'));
    expect(mockPush).toHaveBeenCalledWith(expectedRoute);
  });

  it('hides the Home scanner action after attendance is confirmed', async () => {
    mockLoadAppointments.mockResolvedValue([appointment('present')]);
    await render(<CustomerHomeScreen />);

    await screen.findByText('حاضر');
    expect(screen.queryByText('مسح رمز الحضور')).toBeNull();
  });

  it('opens the scanner with appointment context from details', async () => {
    mockLoadAppointments.mockResolvedValue([appointment('booked')]);
    await render(<AppointmentDetailScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'مسح رمز الحضور' }));
    expect(mockPush).toHaveBeenCalledWith(expectedRoute);
  });

  it('hides the details scanner action after attendance is confirmed', async () => {
    mockLoadAppointments.mockResolvedValue([appointment('present')]);
    await render(<AppointmentDetailScreen />);

    await screen.findAllByText('حاضر');
    expect(screen.queryByRole('button', { name: 'مسح رمز الحضور' })).toBeNull();
  });
});
