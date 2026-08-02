import { fireEvent, render } from '@testing-library/react-native';

import { ShopHub } from '@/src/features/barber-shop/ShopHub';
import type { ShopMembership, ShopSummary } from '@/src/shops';

const recentUpdate = new Date().toISOString();

const shop: ShopSummary = {
  id: 'shop-1',
  name: 'محل النور',
  bio: null,
  maps_url: null,
  city: 'الجزائر',
  neighborhood: 'حيدرة',
  average_rating: 4.5,
  rating_count: 12,
  owner_name: 'سمير',
};

const request: ShopMembership = {
  id: 'request-1',
  shop_id: 'shop-1',
  barber_id: 'barber-2',
  status: 'pending',
  barber_name: 'عمر',
};

const activeMember: ShopMembership = {
  ...request,
  id: 'member-1',
  barber_id: 'barber-3',
  barber_name: 'ياسين',
  status: 'active',
  created_at: '2026-07-20T08:00:00.000Z',
  updated_at: recentUpdate,
};

function baseShops(overrides: Record<string, unknown> = {}) {
  return {
    state: {
      ownedShop: null,
      membership: null,
      relationship: { kind: 'none' as const },
      pendingRequests: [],
      members: [],
    },
    relationship: { kind: 'none' as const },
    ownedShop: null,
    membership: null,
    pendingInvitation: null,
    pendingRequest: null,
    loading: false,
    saving: false,
    error: '',
    message: '',
    respond: jest.fn(async () => true),
    respondInvitation: jest.fn(async () => true),
    leave: jest.fn(async () => true),
    removeShop: jest.fn(async () => true),
    removeMember: jest.fn(async () => true),
    load: jest.fn(async () => undefined),
    retry: jest.fn(async () => undefined),
    ...overrides,
  } as never;
}

describe('barber Shop hub', () => {
  it('prioritizes search and create for an unaffiliated barber without a raw ID field', async () => {
    const onSearch = jest.fn();
    const onCreate = jest.fn();
    const screen = await render(
      <ShopHub shops={baseShops()} onSearch={onSearch} onCreate={onCreate} />,
    );

    expect(screen.getByText('ابدأ أو انضم إلى محل')).toBeTruthy();
    expect(screen.queryByText(/معرّف المحل/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'البحث عن محل' }));
    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء محل' }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows a pending request without a false cancel action', async () => {
    const shops = baseShops({
      membership: { ...request, shop_name: 'محل النور' },
      relationship: { kind: 'request' as const, membership: { ...request, shop_name: 'محل النور' } },
      state: {
        ownedShop: null,
        membership: { ...request, shop_name: 'محل النور' },
        relationship: { kind: 'request' as const, membership: { ...request, shop_name: 'محل النور' } },
        pendingRequests: [],
        members: [],
      },
    });
    const screen = await render(<ShopHub shops={shops} onDetails={jest.fn()} />);
    expect(screen.getAllByText('قيد الانتظار').length).toBeGreaterThan(0);
    expect(screen.queryByText('إلغاء الطلب')).toBeNull();
  });

  it('surfaces owner requests, members, and invite action', async () => {
    const onInvite = jest.fn();
    const onMember = jest.fn();
    const shops = baseShops({
      ownedShop: shop,
      relationship: { kind: 'none' as const },
      state: {
        ownedShop: shop,
        membership: null,
        relationship: { kind: 'none' as const },
        pendingRequests: [request],
        members: [request, activeMember],
      },
    });
    const screen = await render(
      <ShopHub shops={shops} onInvite={onInvite} onMember={onMember} />,
    );
    expect(screen.getByText('نظرة سريعة على المحل')).toBeTruthy();
    expect(screen.getByText('آخر تحديث اليوم')).toBeTruthy();
    expect(screen.getByText('طلبات الانضمام')).toBeTruthy();
    expect(screen.getByText('عمر')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'دعوة حلاق' }));
    await fireEvent.press(screen.getByRole('button', { name: /ياسين/ }));
    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onMember).toHaveBeenCalledWith(activeMember);
  });

  it('keeps the invite action visible when the roster is empty', async () => {
    const onInvite = jest.fn();
    const shops = baseShops({
      ownedShop: shop,
      state: {
        ownedShop: shop,
        membership: null,
        relationship: { kind: 'none' as const },
        pendingRequests: [],
        members: [],
      },
    });
    const screen = await render(<ShopHub shops={shops} onInvite={onInvite} />);

    expect(screen.getByText('لا يوجد حلاقون مرتبطون بعد')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'دعوة حلاق' }));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('does not render unaffiliated actions while the initial shop state is loading', async () => {
    const shops = baseShops({ loading: true });
    const screen = await render(<ShopHub shops={shops} onSearch={jest.fn()} onCreate={jest.fn()} />);

    expect(screen.getByText('جاري التحميل…')).toBeTruthy();
    expect(screen.queryByText('ابدأ أو انضم إلى محل')).toBeNull();
  });

  it('does not render create or search actions when the initial load fails', async () => {
    const shops = baseShops({ error: 'failed', retry: jest.fn(async () => undefined) });
    const screen = await render(<ShopHub shops={shops} onSearch={jest.fn()} onCreate={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy();
    expect(screen.queryByText('ابدأ أو انضم إلى محل')).toBeNull();
  });
});
