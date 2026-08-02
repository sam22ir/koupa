import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ShopMemberWorkspace } from '@/src/features/barber-shop/ShopMemberWorkspace';
import type { ShopMembership } from '@/src/shops';
import { emptyBarberSettingsDraft } from '@/src/barberSettings';

const recentUpdate = new Date().toISOString();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
}));

const member: ShopMembership = {
  id: 'membership-1',
  shop_id: 'shop-1',
  barber_id: 'barber-2',
  barber_name: 'عمر',
  barber_phone: '0555000000',
  status: 'active',
  created_at: '2026-07-20T08:00:00.000Z',
  updated_at: recentUpdate,
};

function settingsFacade(): any {
  return {
    loaded: { settings: emptyBarberSettingsDraft, exceptions: [] },
    draft: { settings: emptyBarberSettingsDraft, exceptions: [] },
    setDraft: jest.fn(),
    dirty: true,
    errors: {},
    loading: false,
    saving: false,
    error: '',
    message: '',
    save: jest.fn(async () => true),
    reset: jest.fn(),
    reload: jest.fn(async () => undefined),
  };
}

describe('owner barber member workspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows member summary, status, and activity', async () => {
    const screen = await render(
      <ShopMemberWorkspace
        member={member}
        activity={[{
          id: 'activity-1',
          action: 'member_joined',
          actorName: 'سمير',
          affectedBarberName: 'عمر',
          createdAt: recentUpdate,
        }]}
        settings={settingsFacade()}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getAllByText('عمر').length).toBeGreaterThan(0);
    expect(screen.getByText('نشط')).toBeTruthy();
    expect(screen.getByText('آخر تحديث اليوم')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'النشاط' }));
    expect(screen.getByText('انضمام حلاق')).toBeTruthy();
  });

  it('saves owner edits only from the schedule/services view', async () => {
    const settings = settingsFacade();
    const screen = await render(
      <ShopMemberWorkspace member={member} activity={[]} settings={settings} onRemove={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'الجدول والخدمات' }));
    await fireEvent.press(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    expect(settings.save).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before removing a member', async () => {
    const onRemove = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((button) => button.text === 'إزالة من المحل');
      confirm?.onPress?.();
    });
    const screen = await render(
      <ShopMemberWorkspace member={member} activity={[]} settings={settingsFacade()} onRemove={onRemove} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'إزالة من المحل' }));
    expect(alertSpy).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
