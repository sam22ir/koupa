import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import BarberScheduleScreen from '../app/(barber)/schedule';
import { emptyBarberSettingsDraft } from '../src/barberSettings';

function elementChildren<T extends { props: Record<string, unknown> }>(
  node: { children: ReadonlyArray<string | T> },
): T[] {
  return node.children.filter((child): child is T => typeof child !== 'string');
}

const mockAddListener = jest.fn();
const mockDispatch = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useNavigation: () => ({
    addListener: mockAddListener,
    dispatch: mockDispatch,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('@react-native-community/datetimepicker', () => () => null);

jest.mock('../src/providers/SessionProvider', () => ({
  useAppSession: () => ({ session: { user: { id: 'barber-1' } }, profile: { id: 'barber-1' } }),
}));

const activeService = {
  id: 'service-1',
  name: 'حلاقة شعر',
  priceDzd: '800',
  durationMinutes: '30',
  isActive: true,
};

const archivedService = {
  id: 'service-2',
  name: 'صبغة شعر',
  priceDzd: '1200',
  durationMinutes: '45',
  isActive: false,
};

const workspaceSettings = {
  ...emptyBarberSettingsDraft,
  services: [activeService, archivedService],
};

const mockSetDraft = jest.fn();
const mockSave = jest.fn(async () => true);
const mockReset = jest.fn();

let mockHookValue: Record<string, unknown>;

jest.mock('../src/hooks/useBarberSettings', () => ({
  useBarberSettings: () => mockHookValue,
}));

describe('BarberScheduleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue(jest.fn());
    mockHookValue = {
      draft: {
        ...workspaceSettings,
        settings: workspaceSettings,
        exceptions: [],
      },
      loaded: { settings: workspaceSettings, exceptions: [] },
      setDraft: mockSetDraft,
      dirty: false,
      errors: {},
      loading: false,
      saving: false,
      error: '',
      message: '',
      save: mockSave,
      reset: mockReset,
      reload: jest.fn(),
    };
  });

  it('renders booking status and tabs without a screen masthead', async () => {
    await render(<BarberScheduleScreen />);

    expect(screen.queryByText('الجدول والخدمات')).toBeNull();
    expect(screen.getByText('ساعات العمل الأسبوعية')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'استقبال الحجوزات' })).toBeChecked();
    expect(screen.getByRole('tab', { name: 'الجدول' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'الخدمات' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'الإعدادات' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'حفظ التغييرات' })).toBeNull();
  });

  it('edits weekly hours, breaks, and date exceptions from the Schedule tab', async () => {
    await render(<BarberScheduleScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'تعديل الأحد' }));
    expect(screen.getByRole('switch', { name: 'الأحد مفتوح' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إضافة استراحة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'نسخ الأوقات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إضافة استثناء' })).toBeTruthy();
  });

  it('selects an exception date from the inline calendar', async () => {
    // Pin the system clock so the hardcoded calendar target stays selectable
    // (past days are disabled by design). Fake timers cover both Date.now()
    // and new Date(), which calendarToday() relies on.
    jest.useFakeTimers({ now: new Date('2026-08-10T10:00:00.000Z') });
    try {
      await render(<BarberScheduleScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'إضافة استثناء' }));
      expect(screen.getByTestId('exception-inline-calendar')).toBeTruthy();
      expect(screen.queryByLabelText('تاريخ الاستثناء')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: '18 أوت 2026' }));
      await fireEvent.press(screen.getByRole('button', { name: 'إضافة إلى المسودة' }));
      expect(mockSetDraft).toHaveBeenCalledWith(expect.objectContaining({
        exceptions: [expect.objectContaining({ exceptionDate: '2026-08-18' })],
      }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows active and archived services with restore behavior', async () => {
    await render(<BarberScheduleScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'الخدمات' }));
    expect(screen.getByTestId('services-overview-header')).toBeTruthy();
    expect(screen.getByText('الخدمات المتاحة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إضافة خدمة' })).toBeTruthy();
    expect(screen.getByText('حلاقة شعر')).toBeTruthy();
    expect(screen.getByText('800 دج')).toBeTruthy();
    expect(screen.getByText('30 دقيقة')).toBeTruthy();
    expect(screen.queryByText('')).toBeNull();
    expect(screen.queryByText('صبغة شعر')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'تعديل خدمة حلاقة شعر' }));
    expect(screen.getByText('تعديل الخدمة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'أرشفة الخدمة' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'أرشفة الخدمة' }));
    expect(screen.getByText('هل تريد أرشفة هذه الخدمة؟')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'تأكيد الأرشفة' }));
    expect(mockSetDraft).toHaveBeenCalledWith(expect.objectContaining({
      settings: expect.objectContaining({
        services: expect.arrayContaining([
          expect.objectContaining({ id: 'service-1', isActive: false }),
        ]),
      }),
    }));

    await fireEvent.press(screen.getByRole('button', { name: 'الخدمات المؤرشفة' }));
    const archivedCard = screen.getByTestId('archived-service-service-2');
    expect(elementChildren(archivedCard).map((child) => child.props.testID ?? child.props.accessibilityLabel)).toEqual([
      'archived-service-header-service-2',
      'archived-service-facts-service-2',
    ]);
    expect(screen.getByText('صبغة شعر')).toBeTruthy();
    expect(screen.getByText('1200 دج')).toBeTruthy();
    expect(screen.getByText('45 دقيقة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'استعادة خدمة صبغة شعر' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'استعادة خدمة صبغة شعر' }));
    expect(mockSetDraft).toHaveBeenCalled();
  });

  it('uses constrained booking-rule controls instead of numeric fields', async () => {
    await render(<BarberScheduleScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'الإعدادات' }));
    expect(screen.getByText('كم دقيقة بين كل موعد وآخر')).toBeTruthy();
    expect(screen.getByText('كم دقيقة قبل الموعد يجب الحجز')).toBeTruthy();
    expect(screen.getByRole('radio', { name: '5 دقائق' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '15 دقيقة' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'نافذة الحجز: 7 أيام' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'الحد الأدنى للإشعار: بدون' })).toBeSelected();

    await fireEvent.press(screen.getByRole('radio', { name: 'نافذة الحجز: 14 يوما' }));
    expect(mockSetDraft).toHaveBeenCalledWith(expect.objectContaining({
      settings: expect.objectContaining({ bookingWindowDays: '14' }),
    }));
  });

  it('enables Save and shows dirty status when the draft changes', async () => {
    mockHookValue = { ...mockHookValue, dirty: true };
    await render(<BarberScheduleScreen />);

    expect(screen.getByText('تغييرات غير محفوظة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeEnabled();
  });

  it('moves to the first invalid tab when Save validates the complete draft', async () => {
    mockHookValue = {
      ...mockHookValue,
      dirty: true,
      draft: {
        settings: {
          ...workspaceSettings,
          services: [archivedService],
        },
        exceptions: [],
      },
    };
    await render(<BarberScheduleScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    expect(screen.getByRole('tab', { name: 'الخدمات' })).toBeSelected();
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('offers Save, discard, and continue editing when leaving a dirty workspace', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockHookValue = { ...mockHookValue, dirty: true };
    await render(<BarberScheduleScreen />);
    const listener = mockAddListener.mock.calls.find(([name]) => name === 'beforeRemove')?.[1];
    const preventDefault = jest.fn();

    listener({ preventDefault, data: { action: { type: 'GO_BACK' } } });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith(
      'تغييرات غير محفوظة',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'متابعة التعديل' }),
        expect.objectContaining({ text: 'تجاهل' }),
        expect.objectContaining({ text: 'حفظ' }),
      ]),
    );
    alert.mockRestore();
  });
});
