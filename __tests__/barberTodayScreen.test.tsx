import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import BarberTodayScreen from '../app/(barber)/today';
import type { TodayAppointment } from '../src/booking';

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    router: { push: jest.fn() },
    useFocusEffect: (callback: () => void) => {
      ReactModule.useEffect(callback, [callback]);
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

jest.mock('react-native-qrcode-svg', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ value }: { value: string }) =>
      ReactModule.createElement(MockView, { testID: 'barber-qr-code', value } as never),
  };
});

const mockToday = jest.fn();
const mockMarkPresent = jest.fn();
const mockCancelBarber = jest.fn();
const mockUndoQrCheckIn = jest.fn();
const mockCaptureRef = jest.fn();
const mockIsSharingAvailable = jest.fn();
const mockShareAsync = jest.fn();

jest.mock('react-native-view-shot', () => ({
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsSharingAvailable(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock('../src/hooks/useBooking', () => ({
  useBooking: () => ({
    today: mockToday,
    markPresent: mockMarkPresent,
    cancelBarber: mockCancelBarber,
    undoQrCheckIn: mockUndoQrCheckIn,
    error: null,
  }),
}));

jest.mock('../src/providers/SessionProvider', () => ({
  useAppSession: () => ({ profile: { id: 'barber-id', name: 'أحمد' } }),
}));

const mockRouter = router as unknown as { push: jest.Mock };

function appointment(
  id: string,
  startsAt: string,
  status: TodayAppointment['status'],
  customerName: string,
  qrCheckInReversible = false,
): TodayAppointment {
  return {
    id,
    starts_at: startsAt,
    ends_at: new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString(),
    price_dzd: 800,
    status,
    service_name: 'حلاقة شعر',
    customer_name: customerName,
    customer_phone: '0550000000',
    qr_check_in_reversible: qrCheckInReversible,
  };
}

describe('BarberTodayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToday.mockResolvedValue([]);
    mockMarkPresent.mockResolvedValue(true);
    mockCancelBarber.mockResolvedValue(true);
    mockUndoQrCheckIn.mockResolvedValue('early');
    mockCaptureRef.mockResolvedValue('file:///tmp/koupa-qr.png');
    mockIsSharingAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps zero counters visible and opens Schedule from the empty state', async () => {
    await render(<BarberTodayScreen />);

    await screen.findByText('لا مواعيد اليوم');
    expect(screen.getByLabelText('القادمة، 0')).toBeTruthy();
    expect(screen.getByLabelText('حاضر، 0')).toBeTruthy();
    expect(screen.getByLabelText('مكتملة، 0')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'فتح الجدول' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/(barber)/schedule');
  });

  it('uses the Welcome-style logo treatment in the Today header', async () => {
    await render(<BarberTodayScreen />);

    await screen.findByText('لا مواعيد اليوم');
    expect(screen.getByLabelText('كوپا')).toHaveStyle({ height: 56 });
    expect(screen.getByTestId('today-logo-accent')).toBeTruthy();
    expect(screen.getByTestId('today-logo-wrap')).toHaveStyle({ left: 0 });
  });

  it('keeps the dashboard summary outside the clipped appointment scroller', async () => {
    await render(<BarberTodayScreen />);

    await screen.findByText('لا مواعيد اليوم');
    const appointmentList = screen.getByTestId('today-appointment-list');
    expect(within(appointmentList).queryByLabelText('القادمة، 0')).toBeNull();
  });

  it('renders appointments chronologically and marks booked customers present', async () => {
    mockToday.mockResolvedValue([
      appointment('late', '2026-07-29T11:00:00Z', 'completed', 'زبون متأخر'),
      appointment('early', '2026-07-29T08:00:00Z', 'booked', 'زبون مبكر'),
    ]);

    await render(<BarberTodayScreen />);

    await screen.findByText('زبون مبكر');
    const rows = screen.getAllByTestId('today-appointment-row');
    expect(within(rows[0]).getByText('زبون مبكر')).toBeTruthy();
    expect(screen.getByLabelText('القادمة، 1')).toBeTruthy();
    expect(screen.getByLabelText('مكتملة، 1')).toBeTruthy();

    await fireEvent.press(within(rows[0]).getByRole('button', { name: 'تأكيد الحضور' }));
    await waitFor(() => expect(mockMarkPresent).toHaveBeenCalledWith('early'));
  });

  it('opens appointment details and keeps cancellation behind confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockToday.mockResolvedValue([
      appointment('early', '2026-07-29T08:00:00Z', 'booked', 'زبون مبكر'),
    ]);

    await render(<BarberTodayScreen />);

    const row = await screen.findByTestId('today-appointment-row');
    await fireEvent.press(row);
    expect(screen.getByText('تفاصيل الموعد')).toBeTruthy();
    expect(screen.getByText('0550000000')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'إلغاء الموعد' }));
    expect(alert).toHaveBeenCalled();
  });

  it('opens a real QR surface without exposing the raw payload', async () => {
    await render(<BarberTodayScreen />);

    await screen.findByText('لا مواعيد اليوم');
    await fireEvent.press(screen.getAllByRole('button', { name: 'عرض رمز الحضور' })[0]);

    expect(screen.getByTestId('barber-qr-code')).toHaveProp(
      'value',
      'koupa://check-in/barber-id',
    );
    expect(screen.queryByText('koupa://check-in/barber-id')).toBeNull();
  });

  it('captures and shares the branded QR surface', async () => {
    await render(<BarberTodayScreen />);

    await screen.findByText('لا مواعيد اليوم');
    await fireEvent.press(screen.getAllByRole('button', { name: 'عرض رمز الحضور' })[0]);
    await fireEvent.press(screen.getByRole('button', { name: 'حفظ أو مشاركة الرمز' }));

    await waitFor(() => expect(mockCaptureRef).toHaveBeenCalled());
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///tmp/koupa-qr.png',
      expect.objectContaining({ mimeType: 'image/png' }),
    );
    expect(screen.getByTestId('barber-qr-share-card')).toBeTruthy();
  });

  it('allows the barber to undo a reversible QR check-in', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });
    mockToday.mockResolvedValue([
      appointment('early', '2026-07-29T08:00:00Z', 'present', 'زبون مبكر', true),
    ]);
    await render(<BarberTodayScreen />);

    const row = await screen.findByTestId('today-appointment-row');
    await fireEvent.press(row);
    await fireEvent.press(screen.getByRole('button', { name: 'التراجع عن الحضور' }));

    expect(alert).toHaveBeenCalled();
    await waitFor(() => expect(mockUndoQrCheckIn).toHaveBeenCalledWith('early'));
  });

  it('does not offer QR undo for a manual Present action', async () => {
    mockToday.mockResolvedValue([
      appointment('early', '2026-07-29T08:00:00Z', 'present', 'زبون مبكر'),
    ]);
    await render(<BarberTodayScreen />);

    await fireEvent.press(await screen.findByTestId('today-appointment-row'));
    expect(screen.queryByRole('button', { name: 'التراجع عن الحضور' })).toBeNull();
  });
});
