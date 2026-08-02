import { fireEvent, render } from '@testing-library/react-native';

import { ShopActivityList } from '@/src/features/barber-shop/ShopActivityList';
import { ShopMemberList } from '@/src/features/barber-shop/ShopMemberList';
import { ShopSearchResult } from '@/src/features/barber-shop/ShopSearchResult';
import { ShopStateCard } from '@/src/features/barber-shop/ShopStateCard';
import type { ShopMembership, ShopSummary } from '@/src/shops';

const recentUpdate = new Date().toISOString();

const shop: ShopSummary = {
  id: 'shop-1',
  name: 'محل النور',
  bio: 'حلاقة رجالية',
  maps_url: null,
  city: 'الجزائر',
  neighborhood: 'حيدرة',
  average_rating: 4.5,
  rating_count: 12,
  owner_name: 'سمير',
};

const member: ShopMembership = {
  id: 'membership-1',
  shop_id: 'shop-1',
  barber_id: 'barber-1',
  status: 'active',
  barber_name: 'عمر',
  barber_phone: '0555000000',
  created_at: '2026-07-20T08:00:00.000Z',
  updated_at: recentUpdate,
};

describe('barber Shop shared components', () => {
  it('renders an unaffiliated state with one primary and one secondary action', async () => {
    const primary = jest.fn();
    const secondary = jest.fn();
    const screen = await render(
      <ShopStateCard
        kind="none"
        primaryAction={{ label: 'البحث عن محل', onPress: primary }}
        secondaryAction={{ label: 'إنشاء محل', onPress: secondary }}
      />,
    );

    expect(screen.getByText('ابدأ أو انضم إلى محل')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'البحث عن محل' }));
    await fireEvent.press(screen.getByRole('button', { name: 'إنشاء محل' }));
    expect(primary).toHaveBeenCalledTimes(1);
    expect(secondary).toHaveBeenCalledTimes(1);
  });

  it('renders member names and statuses as tappable rows', async () => {
    const onMemberPress = jest.fn();
    const screen = await render(
      <ShopMemberList members={[member]} onMemberPress={onMemberPress} showMembershipActivity />,
    );
    expect(screen.getByText('عمر')).toBeTruthy();
    expect(screen.getByText('نشط')).toBeTruthy();
    expect(screen.getByText('آخر تحديث اليوم')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /عمر/ }));
    expect(onMemberPress).toHaveBeenCalledWith(member);
  });

  it('shows shop location and rating in a search result', async () => {
    const onPress = jest.fn();
    const screen = await render(<ShopSearchResult shop={shop} onPress={onPress} />);
    expect(screen.getByText('محل النور')).toBeTruthy();
    expect(screen.getByText(/حيدرة/)).toBeTruthy();
    expect(screen.getByText(/4\.5/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(shop);
  });

  it('shows actor, action, and time in activity rows', async () => {
    const screen = await render(
      <ShopActivityList
        items={[
          {
            id: 'activity-1',
            action: 'member_removed',
            actorName: 'سمير',
            affectedBarberName: 'عمر',
            createdAt: recentUpdate,
          },
        ]}
      />,
    );
    expect(screen.getByText(/سمير/)).toBeTruthy();
    expect(screen.getByText('إزالة حلاق')).toBeTruthy();
    expect(screen.getByText(/2026/)).toBeTruthy();
  });
});
