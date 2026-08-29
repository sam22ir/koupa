import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import ScanScreen from '../app/scan';

const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockRequestPermission = jest.fn();
const mockCheckInWithQr = jest.fn();
const mockClearError = jest.fn();

let mockPermission: { granted: boolean; canAskAgain: boolean } | null = {
  granted: true,
  canAskAgain: true,
};

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    back: () => mockBack(),
    canGoBack: () => mockCanGoBack(),
  },
  useLocalSearchParams: () => ({
    appointmentId: 'appointment-id',
    barberName: 'أحمد',
    startsAt: '2026-07-29T13:00:00Z',
  }),
}));

jest.mock('expo-camera', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    CameraView: (props: Record<string, unknown>) =>
      ReactModule.createElement(MockView, { testID: 'qr-camera', ...props }),
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('../src/hooks/useBooking', () => ({
  useBooking: () => ({
    checkInWithQr: mockCheckInWithQr,
    clearError: mockClearError,
    error: '',
  }),
}));

describe('ScanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockPermission = { granted: true, canAskAgain: true };
  });

  it('falls back to customer Home when the scanner has no navigation history', async () => {
    mockCanGoBack.mockReturnValue(false);
    await render(<ScanScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(mockReplace).toHaveBeenCalledWith('/(customer)/home');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('requests camera permission when it can ask again', async () => {
    mockPermission = { granted: false, canAskAgain: true };
    await render(<ScanScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'السماح بالكاميرا' }));
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('opens settings after camera permission is permanently denied', async () => {
    mockPermission = { granted: false, canAskAgain: false };
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await render(<ScanScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'فتح الإعدادات' }));
    expect(openSettings).toHaveBeenCalled();
  });

  it('explains invalid QR data and allows retry', async () => {
    await render(<ScanScreen />);

    await fireEvent(screen.getByTestId('qr-camera'), 'barcodeScanned', { data: 'not-a-koupa-code' });
    expect(await screen.findByText('هذا ليس رمز حضور صالحا من كوپا. امسح رمز QR الظاهر في حساب الحلاق.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'المسح مرة أخرى' }));
    expect(screen.getByTestId('qr-camera')).toBeTruthy();
  });

  it('shows a retryable message when the camera cannot mount', async () => {
    await render(<ScanScreen />);

    await fireEvent(screen.getByTestId('qr-camera'), 'mountError', {
      nativeEvent: { message: 'Camera unavailable' },
    });

    expect(await screen.findByText('تعذر تشغيل الكاميرا. اسمح بالوصول إليها من إعدادات الهاتف ثم حاول مرة أخرى.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'المسح مرة أخرى' }));
    expect(screen.getByTestId('qr-camera')).toBeTruthy();
  });

  it('dismisses to the refreshed appointment without duplicating its detail route', async () => {
    mockCheckInWithQr.mockResolvedValue({
      code: 'CHECKED_IN',
      appointmentId: 'appointment-id',
      barberName: 'أحمد',
      serviceName: 'حلاقة شعر',
      startsAt: '2026-07-29T13:00:00Z',
      endsAt: '2026-07-29T13:30:00Z',
    });
    await render(<ScanScreen />);

    await fireEvent(screen.getByTestId('qr-camera'), 'barcodeScanned', {
      data: 'koupa://check-in/11111111-2222-4333-8444-555555555555',
    });

    expect(await screen.findByText('تم تسجيل حضورك بنجاح.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'عرض الموعد' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/appointment/appointment-id');
    expect(mockReplace).not.toHaveBeenCalledWith('/appointment/appointment-id');
  });

  it.each([
    [{ code: 'ALREADY_PRESENT', appointmentId: 'appointment-id' }, 'تم تسجيل حضورك لهذا الموعد من قبل'],
    [{ code: 'WRONG_BARBER', expectedBarberName: 'بلال' }, 'هذا رمز حلاق آخر'],
    [{ code: 'TOO_EARLY', checkInOpensAt: '2026-07-29T12:30:00Z' }, 'لم يبدأ وقت تسجيل الحضور بعد'],
    [{ code: 'TOO_LATE', endsAt: '2026-07-29T13:30:00Z' }, 'انتهت فترة تسجيل الحضور عند'],
    [{ code: 'CANCELLED' }, 'هذا الموعد ملغى'],
    [{ code: 'NO_ACTIVE_APPOINTMENT' }, 'لا يوجد موعد محجوز مناسب لهذا الرمز'],
  ])('renders the %s server result', async (result, expectedText) => {
    mockCheckInWithQr.mockResolvedValue(result);
    await render(<ScanScreen />);

    await fireEvent(screen.getByTestId('qr-camera'), 'barcodeScanned', {
      data: 'koupa://check-in/11111111-2222-4333-8444-555555555555',
    });

    await waitFor(() => expect(screen.getByText(new RegExp(expectedText))).toBeTruthy());
  });

  it('shows a retryable connection state when validation fails', async () => {
    mockCheckInWithQr.mockResolvedValue(null);
    await render(<ScanScreen />);

    await fireEvent(screen.getByTestId('qr-camera'), 'barcodeScanned', {
      data: 'koupa://check-in/11111111-2222-4333-8444-555555555555',
    });

    expect(await screen.findByText('تعذر الاتصال بخدمة الحضور. تحقق من الإنترنت ثم أعد المحاولة. لم يتغير موعدك.')).toBeTruthy();
  });

  it('shows the mapped check-in error instead of a generic connection message', async () => {
    mockCheckInWithQr.mockRejectedValue(new Error('Appointment cannot be checked in'));
    await render(<ScanScreen />);

    await fireEvent(screen.getByTestId('qr-camera'), 'barcodeScanned', {
      data: 'koupa://check-in/11111111-2222-4333-8444-555555555555',
    });

    expect(await screen.findByText('لم نتمكن من تأكيد حضورك. تأكد من أن لديك موعدا محجوزا مع هذا الحلاق وأن وقت الحضور بدأ، ثم حاول مسح الرمز مرة أخرى.')).toBeTruthy();
    expect(screen.queryByText('تعذر الاتصال بخدمة الحضور. تحقق من الإنترنت ثم أعد المحاولة. لم يتغير موعدك.')).toBeNull();
  });
});
