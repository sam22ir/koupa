import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import BarberScheduleScreen from '../app/(barber)/schedule';
import { emptyBarberSettingsDraft } from '../src/barberSettings';

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

  it('renders the branded workspace, positive booking status, tabs, and sticky Save', async () => {
    await render(<BarberScheduleScreen />);

    expect(screen.getByText('الجدول والخدمات')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'استقبال الحجوزات' })).toBeChecked();
    expect(screen.getByRole('tab', { name: 'الجدول' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'الخدمات' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'الإعدادات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeDisabled();
  });

  it('edits weekly hours, breaks, and date exceptions from the Schedule tab', async () => {
    await render(<BarberScheduleScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'تعديل الأحد' }));
    expect(screen.getByRole('switch', { name: 'الأحد مفتوح' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إضافة استراحة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'نسخ الأوقات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إضافة استثناء' })).toBeTruthy();
  });

  it('shows active and archived services with restore behavior', async () => {
    await render(<BarberScheduleScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'الخدمات' }));
    expect(screen.getByText('حلاقة شعر')).toBeTruthy();
    expect(screen.queryByText('صبغة شعر')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'الخدمات المؤرشفة' }));
    expect(screen.getByText('صبغة شعر')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'استعادة خدمة صبغة شعر' }));
    expect(mockSetDraft).toHaveBeenCalled();
  });

  it('uses constrained booking-rule controls instead of numeric fields', async () => {
    await render(<BarberScheduleScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'الإعدادات' }));
    expect(screen.getByRole('radio', { name: '5 دقائق' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '15 دقيقة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'نافذة الحجز: 7 أيام' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'الحد الأدنى للإشعار: بدون' })).toBeTruthy();
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
