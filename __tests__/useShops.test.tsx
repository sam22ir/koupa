import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useShops } from '@/src/hooks/useShops';

const mockLoadBarberShopState = jest.fn();
const mockSearchShopBarberCandidates = jest.fn();
const mockInviteBarberToShop = jest.fn();

jest.mock('@/src/services/shops', () => ({
  loadBarberShopState: (...args: unknown[]) => mockLoadBarberShopState(...args),
  searchShopBarberCandidates: (...args: unknown[]) => mockSearchShopBarberCandidates(...args),
  inviteBarberToShop: (...args: unknown[]) => mockInviteBarberToShop(...args),
}));

describe('useShops search recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadBarberShopState.mockRejectedValueOnce(new Error('temporary load failure'));
    mockSearchShopBarberCandidates.mockResolvedValue([
      { id: 'barber-1', name: 'سمير', city: 'الجزائر', neighborhood: 'حيدرة' },
    ]);
    mockInviteBarberToShop.mockResolvedValue(undefined);
  });

  it('clears a stale shop-state error after barber search succeeds', async () => {
    const { result } = await renderHook(() => useShops('owner-1'));

    await waitFor(() => expect(result.current.error).toBe('failed'));

    await act(async () => {
      await result.current.searchBarbers('سمير');
    });

    expect(result.current.error).toBe('');
    expect(result.current.searchBarbers).toBeDefined();
  });

  it('does not return the current barber as an invite candidate', async () => {
    mockLoadBarberShopState.mockReset();
    mockLoadBarberShopState.mockResolvedValue({
      ownedShop: { id: 'shop-1', name: 'محل النور' },
      membership: null,
      relationship: { kind: 'owner' },
      pendingRequests: [],
      members: [],
    });
    mockSearchShopBarberCandidates.mockReset();
    mockSearchShopBarberCandidates.mockResolvedValue([
      { id: 'owner-1', name: 'الحلاق الحالي', city: 'الجزائر', neighborhood: null },
      { id: 'barber-2', name: 'حلاق آخر', city: 'الجزائر', neighborhood: null },
    ]);

    const { result } = await renderHook(() => useShops('owner-1'));

    await act(async () => {
      await expect(result.current.searchBarbers('حلاق')).resolves.toEqual([
        { id: 'barber-2', name: 'حلاق آخر', city: 'الجزائر', neighborhood: null },
      ]);
    });
  });

  it('reports an error instead of silently ignoring an invite without an owned shop', async () => {
    mockLoadBarberShopState.mockReset();
    mockLoadBarberShopState.mockResolvedValue({
      ownedShop: null,
      membership: null,
      relationship: { kind: 'none' },
      pendingRequests: [],
      members: [],
    });

    const { result } = await renderHook(() => useShops('owner-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.inviteBarber('barber-1')).resolves.toBe(false);
    });

    expect(result.current.error).toBe('failed');
  });

  it('reloads shop state before inviting when the initial state was empty', async () => {
    const emptyState = {
      ownedShop: null,
      membership: null,
      relationship: { kind: 'none' as const },
      pendingRequests: [],
      members: [],
    };
    const ownedState = {
      ...emptyState,
      ownedShop: { id: 'shop-1', name: 'محل النور' },
    };
    mockLoadBarberShopState.mockReset();
    mockLoadBarberShopState
      .mockResolvedValueOnce(emptyState)
      .mockResolvedValueOnce(ownedState)
      .mockResolvedValue(ownedState);

    const { result } = await renderHook(() => useShops('owner-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.inviteBarber('barber-1')).resolves.toBe(true);
    });

    expect(mockInviteBarberToShop).toHaveBeenCalledWith('shop-1', 'barber-1');
  });

  it('ignores a late shop-state response after unmount', async () => {
    let resolveLoad!: (value: unknown) => void;
    mockLoadBarberShopState.mockReset();
    mockLoadBarberShopState.mockImplementationOnce(() => new Promise((resolve) => {
      resolveLoad = resolve;
    }));
    const { result, unmount } = await renderHook(() => useShops('owner-1'));
    await waitFor(() => expect(resolveLoad).toBeDefined());
    unmount();
    resolveLoad({
      ownedShop: null,
      membership: null,
      relationship: { kind: 'none' },
      pendingRequests: [],
      members: [],
    });
    await Promise.resolve();
    expect(result.current.loading).toBe(true);
  });
});
