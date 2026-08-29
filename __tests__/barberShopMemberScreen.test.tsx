import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import ShopMemberScreen from '@/app/(barber)/shop-member/[barberId]';
import { emptyBarberSettingsDraft } from '@/src/barberSettings';

const mockDismissTo = jest.fn();
const mockReplace = jest.fn();
const mockAddListener = jest.fn();
const mockDispatch = jest.fn();
const mockGetActivity = jest.fn();
const mockRemoveMember = jest.fn();
let mockBeforeRemove: ((event: any) => void) | undefined;
let mockSettings: Record<string, unknown>;
let mockWorkspaceOnBack: (() => void) | undefined;
let mockWorkspaceOnRemove: (() => void) | undefined;
const mockNavigation = {
  addListener: (...args: unknown[]) => {
    mockBeforeRemove = args[1] as never;
    return mockAddListener(...args);
  },
  dispatch: (...args: unknown[]) => mockDispatch(...args),
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  }),
  useLocalSearchParams: () => ({ barberId: 'barber-2' }),
  useNavigation: () => mockNavigation,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ session: { user: { id: 'owner-1' } } }),
}));

jest.mock('@/src/hooks/useShops', () => ({
  useShops: () => ({
    state: {
      members: [{
        id: 'membership-1',
        shop_id: 'shop-1',
        barber_id: 'barber-2',
        barber_name: 'عمر',
        barber_phone: '0555000000',
        status: 'active',
        created_at: '2026-08-17T10:00:00.000Z',
        updated_at: '2026-08-17T10:00:00.000Z',
      }],
    },
    ownedShop: { id: 'shop-1' },
    getActivity: mockGetActivity,
    error: '',
    loading: false,
    removeMember: mockRemoveMember,
  }),
}));

jest.mock('@/src/hooks/useManagedBarberSettings', () => ({
  useManagedBarberSettings: () => mockSettings,
}));

jest.mock('@/src/features/barber-shop/ShopMemberWorkspace', () => {
  return {
    ShopMemberWorkspace: ({
      onBack,
      onRemove,
    }: {
      readonly onBack: () => void;
      readonly onRemove: () => void;
    }) => {
      mockWorkspaceOnBack = onBack;
      mockWorkspaceOnRemove = onRemove;
      return null;
    },
  };
});

function leaveEvent() {
  return { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
}

describe('owner member screen routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBeforeRemove = undefined;
    mockWorkspaceOnBack = undefined;
    mockWorkspaceOnRemove = undefined;
    mockAddListener.mockReturnValue(jest.fn());
    mockGetActivity.mockReturnValue(new Promise(() => undefined));
    mockRemoveMember.mockResolvedValue(true);
    mockSettings = {
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
    };
  });

  it('confirms a dirty header Back, then dismisses to the Shop hub after save', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      buttons?.find((button) => button.text === 'حفظ')?.onPress?.();
    });
    render(<ShopMemberScreen />);
    await waitFor(() => expect(mockWorkspaceOnBack).toEqual(expect.any(Function)));

    await act(async () => mockWorkspaceOnBack?.());

    await waitFor(() => expect(mockSettings.save).toHaveBeenCalledTimes(1));
    expect(mockDismissTo).toHaveBeenCalledWith('/(barber)/shop');
    expect(mockReplace).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('retains edits when a header Back save fails', async () => {
    mockSettings = { ...mockSettings, save: jest.fn(async () => false) };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      buttons?.find((button) => button.text === 'حفظ')?.onPress?.();
    });
    render(<ShopMemberScreen />);
    await waitFor(() => expect(mockWorkspaceOnBack).toEqual(expect.any(Function)));

    await act(async () => mockWorkspaceOnBack?.());

    await waitFor(() => expect(mockSettings.save).toHaveBeenCalledTimes(1));
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(mockSettings.reset).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('intercepts system Back and discards only after confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      buttons?.find((button) => button.text === 'تجاهل')?.onPress?.();
    });
    render(<ShopMemberScreen />);
    await waitFor(() => expect(mockBeforeRemove).toEqual(expect.any(Function)));
    const event = leaveEvent();

    mockBeforeRemove?.(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSettings.reset).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(event.data.action);
    alert.mockRestore();
  });

  it('does not remove a member when the owner keeps editing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<ShopMemberScreen />);
    await waitFor(() => expect(mockWorkspaceOnRemove).toEqual(expect.any(Function)));

    mockWorkspaceOnRemove?.();

    expect(alert).toHaveBeenCalledWith(
      'تغييرات غير محفوظة',
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'متابعة التعديل' })]),
    );
    expect(mockRemoveMember).not.toHaveBeenCalled();

    alert.mockRestore();
  });
});
