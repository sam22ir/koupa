import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import CustomerHomeScreen from '../app/(customer)/home';
import AppointmentDetailScreen from '../app/appointment/[id]';
import type { Appointment } from '../src/booking';

const mockPush = jest.fn();
const mockLoadAppointments = jest.fn();

jest.mock('@/src/hooks/useQueue', () => ({
  useMyQueueEntry: () => ({ entry: null, loaded: true, error: '', leaving: false, refresh: jest.fn(), leave: jest.fn() }),
}));

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
  SafeAreaListener: ({ children }: any) => children ?? null,
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

function appointment(status: Appointment['status'], startsAt = new Date(Date.now() + 15 * 60_000).toISOString()): Appointment {
  return {
    id: 'appointment-id',
    barber_id: 'barber-id',
    service_id: 'service-id',
    starts_at: startsAt,
    ends_at: new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString(),
    price_dzd: 800,
    status,
    service_name: 'حلاقة شعر',
    barber_name: 'أحمد',
  };
}

function expectedScanRoute(startsAt: string) {
  return {
    pathname: '/scan',
    params: {
      appointmentId: 'appointment-id',
      barberName: 'أحمد',
      startsAt,
    },
  };
}

describe('customer QR entry points', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the scanner with appointment context from Home', async () => {
    const item = appointment('booked');
    mockLoadAppointments.mockResolvedValue([item]);
    await render(<CustomerHomeScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'مسح رمز الحضور' }));
    expect(mockPush).toHaveBeenCalledWith(expectedScanRoute(item.starts_at));
  });

  it('keeps the Home content scrollable when it exceeds the viewport', async () => {
    mockLoadAppointments.mockResolvedValue([]);
    const view = await render(<CustomerHomeScreen />);

    await screen.findByRole('button', { name: 'اعثر على حلاق' });
    const root = view.root;
    if (!root) throw new Error('Home root was not rendered');
    expect(String(root.type)).toContain('ScrollView');
    expect(root.props.contentInsetAdjustmentBehavior).toBe('automatic');
    expect(root.props.scrollEnabled).toBe(true);
  });

  it('hides the Home scanner action after attendance is confirmed', async () => {
    mockLoadAppointments.mockResolvedValue([appointment('present')]);
    await render(<CustomerHomeScreen />);

    await screen.findAllByText('حاضر');
    expect(screen.queryByText('مسح رمز الحضور')).toBeNull();
  });

  it('opens the scanner with appointment context from details', async () => {
    const item = appointment('booked');
    mockLoadAppointments.mockResolvedValue([item]);
    await render(<AppointmentDetailScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'مسح رمز الحضور' }));
    expect(mockPush).toHaveBeenCalledWith(expectedScanRoute(item.starts_at));
  });

  it('hides the details scanner action after attendance is confirmed', async () => {
    mockLoadAppointments.mockResolvedValue([appointment('present')]);
    await render(<AppointmentDetailScreen />);

    await screen.findAllByText('حاضر');
    expect(screen.queryByRole('button', { name: 'مسح رمز الحضور' })).toBeNull();
  });
});
